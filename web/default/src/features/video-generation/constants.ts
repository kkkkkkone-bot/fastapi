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
export const MAX_VIDEO_REFERENCE_IMAGES = 3
export const MAX_VIDEO_REFERENCE_IMAGE_SIZE = 10 * 1024 * 1024
export const VIDEO_POLL_INTERVAL_MS = 3000

export const VIDEO_ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', width: 18, height: 18 },
  { label: '9:16', value: '9:16', width: 12, height: 21 },
  { label: '16:9', value: '16:9', width: 21, height: 12 },
]

const VIDEO_SIZE_BY_RATIO: Record<string, string> = {
  '1:1': '1024x1024',
  '9:16': '720x1280',
  '16:9': '1280x720',
}

export function getVideoAspectRatios(model: string): string[] {
  if (model.toLowerCase().startsWith('sora-2')) return ['9:16', '16:9']
  return VIDEO_ASPECT_RATIOS.map((option) => option.value)
}

export function getVideoDurations(model: string): number[] {
  const normalizedModel = model.toLowerCase()
  if (normalizedModel.startsWith('sora-2')) return [15, 4, 8, 12]
  if (normalizedModel.includes('veo-')) return [15, 4, 6, 8]
  if (normalizedModel.includes('hailuo')) return [15, 6, 10]
  return [15, 5, 10]
}

export function resolveVideoSize(aspectRatio: string): string {
  return VIDEO_SIZE_BY_RATIO[aspectRatio] ?? VIDEO_SIZE_BY_RATIO['16:9']
}
