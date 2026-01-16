import { z } from "zod";

export const SolanaValidators = {
  transferSchema: z.object({
    toAddress: z.string().min(32).max(44), // Base58 address length
    amount: z.number().positive(),
    useTestnet: z.boolean().optional().default(false),
  }),

  createLicenseSchema: z.object({
    recipientAddress: z.string().min(32).max(44), // Base58 address
    name: z.string().min(1).max(32).optional().default("License"),
    uri: z.string().optional().default(""),
    useTestnet: z.boolean().optional().default(false),
  }),

  revokeLicenseSchema: z.object({
    mintAddress: z.string().min(32).max(44),
    useTestnet: z.boolean().optional().default(false),
  }),
};
