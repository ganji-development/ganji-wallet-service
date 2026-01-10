import { describe, it, expect } from "vitest";
import request from "supertest";
import { application } from "../../src/index.js";

import { config } from "../../src/config/index.js";
import { solanaService } from "../../src/services/solana.service.js";
import { vi } from "vitest";

describe("Solana Routes", () => {
  const apiKey = config.auth.apiKey;

  it("GET /api/v1/solana/balance/:address should return balance", async () => {
    const app = application.getApp();
    const res = await request(app)
      .get("/api/v1/solana/balance/11111111111111111111111111111111")
      .set("x-api-key", apiKey);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("balance");
  });

  it("POST /api/v1/solana/transfer should initiate transfer", async () => {
    vi.spyOn(solanaService, "transfer").mockResolvedValue({
      signature: "mock_signature_signed_by_master",
      from: "mock_from",
      to: "11111111111111111111111111111111",
      amount: 0.1,
      slot: 12345,
    });

    const app = application.getApp();
    const res = await request(app)
      .post("/api/v1/solana/transfer")
      .set("x-api-key", apiKey)
      .send({
        toAddress: "11111111111111111111111111111111",
        amount: 0.1,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("signature");
  });

  it("POST /api/v1/solana/verify should verify signature", async () => {
    const app = application.getApp();
    const res = await request(app)
      .post("/api/v1/solana/verify")
      .set("x-api-key", apiKey)
      .send({
        signature: "mock-sig",
        address: "11111111111111111111111111111111",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("valid");
  });

  it("POST /api/v1/solana/sign-and-send should sign and send", async () => {
    vi.spyOn(solanaService, "signAndSendTransaction").mockResolvedValue({
      signature: "mock_signed_signature_by_master",
    });

    const app = application.getApp();
    const res = await request(app)
      .post("/api/v1/solana/sign-and-send")
      .set("x-api-key", apiKey)
      .send({
        toAddress: "11111111111111111111111111111111",
        amount: 0.1,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
