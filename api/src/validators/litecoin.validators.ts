import { z } from "zod";

export const LitecoinValidators = {
  transferSchema: z.object({
    destinationAddress: z.string().min(26).max(90), // LTC stats, can be bech32 etc
    amount: z.number().positive(),
  }),

  registerAssetSchema: z.object({
    data: z.string().min(1).max(80), // OP_RETURN limit size usually 80 bytes
  }),
};
