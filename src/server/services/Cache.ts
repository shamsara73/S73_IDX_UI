/**
 * Simple SQLite cache with TTL. No Redis needed.
 */

import { eq } from 'drizzle-orm'
import Database from '@app/server/Database.ts'
import * as Schemas from '@app/server/schemas/index.ts'

export class Cache {
  static async get<T>(key: string): Promise<T | null> {
    const row = await Database.select()
      .from(Schemas.cacheEntries)
      .where(eq(Schemas.cacheEntries.key, key))
      .limit(1)
    if (row.length === 0) return null
    const entry = row[0]!
    if (Date.now() > entry.expiresAt) {
      // Expired — delete lazily
      await Database.delete(Schemas.cacheEntries).where(eq(Schemas.cacheEntries.key, key))
      return null
    }
    return JSON.parse(entry.value) as T
  }

  static async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    const expiresAt = Date.now() + ttlMs
    const jsonValue = JSON.stringify(value)
    // Upsert
    await Database.delete(Schemas.cacheEntries).where(eq(Schemas.cacheEntries.key, key))
    await Database.insert(Schemas.cacheEntries).values({ key, value: jsonValue, expiresAt })
  }

  static async cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await Cache.get<T>(key)
    if (cached != null) return cached
    const fresh = await fetcher()
    await Cache.set(key, fresh, ttlMs)
    return fresh
  }
}
