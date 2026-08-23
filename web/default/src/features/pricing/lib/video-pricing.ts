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
import type { VideoPricingRow } from '../types'

export type VideoPricingSelection = {
  modelVersion?: string
  resolution?: string
  duration: number
  mode?: string
  audioEnabled?: boolean
  hasInputImage?: boolean
}

export function findVideoPricingRow(
  rows: VideoPricingRow[],
  selection: VideoPricingSelection
): VideoPricingRow | undefined {
  const expectedAudio = selection.audioEnabled ? 'on' : 'off'
  const expectedInput = selection.hasInputImage ? 'image' : 'text'

  return rows.find((row) => {
    if (row.duration !== selection.duration) return false
    if (row.model_version && row.model_version !== selection.modelVersion) {
      return false
    }
    if (row.resolution && row.resolution !== selection.resolution) return false
    if (row.mode && row.mode !== selection.mode) return false
    if (row.audio && row.audio !== expectedAudio) return false
    if (row.input && row.input !== expectedInput) return false
    return true
  })
}
