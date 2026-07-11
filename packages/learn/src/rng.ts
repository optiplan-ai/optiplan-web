/**
 * Seedable random number generation. Every stochastic component in the engine
 * takes an Rng so simulations are reproducible and tests are deterministic.
 */
export type Rng = () => number;

/** Mulberry32: fast 32-bit seeded PRNG, uniform in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box–Muller (polar-free form; avoids u=0 by mapping to (0,1)). */
export function gaussian(rng: Rng): number {
  const u1 = 1 - rng(); // (0, 1]: guards against log(0)
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Gamma(shape, 1) sampler, Marsaglia–Tsang (2000).
 * For shape < 1 uses the boost Gamma(shape+1) * U^(1/shape).
 */
export function gammaSample(shape: number, rng: Rng): number {
  if (!(shape > 0)) throw new Error(`gammaSample requires shape > 0, got ${shape}`);
  if (shape < 1) {
    const u = 1 - rng(); // (0, 1]
    return gammaSample(shape + 1, rng) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      x = gaussian(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = 1 - rng(); // (0, 1]
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Chi-squared with `df` degrees of freedom: 2 * Gamma(df/2, 1). */
export function chiSquaredSample(df: number, rng: Rng): number {
  return 2 * gammaSample(df / 2, rng);
}

/** Student-t with `df` degrees of freedom. */
export function studentTSample(df: number, rng: Rng): number {
  return gaussian(rng) / Math.sqrt(chiSquaredSample(df, rng) / df);
}
