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
import { type Table } from '@tanstack/react-table'
import { Power, PowerOff, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { Button } from '@/components/ui/button'

import { type User } from '../types'
import { batchManageUsers } from '../api'
import { useUsers } from './users-provider'

interface DataTableBulkActionsProps {
  table: Table<User>
}

export function DataTableBulkActions({ table }: DataTableBulkActionsProps) {
  const { t } = useTranslation()
  const { triggerRefresh } = useUsers()
  const [working, setWorking] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const ids = selectedRows.map((row) => row.original.id)
  const run = async (action: 'enable' | 'disable' | 'delete') => {
    if (action === 'delete' && !window.confirm(t('Delete selected users permanently?'))) return
    setWorking(true)
    try {
      const result = await batchManageUsers(ids, action)
      if (!result.success) throw new Error(result.message || t('Operation failed'))
      toast.success(t(action === 'delete' ? 'Selected users deleted' : action === 'disable' ? 'Selected users disabled' : 'Selected users enabled'))
      table.resetRowSelection()
      triggerRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Operation failed'))
    } finally {
      setWorking(false)
    }
  }
  return <BulkActionsToolbar table={table} entityName='user'>
    <Button variant='outline' size='sm' disabled={working} onClick={() => run('disable')}><PowerOff />{t('Disable')}</Button>
    <Button variant='outline' size='sm' disabled={working} onClick={() => run('enable')}><Power />{t('Enable')}</Button>
    <Button variant='destructive' size='sm' disabled={working} onClick={() => run('delete')}><Trash2 />{t('Delete')}</Button>
  </BulkActionsToolbar>
}
