"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

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
import { signUp } from "@/server/actions/auth";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, {} as FormState);
  const timezoneRef = useRef<HTMLInputElement>(null);

  // Set after hydration so server and client render the same markup.
  useEffect(() => {
    if (timezoneRef.current) {
      timezoneRef.current.value =
        Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }, []);

  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Check your email</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormMessage success={state.success} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Create your account</h1>
        </CardTitle>
        <CardDescription>
          Track your accounts, budgets and goals in one place.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
          <FormMessage error={state.error} />
          <input
            ref={timezoneRef}
            type="hidden"
            name="timezone"
            defaultValue=""
          />
          <FormField
            name="displayName"
            label="Name"
            autoComplete="name"
            required
            defaultValue={state.values?.displayName}
            errors={state.fieldErrors?.displayName}
          />
          <FormField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            errors={state.fieldErrors?.email}
          />
          <FormField
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            errors={state.fieldErrors?.password}
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters, with at least one letter and one number.
          </p>
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
