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

import type { VideoGenerationRecord } from './types'

const STORAGE_VERSION = 1
export const MAX_VIDEO_GENERATION_HISTORY = 10

const videoRecordSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  prompt: z.string(),
  model: z.string(),
  modelVersion: z.string().optional(),
  quality: z.string().optional(),
  mode: z.string().optional(),
  audioEnabled: z.boolean().optional(),
  aspectRatio: z.string(),
  duration: z.number(),
  status: z.enum(['queued', 'in_progress', 'completed', 'failed']),
  progress: z.number(),
  videoUrl: z.string().optional(),
  error: z.string().optional(),
})

const storedHistorySchema = z.object({
  version: z.literal(STORAGE_VERSION),
  records: z.array(videoRecordSchema),
})

function storageKey(userId: number): string {
  return `video-generation-history:v${STORAGE_VERSION}:user:${userId}`
}

export function loadVideoGenerationHistory(
  userId?: number
): VideoGenerationRecord[] {
  if (typeof window === 'undefined' || userId === undefined) return []

  try {
    const value = window.localStorage.getItem(storageKey(userId))
    if (!value) return []
    return storedHistorySchema
      .parse(JSON.parse(value))
      .records.slice(0, MAX_VIDEO_GENERATION_HISTORY)
  } catch {
    return []
  }
}

export function saveVideoGenerationHistory(
  userId: number | undefined,
  records: VideoGenerationRecord[]
): void {
  if (typeof window === 'undefined' || userId === undefined) return

  try {
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify({
        version: STORAGE_VERSION,
        records: records
          .slice(0, MAX_VIDEO_GENERATION_HISTORY)
          .map((record) => {
            const { videoUrl: _videoUrl, ...persistedRecord } = record
            return persistedRecord
          }),
      })
    )
  } catch {
    // Browser storage may be unavailable or full. The current session remains usable.
  }
}

export function clearVideoGenerationHistory(userId?: number): void {
  if (typeof window === 'undefined' || userId === undefined) return

  try {
    window.localStorage.removeItem(storageKey(userId))
  } catch {
    // Browser storage may be unavailable.
  }
}
