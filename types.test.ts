import { describe, it, expect } from "vitest";
import { resolveContainerTag, parseConfig } from "./types.js";
import type { SupermemoryConfig } from "./types.js";

function makeConfig(overrides: Partial<SupermemoryConfig> = {}): SupermemoryConfig {
  return parseConfig(overrides);
}

describe("resolveContainerTag", () => {
  describe("agent scope (default)", () => {
    it("returns agentId when provided", () => {
      const config = makeConfig({ containerScope: "agent" });
      const result = resolveContainerTag({ config, agentId: "main" });
      expect(result).toBe("main");
    });

    it("returns prefixed agentId when containerTag is set", () => {
      const config = makeConfig({ containerScope: "agent", containerTag: "myns" });
      const result = resolveContainerTag({ config, agentId: "main" });
      expect(result).toBe("myns:main");
    });

    it("falls back to containerTag when agentId not provided", () => {
      const config = makeConfig({ containerScope: "agent", containerTag: "myns" });
      const result = resolveContainerTag({ config });
      expect(result).toBe("myns");
    });

    it("returns undefined when no agentId and no containerTag", () => {
      const config = makeConfig({ containerScope: "agent" });
      const result = resolveContainerTag({ config });
      expect(result).toBeUndefined();
    });

    it("never returns the literal string 'agent'", () => {
      const config = makeConfig({ containerScope: "agent" });
      const result = resolveContainerTag({ config, agentId: "main" });
      expect(result).not.toBe("agent");
      expect(result).toBe("main");
    });
  });

  describe("session scope", () => {
    it("returns sessionKey when provided", () => {
      const config = makeConfig({ containerScope: "session" });
      const result = resolveContainerTag({
        config,
        agentId: "main",
        sessionKey: "agent:main:telegram:group:123",
      });
      expect(result).toBe("agent:main:telegram:group:123");
    });

    it("returns prefixed sessionKey when containerTag is set", () => {
      const config = makeConfig({ containerScope: "session", containerTag: "myns" });
      const result = resolveContainerTag({
        config,
        agentId: "main",
        sessionKey: "agent:main:telegram:group:123",
      });
      expect(result).toBe("myns:agent:main:telegram:group:123");
    });

    it("falls back to agentId when sessionKey not provided", () => {
      const config = makeConfig({ containerScope: "session" });
      const result = resolveContainerTag({ config, agentId: "main" });
      expect(result).toBe("main");
    });

    it("falls back to containerTag when neither sessionKey nor agentId", () => {
      const config = makeConfig({ containerScope: "session", containerTag: "myns" });
      const result = resolveContainerTag({ config });
      expect(result).toBe("myns");
    });

    it("never returns the literal string 'session'", () => {
      const config = makeConfig({ containerScope: "session" });
      const result = resolveContainerTag({
        config,
        agentId: "main",
        sessionKey: "agent:main:telegram:group:123",
      });
      expect(result).not.toBe("session");
    });
  });

  describe("bug regression: must not return containerScope value as tag", () => {
    it("agent scope with agentId returns agentId, not 'agent'", () => {
      const config = makeConfig({ containerScope: "agent" });
      const result = resolveContainerTag({ config, agentId: "main" });
      expect(result).toBe("main");
    });

    it("session scope with sessionKey returns sessionKey, not 'session'", () => {
      const config = makeConfig({ containerScope: "session" });
      const result = resolveContainerTag({
        config,
        sessionKey: "agent:main:telegram:group:123",
      });
      expect(result).toBe("agent:main:telegram:group:123");
    });

    it("tools with default agentId resolve correctly", () => {
      // Simulates how tools call resolveContainerTag with the default "main" agentId
      const config = makeConfig({ containerScope: "agent" });
      const result = resolveContainerTag({ config, agentId: "main" });
      expect(result).toBe("main");
    });
  });
});

describe("parseConfig", () => {
  it("applies defaults", () => {
    const config = parseConfig({});
    expect(config.mode).toBe("tandem");
    expect(config.containerScope).toBe("agent");
    expect(config.autoRecall).toBe(true);
    expect(config.threshold).toBe(0.5);
    expect(config.baseUrl).toBe("https://api.supermemory.ai");
    expect(config.apiKey).toBe("");
  });

  it("preserves explicit values", () => {
    const config = parseConfig({
      apiKey: "test-key",
      mode: "primary",
      containerScope: "session",
      containerTag: "myns",
      autoRecall: false,
      threshold: 0.8,
      baseUrl: "https://custom.api.com",
    });
    expect(config.apiKey).toBe("test-key");
    expect(config.mode).toBe("primary");
    expect(config.containerScope).toBe("session");
    expect(config.containerTag).toBe("myns");
    expect(config.autoRecall).toBe(false);
    expect(config.threshold).toBe(0.8);
    expect(config.baseUrl).toBe("https://custom.api.com");
  });
});
