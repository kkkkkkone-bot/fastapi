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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  StaticDataTable,
  type StaticDataTableColumn,
} from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { formatVideoSpecPrice } from '../lib/price'
import type { PricingModel, VideoPricingRow } from '../types'

type VideoSpecPricingProps = {
  model: PricingModel
  priceRate: number
  usdExchangeRate: number
  showRechargePrice: boolean
}

const EMPTY_VIDEO_PRICING_ROWS: VideoPricingRow[] = []

function formatVersion(version: string): string {
  if (version === 'kling-v2-6') return 'V2.6'
  if (version === 'kling-v3') return 'V3.0'
  return version.toUpperCase()
}

function modeLabelKey(mode: string): string {
  if (mode === 'std') return 'Video Gen Mode Standard'
  if (mode === 'pro') return 'Video Gen Mode Professional'
  if (mode === 'normal') return 'Video Gen Mode Normal'
  if (mode === 'fast') return 'Video Gen Mode Fast'
  return mode
}

export function VideoSpecPricing(props: VideoSpecPricingProps) {
  const { t } = useTranslation()
  const rows = props.model.video_pricing?.rows ?? EMPTY_VIDEO_PRICING_ROWS

  // Price formatting reads this store directly; subscribing keeps the table
  // reactive when the platform display unit changes.
  useSystemConfigStore((state) => state.config.currency)

  const columns = useMemo(() => {
    const nextColumns: StaticDataTableColumn<VideoPricingRow>[] = []
    const hasVersion = rows.some((row) => Boolean(row.model_version))
    const hasResolution = rows.some((row) => Boolean(row.resolution))
    const hasMode = rows.some((row) => Boolean(row.mode))
    const hasAudio = rows.some((row) => Boolean(row.audio))
    const hasInput = rows.some((row) => Boolean(row.input))

    if (hasVersion) {
      nextColumns.push({
        id: 'version',
        header: t('Video pricing Model version'),
        className: 'min-w-24',
        cellClassName: 'font-medium',
        cell: (row) => formatVersion(row.model_version ?? ''),
      })
    }
    if (hasResolution) {
      nextColumns.push({
        id: 'resolution',
        header: t('Video pricing Resolution'),
        className: 'min-w-24',
        cellClassName: 'font-mono tabular-nums',
        cell: (row) => row.resolution,
      })
    }
    nextColumns.push({
      id: 'duration',
      header: t('Video pricing Duration'),
      className: 'min-w-20',
      cellClassName: 'font-mono tabular-nums',
      cell: (row) => t('Video Gen Seconds', { count: row.duration }),
    })
    if (hasMode) {
      nextColumns.push({
        id: 'mode',
        header: t('Video pricing Mode'),
        className: 'min-w-24',
        cell: (row) => (row.mode ? t(modeLabelKey(row.mode)) : '—'),
      })
    }
    if (hasAudio) {
      nextColumns.push({
        id: 'audio',
        header: t('Video pricing Audio'),
        className: 'min-w-20',
        cell: (row) =>
          row.audio === 'on'
            ? t('Video pricing Audio on')
            : t('Video pricing Audio off'),
      })
    }
    if (hasInput) {
      nextColumns.push({
        id: 'input',
        header: t('Video pricing Input'),
        className: 'min-w-28',
        cell: (row) =>
          row.input === 'image'
            ? t('Video pricing Input image')
            : t('Video pricing Text prompt'),
      })
    }
    nextColumns.push({
      id: 'price',
      header: t('Video pricing Price'),
      className: 'min-w-28 text-right',
      cellClassName: 'text-right',
      cell: (row) => (
        <span className='bg-primary/5 text-primary inline-flex rounded-md px-2 py-1 font-mono font-semibold tabular-nums'>
          {formatVideoSpecPrice(
            props.model,
            row.multiplier,
            1,
            props.showRechargePrice,
            props.priceRate,
            props.usdExchangeRate
          )}
        </span>
      ),
    })
    return nextColumns
  }, [
    props.model,
    props.priceRate,
    props.showRechargePrice,
    props.usdExchangeRate,
    rows,
    t,
  ])

  if (rows.length === 0) return null

  return (
    <section className='space-y-3 border-t pt-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='text-sm font-semibold'>
            {t('Video pricing Specification prices')}
          </h3>
          <p className='text-muted-foreground mt-1 text-xs leading-5'>
            {t('Video pricing Specification prices description')}
          </p>
        </div>
        <Badge variant='secondary' className='font-mono tabular-nums'>
          {t('Video pricing Combination count', { count: rows.length })}
        </Badge>
      </div>

      <StaticDataTable
        className='overflow-x-auto rounded-lg'
        tableClassName='min-w-[640px] text-xs sm:text-sm'
        headerRowClassName='bg-muted/40 hover:bg-muted/40'
        data={rows}
        columns={columns}
        getRowKey={(row, index) =>
          [
            row.model_version,
            row.resolution,
            row.duration,
            row.mode,
            row.audio,
            row.input,
            index,
          ].join(':')
        }
        getRowClassName={(row, index) => {
          if (index === 0) return undefined
          const previous = rows[index - 1]
          if (row.model_version !== previous.model_version) {
            return 'border-t-2 border-border'
          }
          return undefined
        }}
      />
    </section>
  )
}
