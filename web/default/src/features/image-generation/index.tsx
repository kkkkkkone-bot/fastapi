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
import { useTranslation } from 'react-i18next'
import { Download, ImageIcon, Loader2, Sparkles } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useImageGeneration } from './hooks/use-image-generation'
import {
  QUALITY_OPTIONS,
  SIZE_OPTIONS,
} from './hooks/use-image-generation'

export function ImageGeneration() {
  const { t } = useTranslation()
  const {
    prompt,
    setPrompt,
    model,
    setModel,
    group,
    setGroup,
    size,
    setSize,
    quality,
    setQuality,
    count,
    setCount,
    status,
    result,
    errorMsg,
    models,
    groups,
    isLoadingModels,
    handleGenerate,
  } = useImageGeneration()

  return (
    <div className='flex size-full min-h-0 flex-col overflow-hidden lg:flex-row'>
      {/* Left: form */}
      <div className='flex w-full flex-col gap-4 overflow-y-auto border-b border-border p-4 lg:w-[380px] lg:border-b-0 lg:border-r'>
        <div className='flex items-center gap-2'>
          <ImageIcon className='size-5 text-primary' />
          <h2 className='text-lg font-semibold'>{t('Image Generation')}</h2>
        </div>

        <div className='flex flex-col gap-2'>
          <Label htmlFor='img-prompt'>{t('Prompt')}</Label>
          <Textarea
            id='img-prompt'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('Image Gen Describe')}
            className='min-h-28 resize-y'
          />
        </div>

        <div className='flex flex-col gap-2'>
          <Label>{t('Model')}</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder={t('Image Gen Select model')} />
            </SelectTrigger>
            <SelectContent>
              {models.length === 0 && (
                <SelectItem value='__none' disabled>
                  {isLoadingModels ? t('Loading...') : t('No models available')}
                </SelectItem>
              )}
              {models.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-2'>
          <Label>{t('Group')}</Label>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger>
              <SelectValue placeholder={t('Image Gen Select group')} />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div className='flex flex-col gap-2'>
            <Label>{t('Image Gen Size')}</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col gap-2'>
            <Label>{t('Image Gen Quality')}</Label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map((q) => (
                  <SelectItem key={q} value={q}>
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='flex flex-col gap-2'>
          <Label htmlFor='img-count'>{t('Image Gen Number of images')}</Label>
          <Input
            id='img-count'
            type='number'
            min={1}
            max={4}
            value={count}
            onChange={(e) => {
              const v = Number(e.target.value)
              setCount(Math.max(1, Math.min(4, Number.isNaN(v) ? 1 : v)))
            }}
          />
        </div>

        <Button
          className='mt-2 w-full'
          onClick={handleGenerate}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Sparkles className='size-4' />
          )}
          {status === 'loading' ? t('Image Gen Generating') : t('Image Gen Generate')}
        </Button>
      </div>

      {/* Right: result */}
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4'>
        {status === 'idle' && (
          <div className='flex size-full items-center justify-center'>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <ImageIcon className='size-10' />
                </EmptyMedia>
                <EmptyTitle>{t('Image Gen No images yet')}</EmptyTitle>
                <EmptyDescription>
                  {t('Image Gen Enter a prompt')}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}

        {status === 'loading' && (
          <div className='flex size-full flex-col items-center justify-center gap-3'>
            <Loader2 className='size-8 animate-spin text-primary' />
            <p className='text-sm text-muted-foreground'>
              {t('Image Gen Generating your images')}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className='flex size-full items-center justify-center'>
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t('Image Gen Generation failed')}</EmptyTitle>
                <EmptyDescription>{errorMsg}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}

        {status === 'success' && result && (
          <div className='flex flex-col gap-4'>
            {result.revisedPrompt && (
              <Card>
                <CardContent className='p-3 text-sm text-muted-foreground'>
                  <span className='font-medium text-foreground'>
                    {t('Image Gen Revised prompt')}:{' '}
                  </span>
                  {result.revisedPrompt}
                </CardContent>
              </Card>
            )}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {result.images.map((img, idx) => {
                const src = img.url ?? `data:image/png;base64,${img.b64_json}`
                return (
                  <Card key={idx} className='overflow-hidden'>
                    <CardContent className='p-0'>
                      <img
                        src={src}
                        alt={`${t('Generated image')} ${idx + 1}`}
                        loading='lazy'
                        className='aspect-square w-full object-cover'
                      />
                    </CardContent>
                    <div className='flex justify-end p-2'>
                      <a
                        href={src}
                        download
                        target='_blank'
                        rel='noreferrer'
                        className={buttonVariants({
                          variant: 'outline',
                          size: 'sm',
                          className: 'gap-1',
                        })}
                      >
                        <Download className='size-4' />
                        {t('Image Gen Download')}
                      </a>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
