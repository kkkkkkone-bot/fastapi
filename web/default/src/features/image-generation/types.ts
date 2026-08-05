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
// OpenAI image generation request payload (subset we expose in the UI).
export interface ImageGenerationRequest {
  model: string
  group?: string
  prompt: string
  n?: number
  size?: string
  quality?: string
  response_format?: 'url' | 'b64_json'
}

export interface ReferenceImage {
  id: string
  file: File
  previewUrl: string
}

// OpenAI image generation item in the response.
export interface ImageDataItem {
  url?: string
  b64_json?: string
  revised_prompt?: string
}

export interface ImageGenerationResponse {
  id?: string
  created?: number
  data: ImageDataItem[]
}

// Model and group options (reused shape from playground).
export interface ModelOption {
  label: string
  value: string
}

export interface GroupOption {
  label: string
  value: string
  ratio: number
  desc?: string
}

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface GenerationResult {
  images: { url?: string; b64_json?: string }[]
  revisedPrompt?: string
}

export interface GenerationRecord extends GenerationResult {
  id: string
  createdAt: number
  prompt: string
  model: string
  aspectRatio: string
  resolution: string
  quality: string
}

export interface AspectRatioOption {
  label: string
  value: string
  width?: number
  height?: number
}

export interface ImageModelProfile {
  aspectRatios: string[]
  resolutions: string[]
  qualities: string[]
}
