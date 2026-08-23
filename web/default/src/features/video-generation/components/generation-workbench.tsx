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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrencyFromUSD } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { useSystemConfigStore } from '@/stores/system-config-store'

import {
  getVideoModeLabel,
  getVideoModelVersionLabel,
  VIDEO_ASPECT_RATIOS,
} from '../constants'
import type { useVideoGeneration } from '../hooks/use-video-generation'
import { ReferenceImageUploader } from './reference-image-uploader'

interface GenerationWorkbenchProps {
  controller: ReturnType<typeof useVideoGeneration>
}

export function GenerationWorkbench({ controller }: GenerationWorkbenchProps) {
  const { t } = useTranslation()
  // Keep the estimate reactive when the administrator changes the display unit.
  useSystemConfigStore((state) => state.config.currency)
  const isBusy = ['submitting', 'queued', 'in_progress'].includes(
    controller.status
  )
  const hasValidModelVersion =
    controller.availableModelVersions.length === 0 ||
    controller.availableModelVersions.includes(controller.modelVersion)
  const canGenerate =
    controller.prompt.trim().length > 0 &&
    controller.model.length > 0 &&
    hasValidModelVersion &&
    !isBusy
  const ratios = VIDEO_ASPECT_RATIOS.filter((option) =>
    controller.availableAspectRatios.includes(option.value)
  )
  const estimatedPrice =
    controller.estimatedPriceUSD === undefined
      ? undefined
      : formatCurrencyFromUSD(controller.estimatedPriceUSD, {
          digitsLarge: 4,
          digitsSmall: 4,
          abbreviate: false,
        })

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

        {controller.maxReferenceImages > 0 && (
          <ReferenceImageUploader
            images={controller.referenceImages}
            maxImages={controller.maxReferenceImages}
            onAdd={controller.addReferenceImages}
            onRemove={controller.removeReferenceImage}
          />
        )}

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

        <section className='space-y-2.5'>
          <Label>{t('Video Gen Output settings')}</Label>
          <div className='grid gap-3 sm:grid-cols-3'>
            {controller.availableModelVersions.length > 0 && (
              <div className='space-y-1.5'>
                <Label className='text-muted-foreground text-xs'>
                  {t('Video Gen Model version')}
                </Label>
                <Select
                  value={controller.modelVersion}
                  onValueChange={(value) => {
                    if (value) controller.setModelVersion(value)
                  }}
                >
                  <SelectTrigger className='h-10 w-full rounded-xl'>
                    <SelectValue
                      placeholder={t('Video Gen Select model version')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {controller.availableModelVersions.map((version) => (
                      <SelectItem key={version} value={version}>
                        {getVideoModelVersionLabel(version)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {controller.availableQualities.length > 1 && (
              <div className='space-y-1.5'>
                <Label className='text-muted-foreground text-xs'>
                  {t('Video Gen Quality')}
                </Label>
                <Select
                  value={controller.quality}
                  onValueChange={(value) => {
                    if (value) controller.setQuality(value)
                  }}
                >
                  <SelectTrigger className='h-10 w-full rounded-xl'>
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
              </div>
            )}

            <div className='space-y-1.5'>
              <Label className='text-muted-foreground text-xs'>
                {t('Video Gen Duration')}
              </Label>
              <Select
                value={String(controller.duration)}
                onValueChange={(value) => {
                  if (value) controller.setDuration(Number(value))
                }}
              >
                <SelectTrigger className='h-10 w-full rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {controller.availableDurations.map((seconds) => (
                    <SelectItem key={seconds} value={String(seconds)}>
                      {t('Video Gen Seconds', { count: seconds })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {controller.availableModes.length > 0 && (
              <div className='space-y-1.5'>
                <Label className='text-muted-foreground text-xs'>
                  {t('Video Gen Mode')}
                </Label>
                <Select
                  value={controller.mode}
                  onValueChange={(value) => {
                    if (value) controller.setMode(value)
                  }}
                >
                  <SelectTrigger className='h-10 w-full rounded-xl'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {controller.availableModes.map((mode) => (
                      <SelectItem
                        key={mode}
                        value={mode}
                        disabled={
                          controller.model === 'kling-video' &&
                          controller.modelVersion === 'kling-v2-6' &&
                          controller.audioEnabled &&
                          mode === 'std'
                        }
                      >
                        {t(`Video Gen Mode ${getVideoModeLabel(mode)}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </section>

        {controller.supportsAudio && (
          <section className='bg-muted/25 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3'>
            <div>
              <Label htmlFor='video-generation-audio'>
                {t('Video Gen Generate audio')}
              </Label>
              <p className='text-muted-foreground mt-0.5 text-xs leading-5'>
                {controller.model === 'kling-video' &&
                controller.modelVersion === 'kling-v2-6'
                  ? t('Video Gen Kling audio pro note')
                  : t('Video Gen Audio billing note')}
              </p>
            </div>
            <Switch
              id='video-generation-audio'
              checked={controller.audioEnabled}
              onCheckedChange={controller.setAudioEnabled}
            />
          </section>
        )}

        {controller.audioAlwaysOn && (
          <section className='bg-muted/25 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3'>
            <div>
              <Label>{t('Video Gen Native audio')}</Label>
              <p className='text-muted-foreground mt-0.5 text-xs leading-5'>
                {t('Video Gen Native audio note')}
              </p>
            </div>
            <span className='bg-primary/10 text-primary shrink-0 rounded-full px-3 py-1 text-xs font-medium'>
              {t('Video Gen Audio included')}
            </span>
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
        <div className='flex items-center justify-end gap-3'>
          {estimatedPrice && (
            <div
              className='border-primary/15 bg-primary/5 flex h-11 items-center gap-2 rounded-xl border px-3'
              aria-live='polite'
            >
              <span className='text-muted-foreground text-xs font-medium'>
                {t('Video Gen Estimated this request')}
              </span>
              <span className='text-primary font-mono text-sm font-semibold tabular-nums'>
                {estimatedPrice}
              </span>
            </div>
          )}
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
    </div>
  )
}
