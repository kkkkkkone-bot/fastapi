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
import { Loader2, Scan, Sparkles } from 'lucide-react'
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

import { ASPECT_RATIO_OPTIONS, CUSTOM_ASPECT_RATIO } from '../constants'
import type { useImageGeneration } from '../hooks/use-image-generation'
import { ReferenceImageUploader } from './reference-image-uploader'

interface GenerationWorkbenchProps {
  controller: ReturnType<typeof useImageGeneration>
}

export function GenerationWorkbench(props: GenerationWorkbenchProps) {
  const { t } = useTranslation()
  const controller = props.controller
  const availableRatios = ASPECT_RATIO_OPTIONS.filter((option) =>
    controller.modelProfile.aspectRatios.includes(option.value)
  )
  const canGenerate =
    controller.prompt.trim().length > 0 &&
    controller.model.length > 0 &&
    controller.status !== 'loading'

  return (
    <div className='bg-card overflow-hidden rounded-3xl border shadow-sm'>
      <div className='space-y-6 p-4 sm:p-6'>
        <ReferenceImageUploader
          images={controller.referenceImages}
          onAdd={controller.addReferenceImages}
          onRemove={controller.removeReferenceImage}
        />

        <section className='space-y-2.5'>
          <div className='flex items-center justify-between gap-3'>
            <Label htmlFor='image-generation-prompt'>{t('Prompt')}</Label>
            <span className='text-muted-foreground text-xs tabular-nums'>
              {controller.prompt.length}/4000
            </span>
          </div>
          <Textarea
            id='image-generation-prompt'
            value={controller.prompt}
            maxLength={4000}
            onChange={(event) => controller.setPrompt(event.target.value)}
            placeholder={t('Image Gen Prompt placeholder')}
            className='border-border/80 bg-background focus-visible:ring-primary/15 min-h-36 resize-y rounded-2xl px-4 py-3 text-sm leading-6 shadow-none'
          />
        </section>

        <section className='space-y-2.5'>
          <Label>{t('Model')}</Label>
          <Select
            value={controller.model}
            onValueChange={(value) => {
              if (value) {
                controller.setModel(value)
              }
            }}
          >
            <SelectTrigger className='h-11 w-full rounded-xl'>
              <SelectValue placeholder={t('Image Gen Select model')} />
            </SelectTrigger>
            <SelectContent>
              {controller.models.length === 0 && (
                <SelectItem value='__none' disabled>
                  {controller.isLoadingModels
                    ? t('Loading...')
                    : t('Image Gen No image models')}
                </SelectItem>
              )}
              {controller.models.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className='space-y-2.5'>
          <Label>{t('Image Gen Aspect ratio')}</Label>
          <div className='grid grid-cols-4 gap-2'>
            {availableRatios.map((option) => {
              const selected = controller.aspectRatio === option.value
              return (
                <button
                  key={option.value}
                  type='button'
                  aria-pressed={selected}
                  onClick={() => controller.setAspectRatio(option.value)}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border bg-background text-xs font-medium text-muted-foreground transition-all outline-none',
                    'hover:border-primary/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15',
                    selected &&
                      'border-primary bg-primary/5 text-primary shadow-[inset_0_0_0_1px_var(--primary)]'
                  )}
                >
                  {option.value === CUSTOM_ASPECT_RATIO ? (
                    <Scan className='size-5' aria-hidden='true' />
                  ) : (
                    <span
                      className='rounded-[3px] border-2 border-current'
                      style={{ width: option.width, height: option.height }}
                      aria-hidden='true'
                    />
                  )}
                  {option.value === CUSTOM_ASPECT_RATIO
                    ? t('Image Gen Custom')
                    : option.label}
                </button>
              )
            })}
          </div>
          {controller.aspectRatio === CUSTOM_ASPECT_RATIO && (
            <p className='text-muted-foreground text-xs leading-5'>
              {t('Image Gen Custom ratio hint')}
            </p>
          )}
        </section>

        <div className='grid gap-5 sm:grid-cols-2'>
          <OptionButtons
            label={t('Image Gen Resolution')}
            options={controller.modelProfile.resolutions}
            value={controller.resolution}
            onChange={controller.setResolution}
          />
          <OptionButtons
            label={t('Image Gen Quality')}
            options={controller.modelProfile.qualities}
            value={controller.quality}
            onChange={controller.setQuality}
          />
        </div>

        <OptionButtons
          label={t('Image Gen Number of images')}
          options={['1', '2', '3', '4']}
          value={String(controller.count)}
          onChange={(value) => controller.setCount(Number(value))}
        />

      </div>

      <div className='bg-muted/20 flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
        <div>
          <p className='text-sm font-medium'>
            {t('Image Gen Ready to create')}
          </p>
          <p className='text-muted-foreground text-xs'>
            {t('Image Gen Billing and refund note')}
          </p>
        </div>
        <Button
          size='lg'
          className='h-11 min-w-40 rounded-xl px-5 shadow-sm'
          disabled={!canGenerate}
          onClick={controller.handleGenerate}
        >
          {controller.status === 'loading' ? (
            <Loader2 className='animate-spin' />
          ) : (
            <Sparkles />
          )}
          {controller.status === 'loading'
            ? t('Image Gen Generating')
            : t('Image Gen Generate count', { count: controller.count })}
        </Button>
      </div>
    </div>
  )
}

interface OptionButtonsProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}

function OptionButtons(props: OptionButtonsProps) {
  return (
    <section className='space-y-2.5'>
      <Label>{props.label}</Label>
      <div className='flex flex-wrap gap-2'>
        {props.options.map((option) => (
          <button
            key={option}
            type='button'
            aria-pressed={props.value === option}
            onClick={() => props.onChange(option)}
            className={cn(
              'min-w-14 rounded-lg border bg-background px-3 py-2 text-xs font-medium capitalize text-muted-foreground transition-colors outline-none',
              'hover:border-primary/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/15',
              props.value === option &&
                'border-primary bg-primary/5 text-primary'
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  )
}
