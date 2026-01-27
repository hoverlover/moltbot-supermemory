import { describe, it, expect } from "vitest";
import { sanitizeQuery, needsSanitization } from "./sanitize-query.js";

describe("sanitizeQuery", () => {
  it("strips Telegram envelope prefix", () => {
    const input = "[Telegram Chad Boyd (@cboyd76) id:7820917448 +2m 2026-01-27 04:03 UTC] hello";
    expect(sanitizeQuery(input)).toBe("hello");
  });

  it("strips Discord envelope prefix", () => {
    const input = "[Discord username#1234 id:123456789 2026-01-27 04:03 UTC] search for preferences";
    expect(sanitizeQuery(input)).toBe("search for preferences");
  });

  it("strips WhatsApp envelope prefix", () => {
    const input = "[WhatsApp +1234567890 2026-01-27 04:03 UTC] what did we discuss?";
    expect(sanitizeQuery(input)).toBe("what did we discuss?");
  });

  it("strips Signal envelope prefix", () => {
    const input = "[Signal +1234567890 2026-01-27 04:03 UTC] reminder about meeting";
    expect(sanitizeQuery(input)).toBe("reminder about meeting");
  });

  it("strips Slack envelope prefix", () => {
    const input = "[Slack @username id:U12345 2026-01-27 04:03 UTC] project status";
    expect(sanitizeQuery(input)).toBe("project status");
  });

  it("strips iMessage envelope prefix", () => {
    const input = "[iMessage user@email.com 2026-01-27 04:03 UTC] send a note";
    expect(sanitizeQuery(input)).toBe("send a note");
  });

  it("strips WebChat envelope prefix", () => {
    const input = "[WebChat user 2026-01-27 04:03 UTC] find old conversation";
    expect(sanitizeQuery(input)).toBe("find old conversation");
  });

  it("strips Google Chat envelope prefix", () => {
    const input = "[Google Chat user 2026-01-27 04:03 UTC] check tasks";
    expect(sanitizeQuery(input)).toBe("check tasks");
  });

  it("strips standalone timestamps", () => {
    const input = "search 2026-01-27T04:03:00Z for meetings";
    expect(sanitizeQuery(input)).toBe("search for meetings");
  });

  it("strips user ID patterns", () => {
    const input = "id: 123456 find my preferences";
    expect(sanitizeQuery(input)).toBe("find my preferences");
  });

  it("strips relative time patterns", () => {
    const input = "+2m hello there";
    expect(sanitizeQuery(input)).toBe("hello there");
  });

  it("returns empty string for null/undefined", () => {
    expect(sanitizeQuery(null as unknown as string)).toBe("");
    expect(sanitizeQuery(undefined as unknown as string)).toBe("");
    expect(sanitizeQuery("")).toBe("");
  });

  it("preserves clean queries unchanged", () => {
    expect(sanitizeQuery("find my user preferences")).toBe("find my user preferences");
  });

  it("collapses multiple whitespace", () => {
    const input = "  hello   world  ";
    expect(sanitizeQuery(input)).toBe("hello world");
  });
});

describe("needsSanitization", () => {
  it("returns true for envelope prefix", () => {
    expect(needsSanitization("[Telegram user 2026-01-27 04:03 UTC] hello")).toBe(true);
  });

  it("returns false for clean text", () => {
    expect(needsSanitization("find my preferences")).toBe(false);
  });

  it("returns false for empty/null", () => {
    expect(needsSanitization("")).toBe(false);
    expect(needsSanitization(null as unknown as string)).toBe(false);
  });
});
