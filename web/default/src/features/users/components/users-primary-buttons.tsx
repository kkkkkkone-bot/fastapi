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
import { getRouteApi } from '@tanstack/react-router'
import { Download, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { downloadUsersCsv } from '../lib/user-export'
import { useUsers } from './users-provider'

const route = getRouteApi('/_authenticated/users/')

export function UsersPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = useUsers()
  const [isExporting, setIsExporting] = useState(false)

  // 始终订阅当前 URL 的过滤条件，保持导出范围与列表一致
  const search = route.useSearch() as {
    filter?: string
    group?: string
    role?: string[] | string
    status?: string[] | string
  }

  const handleCreate = () => {
    setCurrentRow(null)
    setOpen('create')
  }

  const pickFirst = (v: string[] | string | undefined): string => {
    if (Array.isArray(v)) return v[0] ?? ''
    return v ?? ''
  }

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      await downloadUsersCsv({
        params: {
          keyword: search.filter ?? '',
          group: search.group ?? '',
          role: pickFirst(search.role),
          status: pickFirst(search.status),
        },
        successMessage: t('Export started. The file will download shortly.'),
        errorMessage: t('Failed to export users'),
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className='flex items-center gap-2'>
      <Button size='sm' onClick={handleCreate}>
        <Plus className='h-4 w-4' />
        {t('Add User')}
      </Button>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              size='sm'
              variant='outline'
              onClick={handleExport}
              disabled={isExporting}
              aria-label={t('Export')}
            />
          }
        >
          <Download className='h-4 w-4' />
          <span className='hidden sm:inline'>
            {isExporting ? t('Exporting...') : t('Export')}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {t(
              'Export the current filtered user list as a CSV file for analysis reports.'
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
