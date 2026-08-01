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
import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  generateImages,
  getUserGroups,
  getUserModels,
} from '../api'
import type { GenerationResult, GroupOption, ModelOption } from './types'

export const SIZE_OPTIONS = [
  '1024x1024',
  '1792x1024',
  '1024x1792',
  '512x512',
  '256x256',
]

export const QUALITY_OPTIONS = ['standard', 'hd']

export const DEFAULT_MODEL = 'gpt-image-1'
export const DEFAULT_GROUP = 'default'

export function useImageGeneration() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [group, setGroup] = useState(DEFAULT_GROUP)
  const [size, setSize] = useState(SIZE_OPTIONS[0])
  const [quality, setQuality] = useState(QUALITY_OPTIONS[0])
  const [count, setCount] = useState(1)
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const {
    data: modelsData,
    isLoading: isLoadingModels,
  } = useQuery({
    queryKey: ['image-gen-models', group],
    queryFn: () => getUserModels(group),
    enabled: group !== '',
  })

  const { data: groupsData } = useQuery({
    queryKey: ['image-gen-groups'],
    queryFn: getUserGroups,
  })

  useEffect(() => {
    if (modelsData && modelsData.length > 0) {
      setModel((prev) => {
        if (prev && modelsData.some((m: ModelOption) => m.value === prev)) {
          return prev
        }
        return modelsData[0].value
      })
    }
  }, [modelsData])

  useEffect(() => {
    if (groupsData && groupsData.length > 0) {
      setGroup((prev) => {
        if (prev && groupsData.some((g: GroupOption) => g.value === prev)) {
          return prev
        }
        return groupsData[0].value
      })
    }
  }, [groupsData])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('请输入提示词')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    setResult(null)
    try {
      const res = await generateImages({
        model,
        group,
        prompt: prompt.trim(),
        n: count,
        size,
        quality,
        response_format: 'url',
      })
      const images = (res.data ?? []).map((item) => ({
        url: item.url,
        b64_json: item.b64_json,
      }))
      setResult({
        images,
        revisedPrompt: res.data?.[0]?.revised_prompt,
      })
      setStatus('success')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        '生成失败'
      setErrorMsg(msg)
      setStatus('error')
      toast.error(msg)
    }
  }, [prompt, model, group, count, size, quality])

  return {
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
    models: (modelsData as ModelOption[]) ?? [],
    groups: (groupsData as GroupOption[]) ?? [],
    isLoadingModels,
    handleGenerate,
  }
}
