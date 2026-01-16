import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoggerService } from "../../../src/services/logger.service.js";

vi.mock("../../../src/config/index.js", () => ({
  config: {
    logger: {
      level: "info",
    },
    server: {
      nodeEnv: "test",
    },
  },
}));

describe("LoggerService", () => {
  let loggerService: LoggerService;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerService = new LoggerService();
  });

  it("should be defined", () => {
    expect(loggerService).toBeDefined();
  });

  it("should have info method", () => {
    expect(typeof loggerService.info).toBe("function");
  });

  it("should have error method", () => {
    expect(typeof loggerService.error).toBe("function");
  });

  it("should have warn method", () => {
    expect(typeof loggerService.warn).toBe("function");
  });

  it("should have debug method", () => {
    expect(typeof loggerService.debug).toBe("function");
  });

  // Note: Detailed behavior testing (like checking if pino was called)
  // might require mocking pino, which we can do when implementing.
});
