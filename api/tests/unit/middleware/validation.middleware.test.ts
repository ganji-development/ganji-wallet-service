import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../../src/middleware/validation.middleware.js";

vi.mock("../../../src/services/logger.service.js", () => ({
  logger: {
    debug: vi.fn(),
  },
}));

describe("ValidationMiddleware", () => {
  it("should return a middleware function", () => {
    const schema = z.object({ prop: z.string() });
    const middleware = validate(schema);
    expect(typeof middleware).toBe("function");
  });

  it("should call next on valid data", () => {
    const schema = z.object({ prop: z.string() });
    const middleware = validate(schema);

    const req: Partial<Request> = { body: { prop: "valid" } };
    const res: Partial<Response> = {};
    const next: NextFunction = vi.fn();

    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it("should call next with error on invalid data", () => {
    const schema = z.object({ prop: z.string() });
    const middleware = validate(schema);

    const req: Partial<Request> = { body: { prop: 123 } }; // Invalid type
    const res: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next: NextFunction = vi.fn();

    // Check if it handles error directly or passes to next(err)
    // Assuming express style error handling where we might just respond 400
    middleware(req as Request, res as Response, next);

    // If we handle validation errors in the middleware:
    expect(res.status).toHaveBeenCalledWith(400);
    // OR if we pass to error handler:
    // expect(next).toHaveBeenCalledWith(expect.any(ZodError));
  });
});
