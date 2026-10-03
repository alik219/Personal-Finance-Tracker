"use client";

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
import type { FormState } from "@/lib/validation/form";
import { updatePassword } from "@/server/actions/auth";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    {} as FormState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Choose a new password</h1>
        </CardTitle>
        <CardDescription>
          At least 8 characters, with at least one letter and one number.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
          <FormMessage error={state.error} />
          <FormField
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            errors={state.fieldErrors?.password}
          />
          <FormField
            name="confirmPassword"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            errors={state.fieldErrors?.confirmPassword}
          />
        </CardContent>
        <CardFooter className="mt-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save new password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
