import { describe, it, expect } from "vitest";
import request from "supertest";
import { application } from "../../src/index.js";

describe("Health Routes", () => {
  it("GET /health should return 200 OK", async () => {
    // Access the express app from the application instance
    const app = application.getApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });
});
