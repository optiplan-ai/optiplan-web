import { describe, expect, it } from "vitest";
import { NormalInverseGamma } from "../src/nig.js";
import { mulberry32 } from "../src/rng.js";
import { RunningStats } from "../src/stats.js";

describe("NormalInverseGamma", () => {
  it("sequential updates match the closed-form batch posterior", () => {
    // Batch formulas (Murphy, "Conjugate Bayesian analysis of the Gaussian"):
    //   κn = κ0 + n
    //   μn = (κ0 μ0 + n x̄) / κn
    //   αn = α0 + n/2
    //   βn = β0 + ½ Σ(xi − x̄)² + κ0 n (x̄ − μ0)² / (2 κn)
    const prior = { mu: 1, kappa: 2, alpha: 3, beta: 4 };
    const xs = [2.2, -0.4, 1.7, 3.9, 0.8];

    const model = new NormalInverseGamma(prior);
    model.observeMany(xs);

    const n = xs.length;
    const xbar = xs.reduce((a, b) => a + b, 0) / n;
    const ss = xs.reduce((a, b) => a + (b - xbar) ** 2, 0);
    const kappaN = prior.kappa + n;

    expect(model.params.kappa).toBeCloseTo(kappaN, 12);
    expect(model.params.mu).toBeCloseTo((prior.kappa * prior.mu + n * xbar) / kappaN, 12);
    expect(model.params.alpha).toBeCloseTo(prior.alpha + n / 2, 12);
    expect(model.params.beta).toBeCloseTo(
      prior.beta + 0.5 * ss + (prior.kappa * n * (xbar - prior.mu) ** 2) / (2 * kappaN),
      12,
    );
  });

  it("posterior mean moves toward data, weighted by prior strength", () => {
    const weak = new NormalInverseGamma({ mu: 0, kappa: 1, alpha: 2, beta: 1 });
    const strong = new NormalInverseGamma({ mu: 0, kappa: 100, alpha: 2, beta: 1 });
    for (const x of [10, 10, 10]) {
      weak.observe(x);
      strong.observe(x);
    }
    expect(weak.mean).toBeGreaterThan(7); // data dominates
    expect(strong.mean).toBeLessThan(0.5); // prior dominates
    expect(weak.mean).toBeGreaterThan(strong.mean);
  });

  it("predictive uncertainty shrinks as evidence accumulates", () => {
    const model = NormalInverseGamma.weaklyInformative(0);
    const rng = mulberry32(9);
    const before = model.predictiveVariance;
    for (let i = 0; i < 200; i++) model.observe(5 + (rng() - 0.5));
    expect(model.predictiveVariance).toBeLessThan(before);
    expect(model.mean).toBeCloseTo(5, 1);
  });

  it("posterior predictive samples recover the generating distribution", () => {
    // Feed N(3, 2²) data; predictive samples should have mean ~3 and sd ~2.
    const dataRng = mulberry32(42);
    const model = NormalInverseGamma.weaklyInformative(0);
    for (let i = 0; i < 2_000; i++) {
      const u1 = 1 - dataRng();
      const u2 = dataRng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      model.observe(3 + 2 * z);
    }

    const sampleRng = mulberry32(7);
    const stats = new RunningStats();
    for (let i = 0; i < 20_000; i++) stats.push(model.samplePredictive(sampleRng));

    // The sampler must agree with the model's own posterior predictive
    // (location μ, variance from the t parameters), which in turn should be
    // near the generating N(3, 2²) after 2k observations.
    expect(stats.mean).toBeCloseTo(model.mean, 1);
    expect(stats.variance / model.predictiveVariance).toBeGreaterThan(0.95);
    expect(stats.variance / model.predictiveVariance).toBeLessThan(1.05);
    expect(model.mean).toBeCloseTo(3, 0);
    expect(Math.sqrt(model.predictiveVariance)).toBeCloseTo(2, 0);
  });

  it("round-trips through JSON", () => {
    const model = new NormalInverseGamma({ mu: 1.5, kappa: 3, alpha: 4, beta: 2.5 });
    model.observe(2.0);
    const restored = NormalInverseGamma.fromJSON(JSON.parse(JSON.stringify(model.toJSON())));
    expect(restored.params).toEqual(model.params);
    expect(restored.predictive).toEqual(model.predictive);
  });

  it("rejects invalid hyperparameters", () => {
    expect(() => new NormalInverseGamma({ mu: 0, kappa: 0, alpha: 1, beta: 1 })).toThrow();
    expect(() => new NormalInverseGamma({ mu: 0, kappa: 1, alpha: -1, beta: 1 })).toThrow();
  });
});
