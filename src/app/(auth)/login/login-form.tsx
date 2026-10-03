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
import { signIn } from "@/server/actions/auth";

export function LoginForm({
  next,
  linkError,
}: {
  next?: string;
  linkError?: string;
}) {
  const [state, formAction, pending] = useActionState(signIn, {} as FormState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Log in</h1>
        </CardTitle>
        <CardDescription>
          Welcome back. Enter your email and password.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
          <FormMessage error={state.error ?? linkError} />
          <input type="hidden" name="next" value={next ?? ""} />
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
            autoComplete="current-password"
            required
            errors={state.fieldErrors?.password}
          />
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Logging in…" : "Log in"}
          </Button>
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/signup"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
