import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((i) => i.path.join("."))),
    ];
    throw new Error(
      `Missing or invalid environment variables: ${names.join(", ")}. ` +
        "Copy .env.example to .env.local and fill in the values.",
    );
  }
  return result.data;
}

let cached: PublicEnv | undefined;

// NEXT_PUBLIC_* vars are inlined at build time only when referenced literally,
// so each one is spelled out here rather than passing process.env through.
export function getPublicEnv(): PublicEnv {
  cached ??= parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}
