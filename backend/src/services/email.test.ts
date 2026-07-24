import { describe, it, expect } from "vitest";
import { shouldSendEmail } from "./email.service";

// README §2.5 — email idempotency: a 'sent' pair is never re-sent; anything else is.
describe("shouldSendEmail", () => {
  it("skips a pair already marked sent", () => {
    expect(shouldSendEmail("sent")).toBe(false);
  });

  it("re-sends a previously failed pair (retry sends only those)", () => {
    expect(shouldSendEmail("failed")).toBe(true);
  });

  it("sends when there is no prior record", () => {
    expect(shouldSendEmail(undefined)).toBe(true);
    expect(shouldSendEmail(null)).toBe(true);
  });

  it("sends for any non-sent status", () => {
    expect(shouldSendEmail("queued")).toBe(true);
  });
});
