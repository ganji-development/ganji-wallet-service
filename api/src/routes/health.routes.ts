import { Router, Request, Response } from "express";
import { HealthResponse } from "../types/api.types.js";

export class HealthRoutes {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get("/", this.healthCheck.bind(this));
  }

  public getRouter(): Router {
    return this.router;
  }

  private healthCheck(req: Request, res: Response): void {
    const response: HealthResponse = {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    };

    res.status(200).json(response);
  }
}
