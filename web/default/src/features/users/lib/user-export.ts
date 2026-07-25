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

import { toast } from 'sonner'

import { exportUsers } from '../api'
import type { SearchUsersParams } from '../types'

/**
 * 从 Content-Disposition 头中解析文件名。
 * 支持 RFC 5987 (filename*=UTF-8''...) 与传统 filename="..."
 */
function pickFilename(
  contentDisposition: string | undefined,
  fallback: string
): string {
  if (!contentDisposition) return fallback
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }
  const plainMatch = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition)
  if (plainMatch?.[1]) return plainMatch[1]
  return fallback
}

function buildFallbackFilename(): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14)
  return `users_export_${ts}.csv`
}

/**
 * 通过下载 Blob 的方式保存 CSV 文件。
 */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // 异步释放 URL，避免浏览器尚未开始下载
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 当后端返回 JSON 错误时，尝试从 blob 中解析 message。
 */
async function extractErrorMessage(
  blob: Blob,
  fallback: string
): Promise<string> {
  try {
    const text = await blob.text()
    const data = JSON.parse(text) as { message?: string; success?: boolean }
    if (data?.message) return data.message
  } catch {
    /* ignore */
  }
  return fallback
}

export interface ExportUsersOptions {
  /** 当前过滤条件，与 searchUsers 保持一致 */
  params: SearchUsersParams
  /** 操作成功后的提示文案（已 i18n） */
  successMessage: string
  /** 操作失败时的回退提示文案（已 i18n） */
  errorMessage: string
}

/**
 * 调用后端导出接口并触发浏览器下载。
 * 返回是否成功。
 */
export async function downloadUsersCsv(
  options: ExportUsersOptions
): Promise<boolean> {
  try {
    const { blob, headers } = await exportUsers(options.params)
    const contentDisposition = headers['content-disposition']
    const filename = pickFilename(
      contentDisposition,
      buildFallbackFilename()
    )
    saveBlob(blob, filename)
    toast.success(options.successMessage)
    return true
  } catch (err) {
    // axios 错误：尝试从 response.data (Blob) 解析 JSON message
    const responseBlob = (err as { response?: { data?: Blob } })?.response
      ?.data
    if (responseBlob instanceof Blob) {
      const message = await extractErrorMessage(
        responseBlob,
        options.errorMessage
      )
      toast.error(message)
      return false
    }
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ||
      (err as Error)?.message ||
      options.errorMessage
    toast.error(message)
    return false
  }
}
