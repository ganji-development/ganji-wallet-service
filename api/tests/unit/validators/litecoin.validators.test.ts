import { describe, it, expect } from "vitest";
import { LitecoinValidators } from "../../../src/validators/litecoin.validators.js";

describe("LitecoinValidators", () => {
  describe("transferSchema", () => {
    it("should validate correct transaction request", () => {
      const validData = {
        destinationAddress: "LtcAddressThatIsLongEnoughToPassValidation123", // > 26 chars
        amount: 0.5,
      };

      expect(LitecoinValidators.transferSchema.parse(validData)).toEqual(
        validData
      );
    });
  });
});
