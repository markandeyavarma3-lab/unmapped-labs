import { z } from "zod";
import { contact } from "@/content/site-content";

/** Shared by the form (instant feedback) and the API route (the real gate). */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100, "That name is a little long — 100 characters max."),
  organisation: z.string().trim().max(120, "120 characters max.").optional().or(z.literal("")),
  email: z.string().trim().max(200).email("Please enter a valid email address, like name@example.com."),
  area: z.enum(contact.areas as [string, ...string[]], { message: "Please choose the area closest to your idea." }),
  message: z
    .string()
    .trim()
    .min(20, "A little more detail helps — at least 20 characters.")
    .max(4000, "Please keep it under 4,000 characters."),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactInput;

/** Anti-spam fields that travel with the form but are not stored. */
export const HONEYPOT_FIELD = "website";
export const STARTED_FIELD = "startedAt";
