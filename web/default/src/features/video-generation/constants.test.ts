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
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { getVideoModelCapabilities } from './constants'

describe('video model reference image limits', () => {
  test('uses the documented limits for aggregate video models', () => {
    assert.equal(
      getVideoModelCapabilities('grok-imagine-video-1.5-preview')
        .maxReferenceImages,
      7
    )
    assert.equal(getVideoModelCapabilities('kling-video').maxReferenceImages, 2)
    assert.equal(getVideoModelCapabilities('veo_3_1').maxReferenceImages, 2)
    assert.equal(
      getVideoModelCapabilities('veo_3_1-components').maxReferenceImages,
      3
    )
    assert.equal(
      getVideoModelCapabilities('veo_3_1-fast').maxReferenceImages,
      2
    )
  })

  test('adjusts the PixVerse limit by selected model version', () => {
    assert.equal(
      getVideoModelCapabilities('pixverse-video', 'c1').maxReferenceImages,
      7
    )
    assert.equal(
      getVideoModelCapabilities('pixverse-video', 'v5').maxReferenceImages,
      3
    )
    assert.equal(
      getVideoModelCapabilities('pixverse-video', 'v4').maxReferenceImages,
      2
    )
  })
})
