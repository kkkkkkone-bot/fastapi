/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export const MAX_VIDEO_REFERENCE_IMAGES = 7
export const MAX_VIDEO_REFERENCE_IMAGE_SIZE = 10 * 1024 * 1024
export const VIDEO_POLL_INTERVAL_MS = 3000

export const VIDEO_ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', width: 18, height: 18 },
  { label: '3:4', value: '3:4', width: 15, height: 20 },
  { label: '4:3', value: '4:3', width: 20, height: 15 },
  { label: '9:16', value: '9:16', width: 12, height: 21 },
  { label: '16:9', value: '16:9', width: 21, height: 12 },
]

const DEFAULT_ASPECT_RATIOS = ['1:1', '9:16', '16:9']

const VIDEO_SIZE_BY_RATIO: Record<string, string> = {
  '1:1': '1024x1024',
  '3:4': '768x1024',
  '4:3': '1024x768',
  '9:16': '720x1280',
  '16:9': '1280x720',
}

export interface VideoModelCapabilities {
  aspectRatios: string[]
  durations: number[]
  qualities: string[]
  modelVersions: string[]
  modes: string[]
  supportsAudio: boolean
  audioAlwaysOn: boolean
  maxReferenceImages: number
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function pixVerseDurations(modelVersion: string, mode: string): number[] {
  if (mode === 'fast') return [5]
  if (['v3.5', 'v4', 'v4.5', 'v5'].includes(modelVersion)) return [5, 8]
  return [5, 8, 10]
}

export function getVideoModelCapabilities(
  model: string,
  modelVersion = '',
  mode = ''
): VideoModelCapabilities {
  const normalizedModel = model.toLowerCase()
  const normalizedVersion = modelVersion.toLowerCase()

  if (normalizedModel === 'grok-imagine-video-1.5-preview') {
    return {
      aspectRatios: DEFAULT_ASPECT_RATIOS,
      durations: range(1, 15),
      qualities: ['480p', '720p'],
      modelVersions: [],
      modes: [],
      supportsAudio: false,
      audioAlwaysOn: true,
      maxReferenceImages: 7,
    }
  }

  if (normalizedModel === 'pixverse-video') {
    const versions = ['c1', 'v6', 'v5.6', 'v5.5', 'v5', 'v4.5', 'v4', 'v3.5']
    const selectedVersion = versions.includes(normalizedVersion)
      ? normalizedVersion
      : versions[0]
    const modes = ['v3.5', 'v4', 'v4.5'].includes(selectedVersion)
      ? ['normal', 'fast']
      : []
    let maxReferenceImages = 2
    if (['c1', 'v6', 'v5.6', 'v5.5'].includes(selectedVersion)) {
      maxReferenceImages = 7
    } else if (['v5', 'v4.5'].includes(selectedVersion)) {
      maxReferenceImages = 3
    }
    return {
      aspectRatios: ['1:1', '3:4', '4:3', '9:16', '16:9'],
      durations: pixVerseDurations(selectedVersion, mode),
      qualities:
        mode === 'fast'
          ? ['360p', '540p', '720p']
          : ['360p', '540p', '720p', '1080p'],
      modelVersions: versions,
      modes,
      supportsAudio: ['c1', 'v6', 'v5.6', 'v5.5'].includes(selectedVersion),
      audioAlwaysOn: false,
      maxReferenceImages,
    }
  }

  if (normalizedModel === 'kling-video') {
    const selectedVersion =
      normalizedVersion === 'kling-v3' ? 'kling-v3' : 'kling-v2-6'
    return {
      aspectRatios: DEFAULT_ASPECT_RATIOS,
      durations: selectedVersion === 'kling-v3' ? range(3, 15) : [5, 10],
      qualities: [],
      modelVersions: ['kling-v2-6', 'kling-v3'],
      modes: ['std', 'pro'],
      supportsAudio: true,
      audioAlwaysOn: false,
      maxReferenceImages: 2,
    }
  }

  if (normalizedModel === 'viduq3-turbo') {
    return {
      aspectRatios: DEFAULT_ASPECT_RATIOS,
      durations: range(1, 16),
      qualities: ['540p', '720p', '1080p'],
      modelVersions: [],
      modes: [],
      supportsAudio: false,
      audioAlwaysOn: true,
      maxReferenceImages: 2,
    }
  }

  if (
    normalizedModel === 'veo_3_1' ||
    normalizedModel === 'veo_3_1-components' ||
    normalizedModel === 'veo_3_1-fast'
  ) {
    return {
      aspectRatios: ['9:16', '16:9'],
      durations: [8],
      qualities: ['720p', '1080p'],
      modelVersions: [],
      modes: [],
      supportsAudio: false,
      audioAlwaysOn: true,
      maxReferenceImages: normalizedModel === 'veo_3_1-components' ? 3 : 2,
    }
  }

  if (normalizedModel.startsWith('sora-2')) {
    return {
      aspectRatios: ['9:16', '16:9'],
      durations: [4, 8, 12, 15],
      qualities: ['720p'],
      modelVersions: [],
      modes: [],
      supportsAudio: false,
      audioAlwaysOn: false,
      maxReferenceImages: 1,
    }
  }

  if (normalizedModel.includes('veo-')) {
    return {
      aspectRatios: DEFAULT_ASPECT_RATIOS,
      durations: [4, 6, 8, 15],
      qualities: ['720p'],
      modelVersions: [],
      modes: [],
      supportsAudio: false,
      audioAlwaysOn: false,
      maxReferenceImages: 1,
    }
  }

  if (normalizedModel.includes('hailuo')) {
    return {
      aspectRatios: DEFAULT_ASPECT_RATIOS,
      durations: [6, 10, 15],
      qualities: ['720p'],
      modelVersions: [],
      modes: [],
      supportsAudio: false,
      audioAlwaysOn: false,
      maxReferenceImages: 1,
    }
  }

  return {
    aspectRatios: DEFAULT_ASPECT_RATIOS,
    durations: [5, 10, 15],
    qualities: ['720p'],
    modelVersions: [],
    modes: [],
    supportsAudio: false,
    audioAlwaysOn: false,
    maxReferenceImages: MAX_VIDEO_REFERENCE_IMAGES,
  }
}

export function getVideoModelVersionLabel(modelVersion: string): string {
  if (modelVersion === 'kling-v2-6') return 'V2.6'
  if (modelVersion === 'kling-v3') return 'V3.0'
  return modelVersion.toUpperCase()
}

export function getVideoModeLabel(mode: string): string {
  if (mode === 'std') return 'Standard'
  if (mode === 'pro') return 'Professional'
  if (mode === 'normal') return 'Normal'
  if (mode === 'fast') return 'Fast'
  return mode
}

export function resolveVideoSize(
  aspectRatio: string,
  quality?: string
): string {
  if (quality === '1080p') {
    const hdSizes: Record<string, string> = {
      '1:1': '1080x1080',
      '3:4': '1080x1440',
      '4:3': '1440x1080',
      '9:16': '1080x1920',
      '16:9': '1920x1080',
    }
    return hdSizes[aspectRatio] ?? hdSizes['16:9']
  }
  return VIDEO_SIZE_BY_RATIO[aspectRatio] ?? VIDEO_SIZE_BY_RATIO['16:9']
}
