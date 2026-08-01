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

For commercial licensing, please contact support@quantumnous.com
*/
import { api } from '@/lib/api'

import type {
  GroupOption,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ModelOption,
} from './types'

// Endpoint mirrors /v1/images/generations but uses session auth (like the
// playground) so the web UI can call it without an API key.
export const IMAGE_GEN_ENDPOINT = '/pg/images/generations'

/**
 * Generate images via the session-authenticated playground endpoint.
 */
export async function generateImages(
  payload: ImageGenerationRequest,
  signal?: AbortSignal
): Promise<ImageGenerationResponse> {
  const res = await api.post(IMAGE_GEN_ENDPOINT, payload, {
    signal,
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return res.data
}

/**
 * Get user available models.
 */
export async function getUserModels(group: string): Promise<ModelOption[]> {
  const res = await api.get('/api/user/models', {
    params: { group },
  })
  const { data } = res

  if (!data.success || !Array.isArray(data.data)) {
    return []
  }

  return (data.data as string[]).map((model: string) => ({
    label: model,
    value: model,
  }))
}

/**
 * Get user groups with descriptions and ratios.
 */
export async function getUserGroups(): Promise<GroupOption[]> {
  const res = await api.get('/api/user/self/groups')
  const { data } = res

  if (!data.success || !data.data) {
    return []
  }

  const groupData = data.data as Record<string, { desc: string; ratio: number }>

  return Object.entries(groupData).map(([group, info]) => ({
    label: group,
    value: group,
    ratio: info.ratio,
    desc: info.desc,
  }))
}
