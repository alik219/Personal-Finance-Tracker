import { z } from "zod";

/** Shape returned by server actions to the forms that call them. */
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
