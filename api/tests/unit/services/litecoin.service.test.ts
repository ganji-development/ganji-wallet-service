import { describe, it, expect, vi, beforeEach } from "vitest";
import { LitecoinService } from "../../../src/services/litecoin.service.js";

vi.mock("../../../src/config/index.js", () => ({
  config: {
    litecoin: {
      rpc: {
        url: "http://localhost:9332",
        username: "user",
        password: "password",
      },
      network: "testnet",
    },
  },
}));

vi.mock("../../../src/services/logger.service.js", () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("LitecoinService", () => {
  let litecoinService: LitecoinService;

  beforeEach(async () => {
    // Re-import to clean state if needed or just instantiate
    // Since it's a singleton export, we might need to access the class or use the exported instance
    // But the export is 'litecoinService', an instance.
    // For unit testing singletons, we can just use the instance.
    const module = await import("../../../src/services/litecoin.service.js");
    litecoinService = module.litecoinService;
  });

  it("should be defined", () => {
    expect(litecoinService).toBeDefined();
  });

  it("should register an asset", async () => {
    const asset = await litecoinService.registerAsset("some-data");
    expect(asset).toHaveProperty("txId", "mock_op_return_tx");
  });

  it("should verify a transaction", async () => {
    const valid = await litecoinService.verifyTransaction("txid", "address");
    expect(valid).toBe(true);
  });

  it("should get network info", async () => {
    const info = await litecoinService.getNetworkInfo();
    expect(info).toHaveProperty("connections", 8);
  });

  describe("getBalance", () => {
    it("should return balance", async () => {
      const balance = await litecoinService.getBalance("addr");
      expect(balance).toHaveProperty("address", "addr");
      expect(balance).toHaveProperty("balance", 0);
    });
  });

  describe("createWallet", () => {
    it("should return new wallet info", async () => {
      const wallet = await litecoinService.createWallet();
      expect(wallet).toHaveProperty("address", "mock_ltc_address");
      expect(wallet).toHaveProperty("privateKey", "mock_ltc_key");
    });
  });
});
