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
import type { AspectRatioOption, ImageModelProfile } from './types'

export const MAX_REFERENCE_IMAGES = 5
export const MAX_REFERENCE_IMAGE_SIZE = 10 * 1024 * 1024
export const CUSTOM_ASPECT_RATIO = 'custom'

export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { label: '1:1', value: '1:1', width: 18, height: 18 },
  { label: '2:3', value: '2:3', width: 14, height: 20 },
  { label: '3:2', value: '3:2', width: 20, height: 14 },
  { label: '3:4', value: '3:4', width: 15, height: 20 },
  { label: '4:3', value: '4:3', width: 20, height: 15 },
  { label: '9:16', value: '9:16', width: 12, height: 21 },
  { label: '16:9', value: '16:9', width: 21, height: 12 },
  { label: 'Custom', value: CUSTOM_ASPECT_RATIO },
]

const SIZE_BY_ASPECT_RATIO: Record<string, string> = {
  '1:1': '1024x1024',
  '2:3': '1024x1536',
  '3:2': '1536x1024',
  '3:4': '768x1024',
  '4:3': '1024x768',
  '9:16': '1024x1792',
  '16:9': '1792x1024',
}

const RESOLUTION_SCALE: Record<string, number> = {
  '1K': 1,
  '2K': 2,
  '4K': 4,
}

const ALL_ASPECT_RATIOS = ASPECT_RATIO_OPTIONS.map((option) => option.value)

export function getImageModelProfile(model: string): ImageModelProfile {
  const normalizedModel = model.toLowerCase()

  if (normalizedModel.includes('dall-e-2')) {
    return {
      aspectRatios: ['1:1', CUSTOM_ASPECT_RATIO],
      resolutions: ['1K'],
      qualities: ['standard'],
    }
  }

  if (normalizedModel.includes('dall-e-3')) {
    return {
      aspectRatios: ['1:1', '9:16', '16:9', CUSTOM_ASPECT_RATIO],
      resolutions: ['1K'],
      qualities: ['standard', 'hd'],
    }
  }

  if (normalizedModel.includes('gpt-image')) {
    return {
      aspectRatios: ['1:1', '9:16', '16:9', CUSTOM_ASPECT_RATIO],
      resolutions: ['1K', '2K', '4K'],
      qualities: ['low', 'medium', 'high'],
    }
  }

  if (
    normalizedModel.includes('imagen') ||
    normalizedModel.includes('nano-banana') ||
    normalizedModel.includes('seedream') ||
    normalizedModel.includes('gemini-image')
  ) {
    return {
      aspectRatios: ALL_ASPECT_RATIOS,
      resolutions: ['1K', '2K', '4K'],
      qualities: ['standard'],
    }
  }

  return {
    aspectRatios: ALL_ASPECT_RATIOS,
    resolutions: ['1K', '2K', '4K'],
    qualities: ['standard', 'high'],
  }
}

export function resolveImageSize(
  model: string,
  aspectRatio: string,
  resolution: string
): string | undefined {
  if (aspectRatio === CUSTOM_ASPECT_RATIO) return undefined

  const normalizedModel = model.toLowerCase()
  if (
    normalizedModel.includes('imagen') ||
    normalizedModel.includes('gemini-image')
  ) {
    return aspectRatio
  }

  const baseSize =
    SIZE_BY_ASPECT_RATIO[aspectRatio] ?? SIZE_BY_ASPECT_RATIO['1:1']
  const scale = RESOLUTION_SCALE[resolution] ?? 1
  if (scale === 1) return baseSize

  const [width, height] = baseSize.split('x').map(Number)
  return `${width * scale}x${height * scale}`
}

export function resolveImageQuality(
  model: string,
  resolution: string,
  quality: string
): string {
  const normalizedModel = model.toLowerCase()
  if (
    normalizedModel.includes('imagen') ||
    normalizedModel.includes('nano-banana') ||
    normalizedModel.includes('seedream') ||
    normalizedModel.includes('gemini-image')
  ) {
    return resolution
  }
  return quality
}
