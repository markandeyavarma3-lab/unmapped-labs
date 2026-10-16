import { contact } from "@/content/site-content";

/**
 * Contact validation shared by the form (instant feedback) and the API route
 * (the real gate). Hand-written on purpose: five fields don't justify shipping
 * a schema library to every visitor.
 */

export type ContactInput = {
  name: string;
  organisation: string;
  email: string;
  area: string;
  message: string;
};
export type ContactField = keyof ContactInput;
export type ContactErrors = Partial<Record<ContactField, string>>;

export const CONTACT_FIELDS: ContactField[] = ["name", "email", "message", "organisation", "area"];

/** Anti-spam fields that travel with the form but are not stored. */
export const HONEYPOT_FIELD = "website";
export const STARTED_FIELD = "startedAt";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContact(raw: Record<string, unknown>):
  | { ok: true; data: ContactInput }
  | { ok: false; errors: ContactErrors } {
  const str = (k: ContactField) => (typeof raw[k] === "string" ? (raw[k] as string).trim() : "");
  const data: ContactInput = {
    name: str("name"),
    organisation: str("organisation"),
    email: str("email"),
    area: str("area"),
    message: str("message"),
  };

  const errors: ContactErrors = {};
  if (data.name.length < 2) errors.name = "Please enter your name.";
  else if (data.name.length > 100) errors.name = "That name is a little long — 100 characters max.";

  if (data.organisation.length > 120) errors.organisation = "120 characters max.";

  if (!EMAIL.test(data.email) || data.email.length > 200)
    errors.email = "Please enter a valid email address, like name@example.com.";

  // optional: empty, or one of the listed areas
  if (data.area && !contact.areas.includes(data.area)) errors.area = "Please choose one of the listed areas.";

  if (data.message.length < 10) errors.message = "A few more words help — at least 10 characters.";
  else if (data.message.length > 4000) errors.message = "Please keep it under 4,000 characters.";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
