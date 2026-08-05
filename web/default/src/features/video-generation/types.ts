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
export interface VideoModelOption {
  label: string
  value: string
}

export interface VideoGroupOption {
  label: string
  value: string
}

export interface VideoReferenceImage {
  id: string
  file: File
  previewUrl: string
}

export interface VideoGenerationRequest {
  model: string
  group?: string
  prompt: string
  duration: number
  seconds: string
  size: string
  image?: string
  images?: string[]
}

export type VideoTaskStatus = 'queued' | 'in_progress' | 'completed' | 'failed'

export interface VideoTaskResponse {
  id?: string
  task_id?: string
  model?: string
  status?: string
  progress?: number
  created_at?: number
  completed_at?: number
  seconds?: string
  size?: string
  url?: string
  metadata?: { url?: string; [key: string]: unknown }
  error?: { message?: string; code?: string } | string | null
  data?: VideoTaskResponse
}

export interface VideoGenerationRecord {
  id: string
  createdAt: number
  prompt: string
  model: string
  aspectRatio: string
  duration: number
  status: VideoTaskStatus
  progress: number
  videoUrl?: string
  error?: string
}
