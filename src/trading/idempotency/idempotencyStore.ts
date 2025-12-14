export interface IdempotencyStore {
  /**
   * Attempt to claim an idempotency key.
   * Returns true if this caller "owns" the key (first seen within TTL),
   * false if it's already been claimed.
   */
  claim(key: string, ttlSeconds: number): Promise<boolean>
}




