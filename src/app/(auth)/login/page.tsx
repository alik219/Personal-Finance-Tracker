import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  link_invalid:
    "That link is invalid or has expired. Please request a new one.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <LoginForm
      next={typeof next === "string" ? next : undefined}
      linkError={typeof error === "string" ? ERRORS[error] : undefined}
    />
  );
}
