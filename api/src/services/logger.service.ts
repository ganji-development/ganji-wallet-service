import pino from "pino";
import { config } from "../config/index.js";

export class LoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: config.logger.level,
      transport:
        config.server.nodeEnv === "development"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
              },
            }
          : undefined,
    });
  }

  public info(message: string, meta?: object): void {
    this.logger.info(meta, message);
  }

  public error(message: string, error?: Error | object): void {
    this.logger.error(error, message);
  }

  public warn(message: string, meta?: object): void {
    this.logger.warn(meta, message);
  }

  public debug(message: string, meta?: object): void {
    this.logger.debug(meta, message);
  }
}

export const logger = new LoggerService();
