import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { logger } from "../services/logger.service.js";

export const validate = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.debug("Validation failed", { error: error.issues });
        return res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.issues,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
};
