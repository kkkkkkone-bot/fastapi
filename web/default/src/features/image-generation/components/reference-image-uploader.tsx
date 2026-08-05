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
import { ImagePlus, Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { MAX_REFERENCE_IMAGES } from '../constants'
import type { ReferenceImage } from '../types'

interface ReferenceImageUploaderProps {
  images: ReferenceImage[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
}

export function ReferenceImageUploader(props: ReferenceImageUploaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const canAddMore = props.images.length < MAX_REFERENCE_IMAGES

  const openFilePicker = () => {
    if (canAddMore) inputRef.current?.click()
  }

  return (
    <section className='space-y-2.5'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-medium'>
            {t('Image Gen Reference images')}
          </h3>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {t('Image Gen Reference images description')}
          </p>
        </div>
        <span className='text-muted-foreground text-xs tabular-nums'>
          {props.images.length}/{MAX_REFERENCE_IMAGES}
        </span>
      </div>

      <input
        ref={inputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp,image/gif'
        multiple
        className='sr-only'
        onChange={(event) => {
          props.onAdd([...(event.target.files ?? [])])
          event.target.value = ''
        }}
      />

      {props.images.length === 0 ? (
        <button
          type='button'
          onClick={openFilePicker}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            props.onAdd([...event.dataTransfer.files])
          }}
          className={cn(
            'group flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/25 px-4 text-center transition-colors outline-none',
            'hover:border-primary/50 hover:bg-primary/5 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15',
            isDragging && 'border-primary bg-primary/10'
          )}
        >
          <span className='bg-background flex size-9 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:-translate-y-0.5'>
            <ImagePlus className='text-primary size-4' />
          </span>
          <span className='text-sm font-medium'>
            {t('Image Gen Add reference')}
          </span>
          <span className='text-muted-foreground text-xs'>
            {t('Image Gen Drop reference images')}
          </span>
        </button>
      ) : (
        <div className='grid grid-cols-3 gap-2 sm:grid-cols-5'>
          {props.images.map((image) => (
            <div
              key={image.id}
              className='group bg-muted relative aspect-square overflow-hidden rounded-xl border'
            >
              <img
                src={image.previewUrl}
                alt={image.file.name}
                className='size-full object-cover'
              />
              <Button
                type='button'
                variant='secondary'
                size='icon-xs'
                aria-label={t('Image Gen Remove reference')}
                className='absolute top-1 right-1 opacity-90 shadow-sm sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100'
                onClick={() => props.onRemove(image.id)}
              >
                <X />
              </Button>
            </div>
          ))}
          {canAddMore && (
            <button
              type='button'
              onClick={openFilePicker}
              className='text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:ring-primary/15 flex aspect-square items-center justify-center rounded-xl border border-dashed transition-colors focus-visible:ring-3 focus-visible:outline-none'
              aria-label={t('Image Gen Add reference')}
            >
              <Plus className='size-5' />
            </button>
          )}
        </div>
      )}
    </section>
  )
}
