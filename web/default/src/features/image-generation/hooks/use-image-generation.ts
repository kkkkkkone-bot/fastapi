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
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { generateImages, getUserGroups, getUserModels } from '../api'
import {
  getImageModelProfile,
  MAX_REFERENCE_IMAGES,
  MAX_REFERENCE_IMAGE_SIZE,
  resolveImageQuality,
  resolveImageSize,
} from '../constants'
import type {
  GenerationRecord,
  GroupOption,
  ModelOption,
  ReferenceImage,
} from '../types'

export const DEFAULT_MODEL = 'gpt-image-1'
export const DEFAULT_GROUP = 'default'

function createRecordId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useImageGeneration() {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [group, setGroup] = useState(DEFAULT_GROUP)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [resolution, setResolution] = useState('1K')
  const [quality, setQuality] = useState('medium')
  const [count, setCount] = useState(1)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const referenceImagesRef = useRef<ReferenceImage[]>([])
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [history, setHistory] = useState<GenerationRecord[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const modelProfile = useMemo(() => getImageModelProfile(model), [model])

  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
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
      setModel((previousModel) => {
        if (
          previousModel &&
          modelsData.some(
            (option: ModelOption) => option.value === previousModel
          )
        ) {
          return previousModel
        }
        return modelsData[0].value
      })
    }
  }, [modelsData])

  useEffect(() => {
    if (groupsData && groupsData.length > 0) {
      setGroup((previousGroup) => {
        if (
          previousGroup &&
          groupsData.some(
            (option: GroupOption) => option.value === previousGroup
          )
        ) {
          return previousGroup
        }
        return groupsData[0].value
      })
    }
  }, [groupsData])

  useEffect(() => {
    if (!modelProfile.aspectRatios.includes(aspectRatio)) {
      setAspectRatio(modelProfile.aspectRatios[0])
    }
    if (!modelProfile.resolutions.includes(resolution)) {
      setResolution(modelProfile.resolutions[0])
    }
    if (!modelProfile.qualities.includes(quality)) {
      setQuality(modelProfile.qualities[0])
    }
  }, [aspectRatio, modelProfile, quality, resolution])

  useEffect(() => {
    referenceImagesRef.current = referenceImages
  }, [referenceImages])

  useEffect(() => {
    return () => {
      referenceImagesRef.current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl)
      })
    }
  }, [])

  const addReferenceImages = useCallback(
    (files: File[]) => {
      const availableSlots = MAX_REFERENCE_IMAGES - referenceImages.length
      const acceptedFiles = files
        .filter((file) => {
          if (!file.type.startsWith('image/')) {
            toast.error(t('Image Gen Only image files are supported'))
            return false
          }
          if (file.size > MAX_REFERENCE_IMAGE_SIZE) {
            toast.error(t('Image Gen Reference image size limit'))
            return false
          }
          return true
        })
        .slice(0, availableSlots)

      if (files.length > availableSlots) {
        toast.error(t('Image Gen Reference image count limit'))
      }
      if (acceptedFiles.length === 0) return

      const nextImages = acceptedFiles.map((file) => ({
        id: createRecordId(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      setReferenceImages((currentImages) => [...currentImages, ...nextImages])
    },
    [referenceImages.length, t]
  )

  const removeReferenceImage = useCallback((id: string) => {
    setReferenceImages((currentImages) =>
      currentImages.filter((image) => {
        if (image.id === id) URL.revokeObjectURL(image.previewUrl)
        return image.id !== id
      })
    )
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error(t('Image Gen Prompt required'))
      return
    }
    if (!model) {
      toast.error(t('Image Gen Model required'))
      return
    }

    setStatus('loading')
    setErrorMsg('')
    try {
      const response = await generateImages(
        {
          model,
          group,
          prompt: prompt.trim(),
          n: count,
          size: resolveImageSize(model, aspectRatio, resolution),
          quality: resolveImageQuality(model, resolution, quality),
          response_format: 'url',
        },
        referenceImages.map((image) => image.file)
      )
      const images = (response.data ?? []).map((item) => ({
        url: item.url,
        b64_json: item.b64_json,
      }))
      if (images.length === 0) {
        throw new Error(t('Image Gen Empty response'))
      }

      const nextResult = {
        images,
        revisedPrompt: response.data?.[0]?.revised_prompt,
      }
      const record: GenerationRecord = {
        ...nextResult,
        id: createRecordId(),
        createdAt: response.created ? response.created * 1000 : Date.now(),
        prompt: prompt.trim(),
        model,
        aspectRatio,
        resolution,
        quality,
      }
      setHistory((currentHistory) => [record, ...currentHistory])
      setStatus('success')
    } catch (error: unknown) {
      const responseError = error as {
        message?: string
        response?: {
          data?: { message?: string; error?: { message?: string } }
        }
      }
      const message =
        responseError.response?.data?.error?.message ||
        responseError.response?.data?.message ||
        responseError.message ||
        t('Image Gen Generation failed')
      setErrorMsg(message)
      setStatus('error')
      toast.error(message)
    }
  }, [
    aspectRatio,
    count,
    group,
    model,
    prompt,
    quality,
    referenceImages,
    resolution,
    t,
  ])

  const reuseRecord = useCallback((record: GenerationRecord) => {
    setPrompt(record.prompt)
    setModel(record.model)
    setAspectRatio(record.aspectRatio)
    setResolution(record.resolution)
    setQuality(record.quality)
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    setStatus('idle')
    setErrorMsg('')
  }, [])

  return {
    prompt,
    setPrompt,
    model,
    setModel,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
    quality,
    setQuality,
    count,
    setCount,
    referenceImages,
    addReferenceImages,
    removeReferenceImage,
    status,
    history,
    errorMsg,
    models: (modelsData as ModelOption[]) ?? [],
    isLoadingModels,
    modelProfile,
    handleGenerate,
    reuseRecord,
    clearHistory,
  }
}
