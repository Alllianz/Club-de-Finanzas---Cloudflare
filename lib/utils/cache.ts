type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class MemoryTtlCache<T> {
  private entry: CacheEntry<T> | null = null;

  constructor(private readonly ttlMs: number) {}

  getFresh(): T | null {
    if (!this.entry) return null;
    if (Date.now() > this.entry.expiresAt) return null;
    return this.entry.value;
  }

  getStale(): T | null {
    return this.entry?.value ?? null;
  }

  set(value: T): void {
    this.entry = {
      value,
      expiresAt: Date.now() + this.ttlMs,
    };
  }
}
