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

import { useAuthStore } from '@/stores/auth-store'

import {
  fetchVideoTask,
  getVideoContentUrl,
  getVideoGroups,
  getVideoModels,
  submitVideoTask,
} from '../api'
import {
  getVideoAspectRatios,
  getVideoDurations,
  MAX_VIDEO_REFERENCE_IMAGES,
  MAX_VIDEO_REFERENCE_IMAGE_SIZE,
  resolveVideoSize,
  VIDEO_POLL_INTERVAL_MS,
} from '../constants'
import {
  clearVideoGenerationHistory,
  loadVideoGenerationHistory,
  saveVideoGenerationHistory,
} from '../history-storage'
import type {
  VideoGenerationRecord,
  VideoGroupOption,
  VideoModelOption,
  VideoReferenceImage,
  VideoTaskResponse,
  VideoTaskStatus,
} from '../types'

type WorkspaceStatus =
  | 'idle'
  | 'submitting'
  | 'queued'
  | 'in_progress'
  | 'success'
  | 'error'

const DEFAULT_GROUP = 'default'

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () =>
      reject(reader.error ?? new Error('read file failed'))
    )
    reader.readAsDataURL(file)
  })
}

function normalizeStatus(status?: string): VideoTaskStatus {
  const normalized = status?.toLowerCase()
  if (['completed', 'success', 'succeeded'].includes(normalized ?? '')) {
    return 'completed'
  }
  if (
    ['failed', 'failure', 'error', 'cancelled', 'canceled'].includes(
      normalized ?? ''
    )
  ) {
    return 'failed'
  }
  if (['in_progress', 'processing', 'running'].includes(normalized ?? '')) {
    return 'in_progress'
  }
  return 'queued'
}

function toWorkspaceStatus(taskStatus: VideoTaskStatus): WorkspaceStatus {
  if (taskStatus === 'completed') return 'success'
  if (taskStatus === 'failed') return 'error'
  return taskStatus
}

function taskErrorMessage(task: VideoTaskResponse): string | undefined {
  if (typeof task.error === 'string') return task.error
  return task.error?.message
}

function errorMessage(error: unknown, fallback: string): string {
  const responseError = error as {
    name?: string
    message?: string
    response?: { data?: { message?: string; error?: { message?: string } } }
  }
  return (
    responseError.response?.data?.error?.message ||
    responseError.response?.data?.message ||
    responseError.message ||
    fallback
  )
}

function waitForNextPoll(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(resolve, VIDEO_POLL_INTERVAL_MS)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true }
    )
  })
}

function loadStoredHistory(userId?: number): VideoGenerationRecord[] {
  return loadVideoGenerationHistory(userId).map((record) =>
    record.status === 'completed'
      ? { ...record, videoUrl: getVideoContentUrl(record.id) }
      : record
  )
}

export function useVideoGeneration() {
  const { t } = useTranslation()
  const userId = useAuthStore((state) => state.auth.user?.id)
  const [prompt, setPrompt] = useState('')
  const [group, setGroup] = useState(DEFAULT_GROUP)
  const [model, setModel] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [duration, setDuration] = useState(15)
  const [referenceImages, setReferenceImages] = useState<VideoReferenceImage[]>(
    []
  )
  const [status, setStatus] = useState<WorkspaceStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState<VideoGenerationRecord[]>(() =>
    loadStoredHistory(userId)
  )
  const referencesRef = useRef<VideoReferenceImage[]>([])
  const requestAbortRef = useRef<AbortController | null>(null)
  const restoredTaskIdsRef = useRef(new Set<string>())

  const { data: groupsData } = useQuery({
    queryKey: ['video-gen-groups'],
    queryFn: getVideoGroups,
  })
  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ['video-gen-models', group],
    queryFn: () => getVideoModels(group),
    enabled: group.length > 0,
  })

  const availableAspectRatios = useMemo(
    () => getVideoAspectRatios(model),
    [model]
  )
  const availableDurations = useMemo(() => getVideoDurations(model), [model])

  useEffect(() => {
    if (!groupsData?.length) return
    setGroup((current) =>
      groupsData.some((option: VideoGroupOption) => option.value === current)
        ? current
        : groupsData[0].value
    )
  }, [groupsData])

  useEffect(() => {
    if (!modelsData?.length) {
      setModel('')
      return
    }
    setModel((current) =>
      modelsData.some((option: VideoModelOption) => option.value === current)
        ? current
        : modelsData[0].value
    )
  }, [modelsData])

  useEffect(() => {
    if (!availableAspectRatios.includes(aspectRatio)) {
      setAspectRatio(availableAspectRatios[0])
    }
    if (!availableDurations.includes(duration)) {
      setDuration(availableDurations[0])
    }
  }, [aspectRatio, availableAspectRatios, availableDurations, duration])

  useEffect(() => {
    referencesRef.current = referenceImages
  }, [referenceImages])

  useEffect(() => {
    const storedHistory = loadStoredHistory(userId)
    restoredTaskIdsRef.current = new Set(
      storedHistory
        .filter((record) => ['queued', 'in_progress'].includes(record.status))
        .map((record) => record.id)
    )
    setHistory(storedHistory)
  }, [userId])

  useEffect(() => {
    return () => {
      requestAbortRef.current?.abort()
      referencesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      )
    }
  }, [])

  const addReferenceImages = useCallback(
    (files: File[]) => {
      const availableSlots = MAX_VIDEO_REFERENCE_IMAGES - referenceImages.length
      const acceptedFiles = files
        .filter((file) => {
          if (!file.type.startsWith('image/')) {
            toast.error(t('Video Gen Only image files are supported'))
            return false
          }
          if (file.size > MAX_VIDEO_REFERENCE_IMAGE_SIZE) {
            toast.error(t('Video Gen Reference image size limit'))
            return false
          }
          return true
        })
        .slice(0, availableSlots)

      if (files.length > availableSlots) {
        toast.error(t('Video Gen Reference image count limit'))
      }
      if (!acceptedFiles.length) return
      setReferenceImages((current) => [
        ...current,
        ...acceptedFiles.map((file) => ({
          id: createLocalId(),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ])
    },
    [referenceImages.length, t]
  )

  const removeReferenceImage = useCallback((id: string) => {
    setReferenceImages((current) =>
      current.filter((image) => {
        if (image.id === id) URL.revokeObjectURL(image.previewUrl)
        return image.id !== id
      })
    )
  }, [])

  const applyTaskUpdate = useCallback(
    (taskId: string, task: VideoTaskResponse): VideoTaskStatus => {
      const taskStatus = normalizeStatus(task.status)
      const taskProgress =
        taskStatus === 'completed'
          ? 100
          : Math.max(0, Math.min(100, task.progress ?? 0))
      const videoUrl =
        task.metadata?.url ||
        task.url ||
        (taskStatus === 'completed' ? getVideoContentUrl(taskId) : undefined)
      const taskError = taskErrorMessage(task)

      if (!['queued', 'in_progress'].includes(taskStatus)) {
        restoredTaskIdsRef.current.delete(taskId)
      }
      setProgress(taskProgress)
      setStatus(toWorkspaceStatus(taskStatus))
      setHistory((current) => {
        const nextHistory = current.map((record) =>
          record.id === taskId
            ? {
                ...record,
                status: taskStatus,
                progress: taskProgress,
                videoUrl,
                error: taskError,
              }
            : record
        )
        saveVideoGenerationHistory(userId, nextHistory)
        return nextHistory
      })
      return taskStatus
    },
    [userId]
  )

  const pendingTaskIds = useMemo(
    () =>
      history
        .filter(
          (record) =>
            restoredTaskIdsRef.current.has(record.id) &&
            ['queued', 'in_progress'].includes(record.status)
        )
        .map((record) => record.id)
        .join(','),
    [history]
  )

  useEffect(() => {
    if (!pendingTaskIds) return

    const abortController = new AbortController()
    const taskIds = pendingTaskIds.split(',')

    async function restorePendingTasks() {
      while (!abortController.signal.aborted) {
        let hasPendingTask = false

        await Promise.all(
          taskIds.map(async (taskId) => {
            try {
              const task = await fetchVideoTask(taskId, abortController.signal)
              const taskStatus = applyTaskUpdate(taskId, task)
              if (['queued', 'in_progress'].includes(taskStatus)) {
                hasPendingTask = true
              }
            } catch (error: unknown) {
              if ((error as { name?: string }).name !== 'AbortError') {
                hasPendingTask = true
              }
            }
          })
        )

        if (!hasPendingTask || abortController.signal.aborted) return

        try {
          await waitForNextPoll(abortController.signal)
        } catch {
          return
        }
      }
    }

    void restorePendingTasks()
    return () => abortController.abort()
  }, [applyTaskUpdate, pendingTaskIds])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error(t('Video Gen Prompt required'))
      return
    }
    if (!model) {
      toast.error(t('Video Gen Model required'))
      return
    }

    requestAbortRef.current?.abort()
    const abortController = new AbortController()
    requestAbortRef.current = abortController
    setStatus('submitting')
    setProgress(0)
    setErrorMsg('')
    let taskId = ''

    try {
      const imageDataUrls = await Promise.all(
        referenceImages.map((image) => fileToDataUrl(image.file))
      )
      const response = await submitVideoTask(
        {
          model,
          group,
          prompt: prompt.trim(),
          duration,
          seconds: String(duration),
          size: resolveVideoSize(aspectRatio),
          image: imageDataUrls[0],
          images: imageDataUrls.length ? imageDataUrls : undefined,
        },
        referenceImages.map((image) => image.file),
        abortController.signal
      )
      taskId = response.id || response.task_id || ''
      if (!taskId) throw new Error(t('Video Gen Missing task id'))

      const record: VideoGenerationRecord = {
        id: taskId,
        createdAt: response.created_at
          ? response.created_at * 1000
          : Date.now(),
        prompt: prompt.trim(),
        model,
        aspectRatio,
        duration,
        status: normalizeStatus(response.status),
        progress: response.progress ?? 0,
      }
      setHistory((current) => {
        const nextHistory = [
          record,
          ...current.filter((item) => item.id !== taskId),
        ]
        saveVideoGenerationHistory(userId, nextHistory)
        return nextHistory
      })
      setStatus('queued')

      while (!abortController.signal.aborted) {
        const task = await fetchVideoTask(taskId, abortController.signal)
        const taskStatus = applyTaskUpdate(taskId, task)
        if (taskStatus === 'completed') {
          toast.success(t('Video Gen Generation completed'))
          return
        }
        if (taskStatus === 'failed') {
          const message =
            taskErrorMessage(task) || t('Video Gen Generation failed')
          setErrorMsg(message)
          toast.error(message)
          return
        }
        await waitForNextPoll(abortController.signal)
      }
    } catch (error: unknown) {
      const namedError = error as { name?: string }
      if (namedError.name === 'AbortError') return
      const message = errorMessage(error, t('Video Gen Generation failed'))
      setStatus('error')
      setErrorMsg(message)
      if (taskId) {
        setHistory((current) => {
          const nextHistory: VideoGenerationRecord[] = current.map((record) =>
            record.id === taskId
              ? { ...record, status: 'failed', error: message }
              : record
          )
          saveVideoGenerationHistory(userId, nextHistory)
          return nextHistory
        })
      }
      toast.error(message)
    }
  }, [
    applyTaskUpdate,
    aspectRatio,
    duration,
    group,
    model,
    prompt,
    referenceImages,
    t,
    userId,
  ])

  const reuseRecord = useCallback((record: VideoGenerationRecord) => {
    setPrompt(record.prompt)
    setModel(record.model)
    setAspectRatio(record.aspectRatio)
    setDuration(record.duration)
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    restoredTaskIdsRef.current.clear()
    clearVideoGenerationHistory(userId)
    setErrorMsg('')
    if (!['submitting', 'queued', 'in_progress'].includes(status)) {
      setStatus('idle')
    }
  }, [status, userId])

  return {
    prompt,
    setPrompt,
    model,
    setModel,
    aspectRatio,
    setAspectRatio,
    duration,
    setDuration,
    referenceImages,
    addReferenceImages,
    removeReferenceImage,
    status,
    progress,
    errorMsg,
    history,
    models: (modelsData as VideoModelOption[]) ?? [],
    isLoadingModels,
    availableAspectRatios,
    availableDurations,
    handleGenerate,
    reuseRecord,
    clearHistory,
  }
}
