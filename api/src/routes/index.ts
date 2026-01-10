import { Express } from "express";
import { HealthRoutes } from "./health.routes.js";
import { SolanaRoutes } from "./solana.routes.js";
import { LitecoinRoutes } from "./litecoin.routes.js";
import { SolanaService } from "../services/solana.service.js";
import { LitecoinService } from "../services/litecoin.service.js";
import { logger } from "../services/logger.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

export class RouteRegistry {
  private app: Express;
  private healthRoutes: HealthRoutes;
  private solanaRoutes: SolanaRoutes;
  private litecoinRoutes: LitecoinRoutes;

  constructor(
    app: Express,
    services: { solana: SolanaService; litecoin: LitecoinService }
  ) {
    this.app = app;
    this.healthRoutes = new HealthRoutes();
    this.solanaRoutes = new SolanaRoutes(services.solana);
    this.litecoinRoutes = new LitecoinRoutes(services.litecoin);
  }

  public registerRoutes(): void {
    logger.info("Registering routes...");
    this.registerHealthRoutes();
    this.registerApiRoutes();
    logger.info("Routes registered successfully");
  }

  private registerHealthRoutes(): void {
    this.app.use("/health", this.healthRoutes.getRouter());
  }

  private registerApiRoutes(): void {
    this.app.use(
      "/api/v1/solana",
      authMiddleware,
      this.solanaRoutes.getRouter()
    );
    this.app.use(
      "/api/v1/litecoin",
      authMiddleware,
      this.litecoinRoutes.getRouter()
    );
  }
}
