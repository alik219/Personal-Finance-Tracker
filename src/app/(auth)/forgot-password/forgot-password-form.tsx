"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/auth/form-field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FormState } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    {} as FormState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Forgot your password?</h1>
        </CardTitle>
        <CardDescription>
          We&apos;ll email you a link to choose a new one.
        </CardDescription>
      </CardHeader>
      {state.success ? (
        <CardContent>
          <FormMessage success={state.success} />
        </CardContent>
      ) : (
        <form action={formAction}>
          <CardContent className="grid gap-4">
            <FormMessage error={state.error} />
            <FormField
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state.values?.email}
              errors={state.fieldErrors?.email}
            />
          </CardContent>
          <CardFooter className="mt-4">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </CardFooter>
        </form>
      )}
      <CardFooter className="mt-2">
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      </CardFooter>
    </Card>
  );
}
