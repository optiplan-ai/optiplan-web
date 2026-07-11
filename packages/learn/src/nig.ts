import { studentTSample, type Rng } from "./rng.js";

/**
 * Normal-Inverse-Gamma conjugate model for a Gaussian with unknown mean and
 * variance — the building block of the hierarchical duration world model
 * (durations are modeled log-normally, so observations here are log-durations).
 *
 * Parameters follow the standard NIG(μ, κ, α, β) convention:
 *   σ² ~ InverseGamma(α, β),  μ | σ² ~ Normal(μ0, σ²/κ).
 *
 * Updates are exact and O(1); the posterior predictive is a Student-t, which
 * is what the Monte Carlo forecaster samples from.
 */
export interface NigParams {
  mu: number;
  kappa: number;
  alpha: number;
  beta: number;
}

export class NormalInverseGamma {
  private p: NigParams;

  constructor(params: NigParams) {
    if (!(params.kappa > 0) || !(params.alpha > 0) || !(params.beta > 0)) {
      throw new Error("NIG requires kappa, alpha, beta > 0");
    }
    this.p = { ...params };
  }

  /** A weakly-informative default prior centered on `mu`. */
  static weaklyInformative(mu = 0): NormalInverseGamma {
    return new NormalInverseGamma({ mu, kappa: 1, alpha: 2, beta: 1 });
  }

  get params(): Readonly<NigParams> {
    return this.p;
  }

  /** Exact single-observation conjugate update. */
  observe(x: number): void {
    const { mu, kappa, alpha, beta } = this.p;
    const kappaNext = kappa + 1;
    this.p = {
      mu: (kappa * mu + x) / kappaNext,
      kappa: kappaNext,
      alpha: alpha + 0.5,
      beta: beta + (kappa * (x - mu) * (x - mu)) / (2 * kappaNext),
    };
  }

  observeMany(xs: readonly number[]): void {
    for (const x of xs) this.observe(x);
  }

  /** Posterior mean of the Gaussian mean. */
  get mean(): number {
    return this.p.mu;
  }

  /**
   * Posterior predictive distribution: Student-t with
   * df = 2α, location μ, scale² = β(κ+1)/(ακ).
   */
  get predictive(): { df: number; loc: number; scale: number } {
    const { mu, kappa, alpha, beta } = this.p;
    return {
      df: 2 * alpha,
      loc: mu,
      scale: Math.sqrt((beta * (kappa + 1)) / (alpha * kappa)),
    };
  }

  /** Variance of the posterior predictive (defined for df > 2). */
  get predictiveVariance(): number {
    const { df, scale } = this.predictive;
    return df > 2 ? (scale * scale * df) / (df - 2) : Number.POSITIVE_INFINITY;
  }

  /** Draw one value from the posterior predictive. */
  samplePredictive(rng: Rng): number {
    const { df, loc, scale } = this.predictive;
    return loc + scale * studentTSample(df, rng);
  }

  /** Serialize for storage (posteriors are persisted as JSON per workspace). */
  toJSON(): NigParams {
    return { ...this.p };
  }

  static fromJSON(params: NigParams): NormalInverseGamma {
    return new NormalInverseGamma(params);
  }
}
