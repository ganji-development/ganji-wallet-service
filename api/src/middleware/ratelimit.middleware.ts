import { Request, Response, NextFunction } from "express";
import { logger } from "../services/logger.service.js";

// Simple in-memory rate limiter for now
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100;

const ipRequests = new Map<string, number[]>();

export const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip || "unknown";
  const now = Date.now();

  const requests = ipRequests.get(ip) || [];
  const startWindow = now - WINDOW_MS;

  // Filter requests within the window
  const validRequests = requests.filter((time) => time > startWindow);

  if (validRequests.length >= MAX_REQUESTS) {
    logger.warn("Rate limit exceeded", { ip });
    return res.status(429).json({
      success: false,
      error: "Too many requests, please try again later.",
      timestamp: new Date().toISOString(),
    });
  }

  validRequests.push(now);
  ipRequests.set(ip, validRequests);

  next();
};
