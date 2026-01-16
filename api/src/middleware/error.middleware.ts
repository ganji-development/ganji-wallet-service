import { Request, Response, NextFunction } from "express";
import { logger } from "../services/logger.service.js";
import { ErrorResponse } from "../types/api.types.js";
import { config } from "../config/index.js";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error("Unhandled Error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const response: ErrorResponse = {
    success: false,
    error:
      config.server.nodeEnv === "development" ||
      config.server.nodeEnv === "test"
        ? err.message
        : "Internal Server Error",
    timestamp: new Date().toISOString(),
  };

  res.status(500).json(response);
};
