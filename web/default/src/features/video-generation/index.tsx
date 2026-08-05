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
import { Clapperboard, WandSparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

import { GenerationHistory } from './components/generation-history'
import { GenerationWorkbench } from './components/generation-workbench'
import { useVideoGeneration } from './hooks/use-video-generation'

export function VideoGeneration() {
  const { t } = useTranslation()
  const controller = useVideoGeneration()

  return (
    <div className='bg-muted/10 min-h-full overflow-y-auto'>
      <div className='mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8'>
        <header className='mb-6'>
          <Badge variant='outline' className='bg-background/70 mb-3 gap-1.5'>
            <WandSparkles className='text-primary' />
            {t('Video Gen Creative studio')}
          </Badge>
          <h1 className='flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl'>
            <span className='bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl shadow-sm'>
              <Clapperboard className='size-4' />
            </span>
            {t('Video Generation')}
          </h1>
          <p className='text-muted-foreground mt-2 max-w-2xl text-sm leading-6'>
            {t('Video Gen Page description')}
          </p>
        </header>

        <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:gap-8'>
          <GenerationWorkbench controller={controller} />
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
