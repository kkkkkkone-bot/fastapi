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
import {
  CircleAlert,
  Download,
  Loader2,
  RotateCcw,
  Trash2,
  Video,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button, buttonVariants } from '@/components/ui/button'
import { Progress, ProgressLabel } from '@/components/ui/progress'
import { toIntlLocale } from '@/i18n/languages'

import { getVideoModelVersionLabel } from '../constants'
import type { VideoGenerationRecord } from '../types'

interface GenerationHistoryProps {
  history: VideoGenerationRecord[]
  status: string
  errorMessage: string
  onReuse: (record: VideoGenerationRecord) => void
  onClear: () => void
}

export function GenerationHistory(props: GenerationHistoryProps) {
  const { t, i18n } = useTranslation()
  const isSubmitting =
    props.status === 'submitting' && props.history.length === 0

  return (
    <section className='min-w-0'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <div>
          <h2 className='flex items-center gap-2 text-base font-semibold'>
            <Video className='text-primary size-4' />
            {t('Video Gen Results')}
          </h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Video Gen Results description')}
          </p>
        </div>
        {props.history.length > 0 && (
          <Button variant='ghost' size='sm' onClick={props.onClear}>
            <Trash2 />
            {t('Clear')}
          </Button>
        )}
      </div>

      {isSubmitting && <SubmittingPlaceholder />}

      {props.status === 'error' && props.errorMessage && (
        <div className='border-destructive/30 bg-destructive/5 mb-4 rounded-2xl border p-4'>
          <p className='text-destructive flex items-center gap-2 text-sm font-medium'>
            <CircleAlert className='size-4' />
            {t('Video Gen Generation failed')}
          </p>
          <p className='text-muted-foreground mt-1 text-xs break-words'>
            {props.errorMessage}
          </p>
        </div>
      )}

      {props.history.length === 0 && !isSubmitting ? (
        <div className='bg-muted/15 flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed px-6 text-center'>
          <span className='bg-background mb-3 flex size-12 items-center justify-center rounded-2xl border shadow-sm'>
            <Video className='text-muted-foreground size-5' />
          </span>
          <h3 className='text-sm font-medium'>
            {t('Video Gen No videos yet')}
          </h3>
          <p className='text-muted-foreground mt-1 max-w-sm text-xs leading-5'>
            {t('Video Gen Empty description')}
          </p>
        </div>
      ) : (
        <div className='space-y-5'>
          {props.history.map((record) => (
            <article
              key={record.id}
              className='bg-card overflow-hidden rounded-3xl border shadow-sm'
            >
              <div className='flex items-start justify-between gap-3 border-b px-4 py-3'>
                <div className='min-w-0'>
                  <p className='line-clamp-2 text-sm leading-5 font-medium'>
                    {record.prompt}
                  </p>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    {record.model}
                    {record.modelVersion
                      ? ` · ${getVideoModelVersionLabel(record.modelVersion)}`
                      : ''}
                    {record.quality ? ` · ${record.quality}` : ''} ·{' '}
                    {record.aspectRatio} ·{' '}
                    {t('Video Gen Seconds', { count: record.duration })} ·{' '}
                    {new Intl.DateTimeFormat(toIntlLocale(i18n.language), {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(record.createdAt)}
                  </p>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => props.onReuse(record)}
                >
                  <RotateCcw />
                  {t('Video Gen Reuse settings')}
                </Button>
              </div>

              <VideoRecordContent record={record} />
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function VideoRecordContent({ record }: { record: VideoGenerationRecord }) {
  const { t } = useTranslation()

  if (record.status === 'completed' && record.videoUrl) {
    return (
      <div
        className='bg-black p-1'
        style={{ aspectRatio: record.aspectRatio.replace(':', '/') }}
      >
        <div className='group relative size-full overflow-hidden rounded-[20px] bg-black'>
          <video
            src={record.videoUrl}
            controls
            playsInline
            preload='metadata'
            className='size-full object-contain'
          />
          <a
            href={record.videoUrl}
            download
            target='_blank'
            rel='noreferrer'
            aria-label={t('Video Gen Download')}
            className={buttonVariants({
              variant: 'secondary',
              size: 'icon',
              className:
                'absolute top-2 right-2 rounded-xl opacity-90 shadow-md sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
            })}
          >
            <Download />
          </a>
        </div>
      </div>
    )
  }

  if (record.status === 'failed') {
    return (
      <div className='bg-destructive/5 flex min-h-64 flex-col items-center justify-center px-6 text-center'>
        <CircleAlert className='text-destructive mb-3 size-8' />
        <p className='text-sm font-medium'>{t('Video Gen Task failed')}</p>
        <p className='text-muted-foreground mt-1 max-w-sm text-xs leading-5'>
          {record.error || t('Video Gen Failure refund note')}
        </p>
      </div>
    )
  }

  return (
    <div className='bg-muted/20 flex min-h-64 flex-col items-center justify-center px-6 text-center'>
      <span className='bg-background mb-4 flex size-12 items-center justify-center rounded-2xl border shadow-sm'>
        <Loader2 className='text-primary size-5 animate-spin' />
      </span>
      <p className='text-sm font-medium'>{t('Video Gen Task processing')}</p>
      <p className='text-muted-foreground mt-1 text-xs'>
        {t('Video Gen Auto polling')}
      </p>
      <Progress value={record.progress} className='mt-5 w-full max-w-sm'>
        <ProgressLabel>{t('Video Gen Progress')}</ProgressLabel>
        <span className='text-muted-foreground ml-auto text-sm tabular-nums'>
          {record.progress}%
        </span>
      </Progress>
    </div>
  )
}

function SubmittingPlaceholder() {
  const { t } = useTranslation()
  return (
    <div className='bg-card mb-5 flex min-h-96 flex-col items-center justify-center rounded-3xl border px-6 text-center shadow-sm'>
      <span className='bg-background mb-4 flex size-12 items-center justify-center rounded-2xl border shadow-sm'>
        <Loader2 className='text-primary size-5 animate-spin' />
      </span>
      <p className='text-sm font-medium'>{t('Video Gen Submitting task')}</p>
      <p className='text-muted-foreground mt-1 text-xs'>
        {t('Video Gen Please wait')}
      </p>
    </div>
  )
}
