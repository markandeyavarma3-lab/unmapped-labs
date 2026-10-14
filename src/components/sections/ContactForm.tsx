"use client";

import { useEffect, useId, useRef, useState } from "react";
import { contact } from "@/content/site-content";
import { site } from "@/config/site";
import { CONTACT_FIELDS as FIELDS, HONEYPOT_FIELD, STARTED_FIELD, validateContact, type ContactErrors, type ContactField } from "@/lib/contact-schema";
import { BtnLabel } from "@/components/ui/BtnLabel";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

const SERVER_MESSAGES: Record<string, string> = {
  not_configured: `The contact form isn't connected yet, so nothing was sent. Please email ${site.email} directly.`,
  rate_limited: "That's a lot of messages in a short time. Please wait a few minutes and try again.",
  send_failed: `We couldn't deliver your message just now — nothing was sent. Please try again, or email ${site.email}.`,
  invalid: "Some details need another look before this can be sent.",
};

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const startedAt = useRef(0);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const uid = useId();
  const fid = (f: string) => `${uid}-${f}`;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const read = () => {
    const fd = new FormData(formRef.current!);
    return Object.fromEntries(FIELDS.map((f) => [f, String(fd.get(f) ?? "")])) as Record<ContactField, string>;
  };

  const validateField = (field: ContactField) => {
    if (!formRef.current) return;
    const result = validateContact(read());
    setErrors((e) => ({ ...e, [field]: result.ok ? undefined : result.errors[field] }));
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.kind === "sending") return;

    const values = read();
    const parsed = validateContact(values);
    if (!parsed.ok) {
      const next = parsed.errors;
      setErrors(next);
      setStatus({ kind: "error", message: SERVER_MESSAGES.invalid });
      const first = FIELDS.find((f) => next[f]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setErrors({});
    setStatus({ kind: "sending" });
    const fd = new FormData(formRef.current!);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          [HONEYPOT_FIELD]: String(fd.get(HONEYPOT_FIELD) ?? ""),
          [STARTED_FIELD]: startedAt.current,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string> };
      if (res.ok && data.ok) {
        setStatus({ kind: "sent" });
        formRef.current?.reset();
        return;
      }
      if (data.fields) setErrors(data.fields as ContactErrors);
      setStatus({ kind: "error", message: SERVER_MESSAGES[data.error ?? ""] ?? SERVER_MESSAGES.send_failed });
    } catch {
      setStatus({
        kind: "error",
        message: `Your connection seems to have dropped — nothing was sent. Please try again, or email ${site.email}.`,
      });
    }
  }

  const input =
    "w-full border-b border-[color:var(--color-line)] bg-transparent py-3 text-[1.0625rem] text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-3)] transition-colors duration-[var(--duration-hover)] hover:border-[color:var(--color-fg-3)] focus:border-[color:var(--color-cyan)] focus:outline-none aria-[invalid=true]:border-[#ff8a7a]";

  // A render helper, not a component: a component declared here would remount
  // its inputs on every render and wipe what the visitor typed.
  const field = (name: ContactField, label: string, children: React.ReactNode, optional = false) => (
    <div className="field flex flex-col">
      <label htmlFor={fid(name)} className="label flex justify-between text-[color:var(--color-fg-2)]">
        <span>{label}</span>
        {optional && <span className="text-[color:var(--color-fg-3)]">Optional</span>}
      </label>
      {children}
      <p id={`${fid(name)}-err`} className="mt-2 min-h-[1.25rem] text-[13px] text-[#ff9c8f]" role={errors[name] ? "alert" : undefined}>
        {errors[name] ?? ""}
      </p>
    </div>
  );

  const aria = (name: ContactField) => ({
    id: fid(name),
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${fid(name)}-err` : undefined,
  });

  return (
    <div className="relative">
      {status.kind === "sent" ? (
          <div
            key="sent"
            className="animate-[swap-in_0.5s_var(--ease-out-expo)_both] flex min-h-[28rem] flex-col justify-center gap-5 border border-[color:var(--color-line)] bg-[color:var(--color-ink-2)]/80 p-8 backdrop-blur-md lg:p-12"
            role="status"
          >
            <span aria-hidden className="block h-3 w-3 rotate-45 bg-[color:var(--color-lime)]" />
            <h3 className="text-[length:var(--text-h3)] font-medium tracking-[-0.02em]">Message received.</h3>
            <p className="max-w-[28rem] leading-relaxed text-[color:var(--color-fg-2)]">
              Thank you — it was delivered to our inbox. We read everything, and will reply to the address you gave.
            </p>
            <button type="button" onClick={() => setStatus({ kind: "idle" })} className="link-underline label self-start pb-0.5 text-[color:var(--color-fg)]">
              Send another message
            </button>
          </div>
        ) : (
          <form
            key="form"
            ref={formRef}
            noValidate
            onSubmit={onSubmit}
            onBlur={(e) => {
              const name = (e.target as unknown as { name?: string }).name as ContactField;
              if (FIELDS.includes(name)) validateField(name);
            }}
            className="grid gap-x-8 gap-y-4 border border-[color:var(--color-line)] bg-[color:var(--color-ink-2)]/80 p-6 backdrop-blur-md sm:grid-cols-2 sm:p-8 lg:p-10"
            aria-describedby={`${uid}-status`}
          >
            {field("name", "Name", <input {...aria("name")} type="text" autoComplete="name" required className={input} />)}
            {field("organisation", "Organisation", <input {...aria("organisation")} type="text" autoComplete="organization" className={input} />, true)}
            {field("email", "Email", <input {...aria("email")} type="email" autoComplete="email" inputMode="email" required className={input} />)}
            {field("area", "Area of interest", <select {...aria("area")} required defaultValue="" className={`${input} cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a0aab5' stroke-width='1.5'/%3E%3C/svg%3E")] bg-[length:12px_8px] bg-[position:right_4px_center] bg-no-repeat pr-8`}>
                <option value="" disabled>
                  Choose one
                </option>
                {contact.areas.map((a) => (
                  <option key={a} value={a} className="bg-[color:var(--color-ink-2)]">
                    {a}
                  </option>
                ))}
              </select>)}
            <div className="sm:col-span-2">
              {field("message", "What's worth exploring?", <textarea {...aria("message")} rows={5} required className={`${input} resize-y`} placeholder="The problem, the industry, or the question you can't stop thinking about." />)}
            </div>

            {/* Honeypot — invisible to people, irresistible to bots. */}
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor={fid(HONEYPOT_FIELD)}>Leave this empty</label>
              <input id={fid(HONEYPOT_FIELD)} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="flex flex-col-reverse items-start gap-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p id={`${uid}-status`} aria-live="polite" className={`max-w-[26rem] text-sm leading-relaxed ${status.kind === "error" ? "text-[#ff9c8f]" : "text-[color:var(--color-fg-3)]"}`}>
                {status.kind === "error"
                  ? status.message
                  : status.kind === "sending"
                    ? "Sending…"
                    : "We only use these details to reply to you."}
              </p>
              <button type="submit" className="btn btn-primary shrink-0" disabled={status.kind === "sending"} aria-busy={status.kind === "sending"}>
                {status.kind === "sending" ? (
                  <>
                    <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-r-transparent" />
                    Sending
                  </>
                ) : (
                  <>
                    <BtnLabel>Send message</BtnLabel>
                    <span aria-hidden className="btn-arrow">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
    </div>
  );
}
