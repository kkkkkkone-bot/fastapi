/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import { z } from 'zod'

import type { GenerationRecord } from './types'

const STORAGE_VERSION = 1
const MAX_STORED_RECORDS = 30

const imageRecordSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  prompt: z.string(),
  model: z.string(),
  aspectRatio: z.string(),
  resolution: z.string(),
  quality: z.string(),
  revisedPrompt: z.string().optional(),
  images: z.array(z.object({ url: z.string() })).min(1),
})

const storedHistorySchema = z.object({
  version: z.literal(STORAGE_VERSION),
  records: z.array(imageRecordSchema),
})

function storageKey(userId: number): string {
  return `image-generation-history:v${STORAGE_VERSION}:user:${userId}`
}

export function loadImageGenerationHistory(
  userId?: number
): GenerationRecord[] {
  if (typeof window === 'undefined' || userId === undefined) return []

  try {
    const value = window.localStorage.getItem(storageKey(userId))
    if (!value) return []
    return storedHistorySchema.parse(JSON.parse(value)).records
  } catch {
    return []
  }
}

export function saveImageGenerationHistory(
  userId: number | undefined,
  records: GenerationRecord[]
): void {
  if (typeof window === 'undefined' || userId === undefined) return

  try {
    const persistedRecords = records
      .map((record) => ({
        ...record,
        images: record.images.flatMap((image) =>
          image.url ? [{ url: image.url }] : []
        ),
      }))
      .filter((record) => record.images.length > 0)
      .slice(0, MAX_STORED_RECORDS)

    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify({ version: STORAGE_VERSION, records: persistedRecords })
    )
  } catch {
    // Browser storage may be unavailable or full. The current session remains usable.
  }
}

export function clearImageGenerationHistory(userId?: number): void {
  if (typeof window === 'undefined' || userId === undefined) return

  try {
    window.localStorage.removeItem(storageKey(userId))
  } catch {
    // Browser storage may be unavailable.
  }
}
