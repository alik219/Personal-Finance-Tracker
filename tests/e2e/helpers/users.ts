import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

export const TEST_PASSWORD = "Test-pass-123";

/** A unique address per test, so parallel runs never collide. */
export function uniqueEmail(label: string): string {
  return `e2e-${label}-${randomUUID().slice(0, 8)}@example.com`;
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      "E2E helpers need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local",
    );
  }
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Creates an already-confirmed user directly, skipping the email step. */
export async function createConfirmedUser(
  label: string,
  { displayName = "Test User" }: { displayName?: string } = {},
) {
  const email = uniqueEmail(label);
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error) throw error;
  return { id: data.user.id, email, password: TEST_PASSWORD, displayName };
}
