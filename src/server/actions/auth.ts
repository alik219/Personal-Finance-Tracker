"use server";

import { redirect } from "next/navigation";

import { LOGIN_PATH, safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import { fieldErrorsOf, type FormState } from "@/lib/validation/form";

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    displayName: text(formData, "displayName"),
    email: text(formData, "email"),
  };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(formData, "password"),
    timezone: text(formData, "timezone") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
        timezone: parsed.data.timezone,
      },
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { fieldErrors: { password: [error.message] }, values };
    }
    return { error: "Couldn't create your account. Please try again.", values };
  }

  // Same message whether or not the email was already registered, so the
  // form can't be used to discover who has an account.
  return {
    success: `We sent a confirmation link to ${parsed.data.email}. Open it to finish signing up.`,
  };
}

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { email: text(formData, "email") };
  const parsed = signInSchema.safeParse({
    ...values,
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        error:
          "Please confirm your email first. Check your inbox for the link.",
        values,
      };
    }
    return { error: "Incorrect email or password.", values };
  }

  redirect(safeNextPath(text(formData, "next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { email: text(formData, "email") };
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  const supabase = await createClient();
  // Errors are deliberately not shown: the reply must be the same whether or
  // not an account exists for this email.
  await supabase.auth.resetPasswordForEmail(parsed.data.email);

  return {
    success: `If an account exists for ${parsed.data.email}, we sent a link to reset the password.`,
  };
}

export async function updatePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "same_password") {
      return {
        fieldErrors: { password: ["Choose a password you haven't used here."] },
      };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: [error.message] } };
    }
    return {
      error:
        "Couldn't update your password. Request a new reset link and try again.",
    };
  }

  redirect("/dashboard?notice=password_updated");
}
