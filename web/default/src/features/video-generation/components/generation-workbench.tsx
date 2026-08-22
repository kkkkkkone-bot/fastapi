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
import { Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { VIDEO_ASPECT_RATIOS } from '../constants'
import type { useVideoGeneration } from '../hooks/use-video-generation'
import { ReferenceImageUploader } from './reference-image-uploader'

interface GenerationWorkbenchProps {
  controller: ReturnType<typeof useVideoGeneration>
}

export function GenerationWorkbench({ controller }: GenerationWorkbenchProps) {
  const { t } = useTranslation()
  const isBusy = ['submitting', 'queued', 'in_progress'].includes(
    controller.status
  )
  const canGenerate =
    controller.prompt.trim().length > 0 &&
    controller.model.length > 0 &&
    !isBusy
  const ratios = VIDEO_ASPECT_RATIOS.filter((option) =>
    controller.availableAspectRatios.includes(option.value)
  )

  return (
    <div className='bg-card overflow-hidden rounded-3xl border shadow-sm'>
      <div className='space-y-6 p-4 sm:p-6'>
        <section className='space-y-2.5'>
          <div className='flex items-center justify-between gap-3'>
            <Label htmlFor='video-generation-prompt'>{t('Prompt')}</Label>
            <span className='text-muted-foreground text-xs tabular-nums'>
              {controller.prompt.length}/4000
            </span>
          </div>
          <Textarea
            id='video-generation-prompt'
            value={controller.prompt}
            maxLength={4000}
            onChange={(event) => controller.setPrompt(event.target.value)}
            placeholder={t('Video Gen Prompt placeholder')}
            className='border-border/80 bg-background focus-visible:ring-primary/15 min-h-32 resize-y rounded-2xl px-4 py-3 text-sm leading-6 shadow-none'
          />
        </section>

        <ReferenceImageUploader
          images={controller.referenceImages}
          onAdd={controller.addReferenceImages}
          onRemove={controller.removeReferenceImage}
        />

        <section className='space-y-2.5'>
          <Label>{t('Model')}</Label>
          <Select
            value={controller.model}
            onValueChange={(value) => {
              if (value) controller.setModel(value)
            }}
          >
            <SelectTrigger className='h-11 w-full rounded-xl'>
              <SelectValue placeholder={t('Video Gen Select model')} />
            </SelectTrigger>
            <SelectContent>
              {controller.models.length === 0 && (
                <SelectItem value='__none' disabled>
                  {controller.isLoadingModels
                    ? t('Loading...')
                    : t('Video Gen No video models')}
                </SelectItem>
              )}
              {controller.models.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!controller.isLoadingModels && controller.models.length === 0 && (
            <p className='text-muted-foreground text-xs leading-5'>
              {t('Video Gen Configure model hint')}
            </p>
          )}
        </section>

        {controller.availableModelVersions.length > 0 && (
          <section className='space-y-2.5'>
            <Label>{t('Video Gen Model version')}</Label>
            <Select
              value={controller.modelVersion}
              onValueChange={(value) => {
                if (value) controller.setModelVersion(value)
              }}
            >
              <SelectTrigger className='h-11 w-full rounded-xl'>
                <SelectValue placeholder={t('Video Gen Select model version')} />
              </SelectTrigger>
              <SelectContent>
                {controller.availableModelVersions.map((version) => (
                  <SelectItem key={version} value={version}>
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        )}

        {controller.availableQualities.length > 0 && (
          <section className='space-y-2.5'>
            <Label>{t('Video Gen Quality')}</Label>
            <Select
              value={controller.quality}
              onValueChange={(value) => {
                if (value) controller.setQuality(value)
              }}
            >
              <SelectTrigger className='h-11 w-full rounded-xl'>
                <SelectValue placeholder={t('Video Gen Select quality')} />
              </SelectTrigger>
              <SelectContent>
                {controller.availableQualities.map((q) => (
                  <SelectItem key={q} value={q}>
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        )}

        <section className='space-y-2.5'>
          <Label>{t('Video Gen Aspect ratio')}</Label>
          <div className='grid grid-cols-3 gap-2'>
            {ratios.map((option) => {
              const selected = controller.aspectRatio === option.value
              return (
                <button
                  key={option.value}
                  type='button'
                  aria-pressed={selected}
                  onClick={() => controller.setAspectRatio(option.value)}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border bg-background text-xs font-medium text-muted-foreground transition-all outline-none',
                    'hover:border-primary/40 hover:text-foreground focus-visible:ring-primary/15 focus-visible:ring-3',
                    selected &&
                      'border-primary bg-primary/5 text-primary shadow-[inset_0_0_0_1px_var(--primary)]'
                  )}
                >
                  <span
                    className='rounded-[3px] border-2 border-current'
                    style={{ width: option.width, height: option.height }}
                    aria-hidden='true'
                  />
                  {option.label}
                </button>
              )
            })}
          </div>
        </section>

        <section className='space-y-2.5'>
          <Label>{t('Video Gen Duration')}</Label>
          <div className='flex flex-wrap gap-2'>
            {controller.availableDurations.map((seconds) => (
              <button
                key={seconds}
                type='button'
                aria-pressed={controller.duration === seconds}
                onClick={() => controller.setDuration(seconds)}
                className={cn(
                  'min-w-16 rounded-lg border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-colors outline-none',
                  'hover:border-primary/40 hover:text-foreground focus-visible:ring-primary/15 focus-visible:ring-3',
                  controller.duration === seconds &&
                    'border-primary bg-primary/5 text-primary'
                )}
              >
                {t('Video Gen Seconds', { count: seconds })}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className='bg-muted/20 flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
        <div>
          <p className='text-sm font-medium'>
            {t('Video Gen Ready to create')}
          </p>
          <p className='text-muted-foreground text-xs'>
            {t('Video Gen Billing and polling note')}
          </p>
        </div>
        <Button
          size='lg'
          className='h-11 min-w-40 rounded-xl px-5 shadow-sm'
          disabled={!canGenerate}
          onClick={controller.handleGenerate}
        >
          {isBusy ? <Loader2 className='animate-spin' /> : <Sparkles />}
          {isBusy ? t('Video Gen Processing') : t('Video Gen Generate')}
        </Button>
      </div>
    </div>
  )
}
