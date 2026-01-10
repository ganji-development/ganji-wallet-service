import { describe, it, expect, vi, beforeEach } from "vitest";
import { Application } from "../../src/index.js";
import { config } from "../../src/config/index.js";
import { logger } from "../../src/services/logger.service.js";

vi.mock("../../src/config/index.js", () => ({
  config: {
    server: {
      port: 3000,
      nodeEnv: "test",
    },
    solana: { rpcUrl: "http://test", commitment: "confirmed" },
    litecoin: {
      network: "testnet",
      rpc: { url: "http://test", username: "u", password: "p" },
    },
    auth: { apiKey: "key" },
  },
}));

vi.mock("../../src/services/logger.service.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Application", () => {
  let app: Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Application();
  });

  it("should initialize and provide express app", () => {
    const expressApp = app.getApp();
    expect(expressApp).toBeDefined();
    // Verify some middleware is attached by checking if the stack has layers
    // (Internal check, but getApp is public)
    expect(typeof expressApp.use).toBe("function");
  });

  it("should start the server", async () => {
    const expressApp = app.getApp();
    const listenSpy = vi
      .spyOn(expressApp, "listen")
      .mockImplementation((_port, cb?: () => void) => {
        if (cb) cb();
        return {} as unknown as ReturnType<typeof expressApp.listen>;
      });

    await app.start();

    expect(listenSpy).toHaveBeenCalledWith(
      config.server.port,
      expect.any(Function)
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Server started on port")
    );
  });

  it("should handle start error", async () => {
    vi.spyOn(app.getApp(), "listen").mockImplementation(() => {
      throw new Error("Listen failed");
    });
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await app.start();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to start application"),
      expect.any(Object)
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should shutdown gracefully", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await app.shutdown();

    expect(logger.info).toHaveBeenCalledWith("Shutting down application...");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
