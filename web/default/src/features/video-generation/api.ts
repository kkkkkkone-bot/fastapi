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
  VideoGenerationRequest,
  VideoGroupOption,
  VideoModelOption,
  VideoTaskResponse,
} from './types'

export const VIDEO_GENERATION_ENDPOINT = '/pg/videos'

export async function submitVideoTask(
  payload: VideoGenerationRequest,
  referenceFiles: File[],
  signal?: AbortSignal
): Promise<VideoTaskResponse> {
  let body: VideoGenerationRequest | FormData = payload

  if (payload.model.toLowerCase().startsWith('sora-2') && referenceFiles[0]) {
    const formData = new FormData()
    formData.append('model', payload.model)
    if (payload.group) formData.append('group', payload.group)
    formData.append('prompt', payload.prompt)
    formData.append('seconds', payload.seconds)
    formData.append('size', payload.size)
    formData.append(
      'input_reference',
      referenceFiles[0],
      referenceFiles[0].name
    )
    body = formData
  }

  const response = await api.post(VIDEO_GENERATION_ENDPOINT, body, {
    signal,
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return unwrapVideoTask(response.data)
}

export async function fetchVideoTask(
  taskId: string,
  signal?: AbortSignal
): Promise<VideoTaskResponse> {
  const response = await api.get(
    `${VIDEO_GENERATION_ENDPOINT}/${encodeURIComponent(taskId)}`,
    {
      signal,
      skipErrorHandler: true,
    } as Record<string, unknown>
  )
  return unwrapVideoTask(response.data)
}

export function getVideoContentUrl(taskId: string): string {
  return `/v1/videos/${encodeURIComponent(taskId)}/content`
}

export async function getVideoModels(
  group: string
): Promise<VideoModelOption[]> {
  const response = await api.get('/api/user/models', {
    params: { group, endpoint_type: 'openai-video' },
  })
  const { data } = response
  if (!data.success || !Array.isArray(data.data)) return []
  return (data.data as string[]).map((model) => ({
    label: model,
    value: model,
  }))
}

export async function getVideoGroups(): Promise<VideoGroupOption[]> {
  const response = await api.get('/api/user/self/groups')
  const { data } = response
  if (!data.success || !data.data) return []
  return Object.keys(data.data as Record<string, unknown>).map((group) => ({
    label: group,
    value: group,
  }))
}

function unwrapVideoTask(value: VideoTaskResponse): VideoTaskResponse {
  return value?.data && !value.id && !value.task_id ? value.data : value
}
