import { z } from "zod";

export const SolanaValidators = {
  transferSchema: z.object({
    toAddress: z.string().min(32).max(44), // Base58 address length
    amount: z.number().positive(),
  }),

  createLicenseSchema: z.object({
    name: z.string().min(1).max(32),
    symbol: z.string().min(1).max(10),
    uri: z.string().pipe(z.url()),
  }),

  revokeLicenseSchema: z.object({
    mintAddress: z.string().min(32).max(44),
  }),
};
