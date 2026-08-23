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
import { GenerationHistory } from './components/generation-history'
import { GenerationWorkbench } from './components/generation-workbench'
import { useImageGeneration } from './hooks/use-image-generation'

export function ImageGeneration() {
  const controller = useImageGeneration()

  return (
    <div className='bg-muted/10 min-h-full overflow-y-auto lg:h-full lg:min-h-0 lg:overflow-hidden'>
      <div className='mx-auto flex min-h-full w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-5 lg:h-full lg:min-h-0 lg:px-8'>
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
