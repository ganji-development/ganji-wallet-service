import { describe, it, expect } from "vitest";
import { z } from "zod";
import { SolanaValidators } from "../../../src/validators/solana.validators.js";

describe("SolanaValidators", () => {
  describe("transferSchema", () => {
    it("should validate correct transfer request", () => {
      const validData = {
        toAddress: "11111111111111111111111111111111", // 32 chars
        amount: 1.5,
      };
      expect(SolanaValidators.transferSchema.parse(validData)).toEqual(
        validData
      );
    });

    it("should fail on negative amount", () => {
      const invalidData = {
        toAddress: "addr",
        amount: -1,
      };
      expect(() => {
        SolanaValidators.transferSchema.parse(invalidData);
      }).toThrow(z.ZodError);
    });
  });
});
