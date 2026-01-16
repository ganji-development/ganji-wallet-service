import { describe, it, expect, beforeEach, vi } from "vitest";
import { Connection } from "@solana/web3.js";
import { SolanaService } from "../../../src/services/solana.service.js";

// Mock dependencies
vi.mock("../../../src/services/logger.service.js", () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../../src/config/index.js", () => ({
  config: {
    solana: {
      rpcUrl: "http://api.devnet.solana.com",
      commitment: "confirmed",
    },
  },
}));

vi.mock("@solana/web3.js", () => {
  class ConnectionMock {
    getBalance = vi.fn().mockResolvedValue(0);
    confirmTransaction = vi.fn().mockResolvedValue({ value: { err: null } });
    getSignatureStatus = vi.fn().mockResolvedValue({ value: { slot: 0 } });
  }

  class PublicKeyMock {
    constructor(private key: string) {
      if (key === "invalid-address") throw new Error("Non-base58 character");
    }
    toBase58(): string {
      return this.key;
    }
  }

  return {
    Connection: vi.fn(function () {
      return new ConnectionMock();
    }),
    PublicKey: vi.fn(function (key: string) {
      return new PublicKeyMock(key);
    }),
    Keypair: {
      generate: vi.fn(() => ({
        publicKey: { toBase58: () => "mock-pubkey" },
        secretKey: Buffer.from("mock-secret"),
      })),
      fromSecretKey: vi.fn((secret) => ({
        publicKey: { toBase58: () => "mock-master-pubkey" },
        secretKey: secret,
      })),
    },
    Transaction: vi.fn(function () {
      return {
        add: function () {
          return this;
        },
      };
    }),
    SystemProgram: {
      transfer: vi.fn(function () {
        return {};
      }),
    },
    sendAndConfirmTransaction: vi.fn(function () {
      return Promise.resolve("mock_real_signature");
    }),
    LAMPORTS_PER_SOL: 1000000000,
  };
});

// Mock fs for master wallet loading
import fs from "fs";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe("SolanaService", () => {
  let solanaService: SolanaService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup fs mock to simulate wallet presence
    vi.mocked(fs.existsSync).mockReturnValue(true);
    // Create a valid 64-byte mock key
    const mockKey = new Array(64).fill(0);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockKey));

    solanaService = new SolanaService();
  });

  it("should initialize connection on construction", () => {
    expect(Connection).toHaveBeenCalled();
  });

  describe("getBalance", () => {
    it("should return balance for valid address", async () => {
      const mockService = solanaService as unknown as {
        connection: {
          getBalance: { mockResolvedValue: (v: number) => Promise<void> };
        };
      };
      const mockConnection = mockService.connection;

      // Update the mock return value for this specific test
      mockConnection.getBalance.mockResolvedValue(1000000000); // 1 SOL

      const balance = await solanaService.getBalance(
        "11111111111111111111111111111111"
      );
      expect(balance.balance).toBe(1);
      expect(mockConnection.getBalance).toHaveBeenCalled();
    });

    it("should handle error for invalid address", async () => {
      await expect(
        solanaService.getBalance("invalid-address")
      ).rejects.toThrow();
    });
  });

  describe("createWallet", () => {
    it("should return a new keypair", async () => {
      const wallet = await solanaService.createWallet();
      expect(wallet).toHaveProperty("publicKey", "mock-pubkey");
    });
  });

  describe("transfer", () => {
    it("should return a real signature using master wallet", async () => {
      // Mock the getSignatureStatus
      const mockService = solanaService as unknown as {
        connection: {
          getSignatureStatus: ReturnType<typeof vi.fn>;
        };
        transfer: (to: string, amt: number) => Promise<unknown>;
      };
      mockService.connection.getSignatureStatus = vi.fn().mockResolvedValue({
        value: { slot: 12345 },
      });

      const response = await solanaService.transfer("toAddress", 1.0);
      expect(response).toHaveProperty("signature", "mock_real_signature");
      expect(response.slot).toBe(12345);
    });
    it("should throw error if transfer fails", async () => {
      await expect(
        solanaService.transfer("invalid-address", 1.0)
      ).rejects.toThrow("Transfer failed");
    });
  });

  describe("createLicense", () => {
    it("should return mock license response", async () => {
      const response = await solanaService.createLicense("name", "sym", "uri");
      expect(response).toHaveProperty("mintAddress", "mock_mint");
    });
  });

  describe("verifySignature", () => {
    it("should return true", async () => {
      const result = await solanaService.verifySignature("sig", "addr");
      expect(result).toBe(true);
    });
  });

  describe("signAndSendTransaction", () => {
    it("should call transfer and return signature", async () => {
      // Mock the getSignatureStatus
      const mockService = solanaService as unknown as {
        connection: {
          getSignatureStatus: ReturnType<typeof vi.fn>;
        };
      };
      mockService.connection.getSignatureStatus = vi.fn().mockResolvedValue({
        value: { slot: 12345 },
      });
      const response = await solanaService.signAndSendTransaction(
        "toAddress",
        1.0
      );
      expect(response).toHaveProperty("signature", "mock_real_signature");
    });
  });

  describe("when master wallet is not loaded", () => {
    it("should throw error for operations requiring master wallet", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const serviceWithoutWallet = new SolanaService();

      await expect(serviceWithoutWallet.transfer("to", 1)).rejects.toThrow(
        "Master wallet not loaded"
      );
      await expect(
        serviceWithoutWallet.createLicense("n", "s", "u")
      ).rejects.toThrow("Master wallet not loaded");
      await expect(
        serviceWithoutWallet.signAndSendTransaction("to", 1)
      ).rejects.toThrow("Master wallet not loaded");
    });
  });
});
