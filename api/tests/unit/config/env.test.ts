import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Environment Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      // Provide valid defaults for all required fields to prevent crash
      NODE_ENV: "test",
      PORT: "3000",
      LOG_LEVEL: "info",
      SOLANA_RPC_URL: "https://api.devnet.solana.com",
      LITECOIN_RPC_URL: "http://localhost:9332",
      LITECOIN_RPC_USER: "user",
      LITECOIN_RPC_PASS: "pass",
      AUTH_API_KEY: "test-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should validate correct environment variables", async () => {
    const { validateEnv } = await import("../../../src/config/env.js");
    const config = validateEnv();
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe("test");
  });

  it("should throw error for missing required variables", async () => {
    const { validateEnv } = await import("../../../src/config/env.js");
    delete process.env.SOLANA_RPC_URL;
    expect(() => validateEnv()).toThrow();
  });

  it("should use default values where applicable", async () => {
    const { validateEnv } = await import("../../../src/config/env.js");
    delete process.env.PORT; // Should default to 3000
    const config = validateEnv();
    expect(config.PORT).toBe(3000);
  });
});
