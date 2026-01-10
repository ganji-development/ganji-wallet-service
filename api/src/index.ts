import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/index.js";
import { logger } from "./services/logger.service.js";
import { solanaService } from "./services/solana.service.js";
import { litecoinService } from "./services/litecoin.service.js";
import { RouteRegistry } from "./routes/index.js";
import { rateLimitMiddleware } from "./middleware/ratelimit.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { Server } from "http";

export class Application {
  private app: Express;
  private server: Server | undefined;

  constructor() {
    this.app = express();
    this.initialize();
  }

  public initialize(): void {
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Global Rate Limiting
    this.app.use(rateLimitMiddleware);

    // Auth Middleware could be applied globally or per route.
    // Usually per route or specific paths. Keeping it available for routes.
  }

  private setupRoutes(): void {
    const routeRegistry = new RouteRegistry(this.app, {
      solana: solanaService,
      litecoin: litecoinService,
    });
    routeRegistry.registerRoutes();
  }

  private setupErrorHandling(): void {
    this.app.use(errorMiddleware);
  }

  public async start(): Promise<void> {
    try {
      const port = config.server.port;

      this.server = this.app.listen(port, () => {
        logger.info(`Server started on port ${port}`);
        logger.info(`Environment: ${config.server.nodeEnv}`);
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to start application", { error: errorMessage });
      process.exit(1);
    }
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
    }
  }

  public async shutdown(): Promise<void> {
    // Graceful shutdown logic would go here
    logger.info("Shutting down application...");
    process.exit(0);
  }
  public getApp(): Express {
    return this.app;
  }
}

// Start the application
export const application = new Application();

if (config.server.nodeEnv !== "test") {
  application.start().catch((err) => {
    logger.error("Unhandled error starting application", err);
    process.exit(1);
  });
}
