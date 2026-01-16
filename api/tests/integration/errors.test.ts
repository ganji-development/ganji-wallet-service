import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { application } from "../../src/index.js";
import { solanaService } from "../../src/services/solana.service.js";
import { litecoinService } from "../../src/services/litecoin.service.js";
import { config } from "../../src/config/index.js";

describe("Error Handling Integration", () => {
  const apiKey = config.auth.apiKey;

  it("should handle SolanaService failures", async () => {
    vi.spyOn(solanaService, "getBalance").mockRejectedValueOnce(
      new Error("RPC Failure")
    );

    const app = application.getApp();
    const res = await request(app)
      .get("/api/v1/solana/balance/11111111111111111111111111111111")
      .set("x-api-key", apiKey);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("RPC Failure");
  });

  it("should handle LitecoinService failures", async () => {
    vi.spyOn(litecoinService, "getBalance").mockRejectedValueOnce(
      new Error("Node Failure")
    );

    const app = application.getApp();
    const res = await request(app)
      .get("/api/v1/litecoin/balance/addr")
      .set("x-api-key", apiKey);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Node Failure");
  });

  it("should handle generic service errors in signAndSend", async () => {
    vi.spyOn(solanaService, "signAndSendTransaction").mockRejectedValueOnce(
      new Error("Signing failed")
    );

    const app = application.getApp();
    const res = await request(app)
      .post("/api/v1/solana/sign-and-send")
      .set("x-api-key", apiKey)
      .send({ toAddress: "a", amount: 1 });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Signing failed");
  });
});
