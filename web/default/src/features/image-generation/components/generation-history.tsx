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
import { Download, History, ImageIcon, RotateCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toIntlLocale } from '@/i18n/languages'
import { cn } from '@/lib/utils'

import { CUSTOM_ASPECT_RATIO } from '../constants'
import type { GenerationRecord } from '../types'

interface GenerationHistoryProps {
  history: GenerationRecord[]
  status: 'idle' | 'loading' | 'success' | 'error'
  errorMessage: string
  onReuse: (record: GenerationRecord) => void
  onClear: () => void
}

export function GenerationHistory(props: GenerationHistoryProps) {
  const { t, i18n } = useTranslation()

  return (
    <section className='min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col'>
      <div className='mb-4 flex shrink-0 items-center justify-between gap-3'>
        <div>
          <h2 className='flex items-center gap-2 text-base font-semibold'>
            <History className='text-primary size-4' />
            {t('Image Gen Session history')}
          </h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Image Gen Session history description')}
          </p>
        </div>
        {props.history.length > 0 && (
          <Button variant='ghost' size='sm' onClick={props.onClear}>
            <Trash2 />
            {t('Clear')}
          </Button>
        )}
      </div>

      <div className='lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-2'>
        {props.status === 'loading' && <GeneratingPlaceholder />}

        {props.status === 'error' && (
          <div className='border-destructive/30 bg-destructive/5 mb-4 rounded-2xl border p-4'>
            <p className='text-destructive text-sm font-medium'>
              {t('Image Gen Generation failed')}
            </p>
            <p className='text-muted-foreground mt-1 text-xs break-words'>
              {props.errorMessage}
            </p>
          </div>
        )}

        {props.history.length === 0 && props.status !== 'loading' ? (
          <div className='bg-muted/15 flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed px-6 text-center'>
            <span className='bg-background mb-3 flex size-12 items-center justify-center rounded-2xl border shadow-sm'>
              <ImageIcon className='text-muted-foreground size-5' />
            </span>
            <h3 className='text-sm font-medium'>
              {t('Image Gen No images yet')}
            </h3>
            <p className='text-muted-foreground mt-1 max-w-xs text-xs leading-5'>
              {t('Image Gen Session empty description')}
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
                      {record.model} ·{' '}
                      {record.aspectRatio === CUSTOM_ASPECT_RATIO
                        ? t('Image Gen Custom')
                        : record.aspectRatio}{' '}
                      · {record.resolution} ·{' '}
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
                    {t('Image Gen Reuse settings')}
                  </Button>
                </div>

                {record.revisedPrompt && (
                  <p className='bg-muted/20 text-muted-foreground border-b px-4 py-2.5 text-xs leading-5'>
                    <span className='text-foreground font-medium'>
                      {t('Image Gen Revised prompt')}:{' '}
                    </span>
                    {record.revisedPrompt}
                  </p>
                )}

                <div
                  className={cn(
                    'grid gap-1 p-1',
                    record.images.length > 1 && 'grid-cols-2'
                  )}
                >
                  {record.images.map((image, index) => {
                    const source =
                      image.url ??
                      (image.b64_json
                        ? `data:image/png;base64,${image.b64_json}`
                        : '')
                    if (!source) return null
                    return (
                      <div
                        key={`${record.id}-${image.url ?? image.b64_json?.slice(0, 64)}`}
                        className='group bg-muted relative overflow-hidden rounded-[20px]'
                        style={{
                          aspectRatio:
                            record.aspectRatio === CUSTOM_ASPECT_RATIO
                              ? undefined
                              : record.aspectRatio.replace(':', '/'),
                        }}
                      >
                        <img
                          src={source}
                          alt={`${t('Generated image')} ${index + 1}`}
                          loading='lazy'
                          className={cn(
                            'w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]',
                            record.aspectRatio === CUSTOM_ASPECT_RATIO
                              ? 'h-auto max-h-[720px]'
                              : 'h-full'
                          )}
                        />
                        <a
                          href={source}
                          download
                          target='_blank'
                          rel='noreferrer'
                          aria-label={t('Image Gen Download')}
                          className={buttonVariants({
                            variant: 'secondary',
                            size: 'icon',
                            className:
                              'absolute bottom-2 right-2 rounded-xl opacity-90 shadow-md sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
                          })}
                        >
                          <Download />
                        </a>
                      </div>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function GeneratingPlaceholder() {
  const { t } = useTranslation()
  return (
    <div className='bg-card mb-5 overflow-hidden rounded-3xl border p-1 shadow-sm'>
      <div className='bg-muted/40 relative flex aspect-square items-center justify-center overflow-hidden rounded-[20px]'>
        <Skeleton className='absolute inset-0 rounded-none' />
        <div className='relative flex flex-col items-center gap-2 text-sm font-medium'>
          <SparkleLoader />
          {t('Image Gen Generating your images')}
        </div>
      </div>
    </div>
  )
}

function SparkleLoader() {
  return (
    <span className='bg-background relative flex size-10 items-center justify-center rounded-2xl shadow-sm'>
      <span className='border-primary/30 absolute inset-0 animate-ping rounded-2xl border' />
      <ImageIcon className='text-primary size-4 animate-pulse' />
    </span>
  )
}
