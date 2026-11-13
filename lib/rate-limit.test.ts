import { describe, expect, it } from "vitest";
import { limitePesature, redisSeConfigurato, secondiAllaMezzanotte } from "./rate-limit";

describe("rate limit", () => {
  it("concede 3 pesature senza email e 15 dopo il gate", () => {
    expect(limitePesature(false)).toBe(3);
    expect(limitePesature(true)).toBe(15);
  });

  it("calcola i secondi che mancano a mezzanotte di Roma", () => {
    const quasiMezzanotte = new Date("2026-11-13T22:59:30.000Z");
    expect(secondiAllaMezzanotte(quasiMezzanotte)).toBe(30);
    expect(secondiAllaMezzanotte(new Date("2026-11-13T22:00:00.000Z"))).toBe(3600);
  });

  it("resta disattivato se mancano le variabili Upstash", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    expect(redisSeConfigurato()).toBeNull();
  });
});
