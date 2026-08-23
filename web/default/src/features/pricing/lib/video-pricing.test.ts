import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import type { VideoPricingRow } from '../types'
import { findVideoPricingRow } from './video-pricing'

const rows: VideoPricingRow[] = [
  {
    model_version: 'kling-v2-6',
    duration: 10,
    mode: 'pro',
    audio: 'off',
    multiplier: 10 / 3,
  },
  {
    model_version: 'kling-v2-6',
    duration: 10,
    mode: 'pro',
    audio: 'on',
    multiplier: 20 / 3,
  },
]

describe('video pricing row selection', () => {
  test('selects the exact version, duration, mode, and audio combination', () => {
    const row = findVideoPricingRow(rows, {
      modelVersion: 'kling-v2-6',
      duration: 10,
      mode: 'pro',
      audioEnabled: true,
    })

    assert.equal(row?.audio, 'on')
    assert.equal(row?.multiplier, 20 / 3)
  })

  test('does not estimate an unsupported combination', () => {
    const row = findVideoPricingRow(rows, {
      modelVersion: 'kling-v2-6',
      duration: 5,
      mode: 'std',
      audioEnabled: true,
    })

    assert.equal(row, undefined)
  })
})
