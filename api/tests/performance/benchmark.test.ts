import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Application } from "../../src/index.js";
import { config } from "../../src/config/index.js";

// Mock config to use a different port for testing
config.server.port = 4000;

describe("Performance Benchmarks", () => {
  let app: Application;
  const apiKey = config.auth.apiKey;

  beforeAll(async () => {
    app = new Application();
    await app.start();
    // Give it a moment to bind
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(() => {
    app.stop();
  });

  it("API Response Latency < 100ms (p50)", async () => {
    const iterations = 50;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const response = await fetch("http://localhost:4000/health");
      const end = performance.now();
      await response.json(); // ensure body is read
      latencies.push(end - start);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];

    console.info(`Latency p50: ${p50.toFixed(2)}ms`);
    console.info(`Latency p95: ${p95.toFixed(2)}ms`);

    expect(p50).toBeLessThan(100);
    expect(p95).toBeLessThan(500);
  });

  it("Authenticated Route Latency < 200ms (p50)", async () => {
    const iterations = 20;
    const latencies: number[] = [];

    // Warm up
    await fetch(
      "http://localhost:4000/api/v1/solana/balance/11111111111111111111111111111111",
      {
        headers: { "x-api-key": apiKey || "" },
      }
    );

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const response = await fetch(
        "http://localhost:4000/api/v1/solana/balance/11111111111111111111111111111111",
        {
          headers: { "x-api-key": apiKey || "" },
        }
      );
      const end = performance.now();
      await response.json();
      latencies.push(end - start);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];

    console.info(`Auth Latency p50: ${p50.toFixed(2)}ms`);
    expect(p50).toBeLessThan(200);
  });
});
