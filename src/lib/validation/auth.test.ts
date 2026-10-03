import { describe, expect, it } from "vitest";

import { resetPasswordSchema, signInSchema, signUpSchema } from "./auth";
import { fieldErrorsOf } from "./form";

const validSignUp = {
  displayName: "  Alice  ",
  email: " Alice@Example.COM ",
  password: "secret123",
  timezone: "Asia/Karachi",
};

describe("signUpSchema", () => {
  it("trims the name and normalizes the email", () => {
    expect(signUpSchema.parse(validSignUp)).toEqual({
      displayName: "Alice",
      email: "alice@example.com",
      password: "secret123",
      timezone: "Asia/Karachi",
    });
  });

  it.each([
    ["short1", "Use at least 8 characters."],
    ["12345678", "Include at least one letter."],
    ["abcdefgh", "Include at least one number."],
  ])("rejects password %s", (password, message) => {
    const result = signUpSchema.safeParse({ ...validSignUp, password });
    expect(result.success).toBe(false);
    expect(fieldErrorsOf(result.error!)?.password).toContain(message);
  });

  it("requires a name and a valid email", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      displayName: "   ",
      email: "not-an-email",
    });
    const errors = fieldErrorsOf(result.error!);
    expect(errors?.displayName).toEqual(["Enter your name."]);
    expect(errors?.email).toEqual(["Enter a valid email address."]);
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "x" }).success,
    ).toBe(true);
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "newpass123",
      confirmPassword: "newpass124",
    });
    expect(fieldErrorsOf(result.error!)?.confirmPassword).toEqual([
      "Passwords don't match.",
    ]);
  });

  it("enforces the password rules", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "newpass123",
        confirmPassword: "newpass123",
      }).success,
    ).toBe(true);
  });
});
