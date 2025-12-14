export interface StateIndexStore {
  /**
   * Record that a state key was touched/updated.
   * Used only for debug visibility and discoverability.
   */
  record(key: string, ttlSeconds: number): Promise<void>

  /**
   * List recently touched keys, newest-first.
   */
  listRecent(opts: { prefix?: string; limit: number }): Promise<string[]>
}




