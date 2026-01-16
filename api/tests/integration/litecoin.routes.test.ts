import { describe, it, expect } from "vitest";
import request from "supertest";
import { application } from "../../src/index.js";

import { config } from "../../src/config/index.js";

describe("Litecoin Routes", () => {
  const apiKey = config.auth.apiKey;

  it("GET /api/v1/litecoin/balance/:address should return balance", async () => {
    const app = application.getApp();
    const res = await request(app)
      .get("/api/v1/litecoin/balance/some-address")
      .set("x-api-key", apiKey);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("balance");
  });

  it("POST /api/v1/litecoin/send should initiate transfer", async () => {
    const app = application.getApp();
    const res = await request(app)
      .post("/api/v1/litecoin/send")
      .set("x-api-key", apiKey)
      .send({
        destinationAddress: "LtcAddressThatIsLongEnoughToPassValidation123",
        amount: 0.1,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("txId");
  });

  it("POST /api/v1/litecoin/verify should verify transaction", async () => {
    const app = application.getApp();
    const res = await request(app)
      .post("/api/v1/litecoin/verify")
      .set("x-api-key", apiKey)
      .send({
        txId: "mock-tx-id",
        address: "address",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("valid");
  });

  it("GET /api/v1/litecoin/network should return network info", async () => {
    const app = application.getApp();
    const res = await request(app)
      .get("/api/v1/litecoin/network")
      .set("x-api-key", apiKey);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("network");
  });
});
