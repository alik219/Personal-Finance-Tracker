import { z } from "zod";

// Mirrors supabase/config.toml: minimum_password_length = 8,
// password_requirements = "letters_digits". Cloud settings must match.
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

// Normalize first: z.email() would reject surrounding spaces before trimming.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(80, "Use at most 80 characters."),
  email,
  password,
  // Filled in by the browser; the database falls back to UTC if invalid.
  timezone: z.string().max(64).optional(),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

/** Shape returned by auth server actions to their forms. */
export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  /** Echoed back so fields keep their values after a failed submit. */
  values?: Record<string, string>;
};

export function fieldErrorsOf(error: z.ZodError): FormState["fieldErrors"] {
  return z.flattenError(error).fieldErrors as FormState["fieldErrors"];
}
