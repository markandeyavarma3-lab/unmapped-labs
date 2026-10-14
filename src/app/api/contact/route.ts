import { Resend } from "resend";
import { validateContact, HONEYPOT_FIELD, STARTED_FIELD } from "@/lib/contact-schema";
import { site } from "@/config/site";

/**
 * POST /api/contact
 *
 * Responses (JSON):
 *   200 { ok: true }                         — Resend accepted the message
 *   400 { error: "invalid", fields }         — validation failed
 *   429 { error: "rate_limited" }
 *   503 { error: "not_configured" }          — RESEND_API_KEY missing
 *   502 { error: "send_failed" }             — Resend rejected or errored
 *
 * Env: RESEND_API_KEY (required), CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
// Best-effort, per server instance. Swap for a shared store (e.g. Upstash) if abuse appears.
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  // Bots fill hidden fields and submit instantly. Treat both as invalid without detail.
  const started = Number(body[STARTED_FIELD]);
  if (body[HONEYPOT_FIELD] || !Number.isFinite(started) || Date.now() - started < 2500) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const parsed = validateContact(body);
  if (!parsed.ok) return Response.json({ error: "invalid", fields: parsed.errors }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Response.json({ error: "not_configured" }, { status: 503 });

  const { name, organisation, email, area, message } = parsed.data;
  const to = process.env.CONTACT_TO_EMAIL || site.email;
  const from = process.env.CONTACT_FROM_EMAIL || `Unmapped Labs website <noreply@${new URL(site.url).hostname}>`;

  const text = [
    `Name: ${name}`,
    organisation ? `Organisation: ${organisation}` : null,
    `Email: ${email}`,
    `Area: ${area}`,
    "",
    message,
  ]
    .filter((l) => l !== null)
    .join("\n");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: email,
      subject: `New conversation — ${area} — ${name}`,
      text,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.55;color:#0d1115">
        <p style="font:12px monospace;letter-spacing:.12em;text-transform:uppercase;color:#4a525b">Unmapped Labs · contact form</p>
        <table style="border-collapse:collapse;margin:12px 0 20px">
          <tr><td style="padding:2px 16px 2px 0;color:#4a525b">Name</td><td>${escape(name)}</td></tr>
          ${organisation ? `<tr><td style="padding:2px 16px 2px 0;color:#4a525b">Organisation</td><td>${escape(organisation)}</td></tr>` : ""}
          <tr><td style="padding:2px 16px 2px 0;color:#4a525b">Email</td><td>${escape(email)}</td></tr>
          <tr><td style="padding:2px 16px 2px 0;color:#4a525b">Area</td><td>${escape(area)}</td></tr>
        </table>
        <p style="white-space:pre-wrap">${escape(message)}</p>
      </div>`,
    });
    if (error) {
      console.error("[contact] Resend rejected the message:", error.name, error.message);
      return Response.json({ error: "send_failed" }, { status: 502 });
    }
  } catch (err) {
    console.error("[contact] Resend request failed:", err);
    return Response.json({ error: "send_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
