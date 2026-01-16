import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { errorMiddleware } from "../../../src/middleware/error.middleware.js";

vi.mock("../../../src/services/logger.service.js", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("ErrorMiddleware", () => {
  it("should handle errors and return structured response", () => {
    const err = new Error("Test error");
    const req: Partial<Request> = {};
    const res: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next: NextFunction = vi.fn();

    errorMiddleware(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Test error",
        success: false,
      })
    );
  });
});
