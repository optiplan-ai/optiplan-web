/**
 * Welford's online algorithm: numerically stable streaming mean/variance.
 * O(1) per observation, no stored samples — used wherever the engine tracks
 * running statistics over an unbounded event stream.
 */
export class RunningStats {
  private _n = 0;
  private _mean = 0;
  private _m2 = 0;

  push(x: number): void {
    this._n++;
    const delta = x - this._mean;
    this._mean += delta / this._n;
    this._m2 += delta * (x - this._mean);
  }

  get n(): number {
    return this._n;
  }

  get mean(): number {
    return this._mean;
  }

  /** Unbiased sample variance (n-1 denominator). NaN until two observations. */
  get variance(): number {
    return this._n < 2 ? Number.NaN : this._m2 / (this._n - 1);
  }

  get sd(): number {
    return Math.sqrt(this.variance);
  }
}

/**
 * Linear-interpolation quantile (R type 7, the numpy default).
 * @param values sample; does not need to be sorted
 * @param p quantile in [0, 1]
 */
export function quantile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new Error("quantile of empty sample");
  if (!(p >= 0 && p <= 1)) throw new Error(`quantile p must be in [0,1], got ${p}`);
  const sorted = [...values].sort((a, b) => a - b);
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!);
}
