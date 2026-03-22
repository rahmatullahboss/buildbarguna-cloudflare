import { useState, useRef } from 'react'
import { Upload, X, ImageIcon, Loader2, CheckCircle } from 'lucide-react'
import { compressImage, formatBytes } from '../lib/imageCompress'
import { getToken } from '../lib/apiToken'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
}

type UploadState = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'

export default function ImageUpload({ value, onChange, label = 'ছবি আপলোড করুন' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [preview, setPreview] = useState<string>(value)
  const [info, setInfo] = useState<{ original: number; compressed: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('শুধুমাত্র ছবি ফাইল সমর্থিত')
      return
    }

    setErrorMsg('')
    setState('compressing')
    setInfo(null)

    try {
      // Step 1: Compress in browser
      const compressed = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
        mimeType: 'image/webp'
      })

      setPreview(compressed.dataUrl)
      setInfo({ original: compressed.originalSize, compressed: compressed.compressedSize })
      setState('uploading')

      // Step 2: Upload compressed blob to Worker → R2
      const formData = new FormData()
      formData.append('file', new File([compressed.blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))

      const token = getToken()
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      })

      const json = await res.json() as { success: boolean; data?: { url: string }; error?: string }
      if (!json.success || !json.data?.url) {
        throw new Error(json.error ?? 'Upload failed')
      }

      onChange(json.data.url)
      setState('done')
    } catch (e: any) {
      setState('error')
      setErrorMsg(e.message ?? 'আপলোড ব্যর্থ হয়েছে')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleClear() {
    setState('idle')
    setPreview('')
    setInfo(null)
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const isLoading = state === 'compressing' || state === 'uploading'

  return (
    <div className="space-y-2">
      <label className="label">{label}</label>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={isLoading ? -1 : 0}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !isLoading && inputRef.current?.click()}
        onKeyDown={e => {
          if (!isLoading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none
          ${isLoading ? 'cursor-not-allowed opacity-70' : 'hover:border-primary-400 hover:bg-primary-50'}
          ${state === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}
          ${state === 'done' ? 'border-green-300 bg-green-50' : ''}`}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
            {!isLoading && (
              <button
                type="button"
                aria-label="ছবি মুছে ফেলুন"
                onClick={e => { e.stopPropagation(); handleClear() }}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                <X size={16} />
              </button>
            )}
            {state === 'done' && (
              <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1 shadow-lg">
                <CheckCircle size={16} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            {isLoading ? (
              <Loader2 size={36} className="text-primary-500 animate-spin mb-3" />
            ) : (
              <div className="bg-gray-100 rounded-full p-4 mb-3">
                <ImageIcon size={28} className="text-gray-400" />
              </div>
            )}
            <p className="text-sm font-medium text-gray-700">
              {state === 'compressing' ? 'কম্প্রেস হচ্ছে...' :
               state === 'uploading' ? 'আপলোড হচ্ছে...' :
               'ছবি টেনে আনুন বা ক্লিক করুন'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isLoading ? 'অপেক্ষা করুন...' : 'JPG, PNG, WebP • ব্রাউজারেই compress হবে'}
            </p>
          </div>
        )}
      </div>

      {/* Compression info */}
      {info && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-red-400 line-through">{formatBytes(info.original)}</span>
          <span>→</span>
          <span className="text-green-600 font-semibold">{formatBytes(info.compressed)}</span>
          <span className="ml-1 text-green-600">
            ({Math.round((1 - info.compressed / info.original) * 100)}% ছোট)
          </span>
        </div>
      )}

      {/* URL input fallback */}
      <div>
        <p className="text-xs text-gray-400 mb-1">অথবা সরাসরি URL দিন:</p>
        <input
          className="input text-sm"
          type="url"
          placeholder="https://..."
          value={value}
          onChange={e => { onChange(e.target.value); setPreview(e.target.value); setState('idle') }}
        />
      </div>

      {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
