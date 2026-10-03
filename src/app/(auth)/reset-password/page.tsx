import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/session";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached from the recovery email: /auth/confirm signs the user in first.
export default async function ResetPasswordPage() {
  await requireUser();
  return <ResetPasswordForm />;
}
