import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("parsePublicEnv", () => {
  it("returns the values when all variables are valid", () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  it("names every missing variable in the error", () => {
    expect(() => parsePublicEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("rejects a URL that is not a URL", () => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "localhost" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejects an empty key", () => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });
});
