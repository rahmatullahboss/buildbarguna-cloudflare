/**
 * Browser-side image compression using Canvas API
 * No npm packages needed — pure browser native APIs
 */

export interface CompressOptions {
  maxWidth?: number   // default 1200px
  maxHeight?: number  // default 1200px
  quality?: number    // 0-1, default 0.82
  mimeType?: string   // default 'image/webp' (best compression)
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<{ blob: Blob; dataUrl: string; originalSize: number; compressedSize: number }> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    mimeType = 'image/webp'
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      // Draw to canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // Export as WebP (best compression) or fallback to JPEG
      const outputMime = canvas.toDataURL('image/webp').startsWith('data:image/webp')
        ? mimeType
        : 'image/jpeg'

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Image compression failed')); return }
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve({
              blob,
              dataUrl: reader.result as string,
              originalSize: file.size,
              compressedSize: blob.size
            })
          }
          reader.readAsDataURL(blob)
        },
        outputMime,
        quality
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
