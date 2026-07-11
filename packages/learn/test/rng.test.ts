import { describe, expect, it } from "vitest";
import { chiSquaredSample, gammaSample, gaussian, mulberry32 } from "../src/rng.js";
import { RunningStats } from "../src/stats.js";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("produces different streams for different seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("stays in [0, 1) with roughly uniform mean", () => {
    const rng = mulberry32(7);
    const stats = new RunningStats();
    for (let i = 0; i < 20_000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      stats.push(x);
    }
    expect(stats.mean).toBeCloseTo(0.5, 1);
    expect(stats.variance).toBeCloseTo(1 / 12, 1);
  });
});

describe("gaussian", () => {
  it("has mean ~0 and variance ~1", () => {
    const rng = mulberry32(123);
    const stats = new RunningStats();
    for (let i = 0; i < 50_000; i++) stats.push(gaussian(rng));
    expect(stats.mean).toBeCloseTo(0, 1);
    expect(stats.variance).toBeCloseTo(1, 1);
  });
});

describe("gammaSample", () => {
  it.each([
    [0.5],
    [1],
    [3],
    [9.5],
  ])("Gamma(%f) has mean ~shape and variance ~shape", (shape) => {
    const rng = mulberry32(2024);
    const stats = new RunningStats();
    for (let i = 0; i < 50_000; i++) stats.push(gammaSample(shape, rng));
    expect(stats.mean).toBeCloseTo(shape, Math.abs(shape) < 1 ? 1 : 0);
    expect(stats.variance / shape).toBeGreaterThan(0.9);
    expect(stats.variance / shape).toBeLessThan(1.1);
  });

  it("rejects non-positive shapes", () => {
    const rng = mulberry32(1);
    expect(() => gammaSample(0, rng)).toThrow();
    expect(() => gammaSample(-1, rng)).toThrow();
  });
});

describe("chiSquaredSample", () => {
  it("has mean ~df and variance ~2df", () => {
    const rng = mulberry32(555);
    const stats = new RunningStats();
    for (let i = 0; i < 50_000; i++) stats.push(chiSquaredSample(4, rng));
    expect(stats.mean).toBeCloseTo(4, 0);
    expect(stats.variance / 8).toBeGreaterThan(0.9);
    expect(stats.variance / 8).toBeLessThan(1.1);
  });
});
