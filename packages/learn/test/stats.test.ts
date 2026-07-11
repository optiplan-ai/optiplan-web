import { describe, expect, it } from "vitest";
import { RunningStats, quantile } from "../src/stats.js";

describe("RunningStats (Welford)", () => {
  it("matches the direct two-pass computation", () => {
    const xs = [2.5, 3.1, -4, 0, 8.25, 3.3, 3.3, -1.7];
    const stats = new RunningStats();
    for (const x of xs) stats.push(x);

    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);

    expect(stats.n).toBe(xs.length);
    expect(stats.mean).toBeCloseTo(mean, 12);
    expect(stats.variance).toBeCloseTo(variance, 12);
    expect(stats.sd).toBeCloseTo(Math.sqrt(variance), 12);
  });

  it("is numerically stable for large offsets", () => {
    const stats = new RunningStats();
    for (const x of [1e9 + 4, 1e9 + 7, 1e9 + 13, 1e9 + 16]) stats.push(x);
    expect(stats.variance).toBeCloseTo(30, 6);
  });

  it("reports NaN variance below two observations", () => {
    const stats = new RunningStats();
    expect(Number.isNaN(stats.variance)).toBe(true);
    stats.push(1);
    expect(Number.isNaN(stats.variance)).toBe(true);
  });
});

describe("quantile (type 7)", () => {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("matches numpy's default behavior", () => {
    expect(quantile(xs, 0)).toBe(1);
    expect(quantile(xs, 1)).toBe(10);
    expect(quantile(xs, 0.5)).toBeCloseTo(5.5, 12);
    expect(quantile(xs, 0.25)).toBeCloseTo(3.25, 12);
    expect(quantile(xs, 0.85)).toBeCloseTo(8.65, 12);
  });

  it("does not mutate its input and handles unsorted samples", () => {
    const messy = [9, 1, 5];
    expect(quantile(messy, 0.5)).toBe(5);
    expect(messy).toEqual([9, 1, 5]);
  });

  it("rejects empty samples and out-of-range p", () => {
    expect(() => quantile([], 0.5)).toThrow();
    expect(() => quantile([1], 1.5)).toThrow();
  });
});
