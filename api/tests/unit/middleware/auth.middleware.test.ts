import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../../src/middleware/auth.middleware.js";

vi.mock("../../../src/config/index.js", () => ({
  config: {
    auth: {
      apiKey: "valid-key",
    },
    logger: {
      level: "silent",
    },
    server: {
      nodeEnv: "test",
    },
  },
}));

describe("AuthMiddleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: "127.0.0.1",
      path: "/test",
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  it("should call next if API key is valid", () => {
    if (mockReq.headers) mockReq.headers["x-api-key"] = "valid-key";
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it("should return 401 if API key is missing", () => {
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Unauthorized: Invalid or missing API key",
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 401 if API key is invalid", () => {
    if (mockReq.headers) mockReq.headers["x-api-key"] = "invalid-key";
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
