import { describe, expect, it } from "vitest";

import { isPublicPath, isSignedOutOnlyPath, safeNextPath } from "./routes";

describe("isPublicPath", () => {
  it.each(["/", "/login", "/signup", "/forgot-password", "/health"])(
    "%s is public",
    (path) => expect(isPublicPath(path)).toBe(true),
  );

  it("treats /auth/* routes as public", () => {
    expect(isPublicPath("/auth/confirm")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
  });

  it.each([
    "/dashboard",
    "/transactions",
    "/reset-password",
    "/login/extra",
    "/authx",
  ])("%s requires a session", (path) => expect(isPublicPath(path)).toBe(false));
});

describe("isSignedOutOnlyPath", () => {
  it("covers the sign-in pages only", () => {
    expect(isSignedOutOnlyPath("/login")).toBe(true);
    expect(isSignedOutOnlyPath("/signup")).toBe(true);
    expect(isSignedOutOnlyPath("/forgot-password")).toBe(true);
    expect(isSignedOutOnlyPath("/reset-password")).toBe(false);
    expect(isSignedOutOnlyPath("/")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeNextPath("/transactions")).toBe("/transactions");
    expect(safeNextPath("/budgets?month=2026-10#food")).toBe(
      "/budgets?month=2026-10#food",
    );
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["dashboard"],
    ["https://evil.example"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["\\\\evil.example"],
    ["javascript:alert(1)"],
  ])("falls back for %s", (next) => {
    expect(safeNextPath(next)).toBe("/dashboard");
  });

  it("uses a custom fallback", () => {
    expect(safeNextPath(null, "/reset-password")).toBe("/reset-password");
  });
});
