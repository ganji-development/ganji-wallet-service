import { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";
import { logger } from "../services/logger.service.js";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== config.auth.apiKey) {
    logger.warn("Unauthorized access attempt", {
      ip: req.ip,
      path: req.path,
      headers: req.headers,
    });
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or missing API key",
      timestamp: new Date().toISOString(),
    });
  }

  next();
};
