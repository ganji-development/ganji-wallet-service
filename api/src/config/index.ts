import { env } from "./env.js";
import { solanaConfig } from "./solana.config.js";
import { litecoinConfig } from "./litecoin.config.js";

export const config = {
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  },
  logger: {
    level: env.LOG_LEVEL,
  },
  solana: solanaConfig,
  litecoin: litecoinConfig,
  auth: {
    apiKey: env.AUTH_API_KEY,
  },
};
