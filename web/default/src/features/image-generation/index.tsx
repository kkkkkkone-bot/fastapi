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
import { ImageIcon, WandSparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

import { GenerationHistory } from './components/generation-history'
import { GenerationWorkbench } from './components/generation-workbench'
import { useImageGeneration } from './hooks/use-image-generation'

export function ImageGeneration() {
  const { t } = useTranslation()
  const controller = useImageGeneration()

  return (
    <div className='bg-muted/10 min-h-full overflow-y-auto lg:h-full lg:min-h-0 lg:overflow-hidden'>
      <div className='mx-auto flex min-h-full w-full max-w-[1440px] flex-col px-4 py-5 sm:px-6 sm:py-7 lg:h-full lg:min-h-0 lg:px-8'>
        <header className='mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <Badge variant='outline' className='bg-background/70 mb-3 gap-1.5'>
              <WandSparkles className='text-primary' />
              {t('Image Gen Creative studio')}
            </Badge>
            <h1 className='flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl'>
              <span className='bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl shadow-sm'>
                <ImageIcon className='size-4' />
              </span>
              {t('Image Generation')}
            </h1>
            <p className='text-muted-foreground mt-2 max-w-2xl text-sm leading-6'>
              {t('Image Gen Page description')}
            </p>
          </div>
        </header>

        <div className='grid items-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch xl:gap-8'>
          <div className='lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-2'>
            <GenerationWorkbench controller={controller} />
          </div>
          <GenerationHistory
            history={controller.history}
            status={controller.status}
            errorMessage={controller.errorMsg}
            onReuse={controller.reuseRecord}
            onClear={controller.clearHistory}
          />
        </div>
      </div>
    </div>
  )
}
