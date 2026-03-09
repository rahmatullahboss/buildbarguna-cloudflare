import { useState } from 'react'
import { getToken } from '../lib/api'

interface UseCertificateDownloadReturn {
  downloading: boolean
  error: string | null
  downloadCertificate: (purchaseId: number, certificateId?: string) => Promise<void>
  clearError: () => void
}

/**
 * Reusable hook for downloading share certificates
 * Provides consistent download logic with loading state and error handling
 */
export function useCertificateDownload(): UseCertificateDownloadReturn {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadCertificate = async (purchaseId: number, certificateId?: string): Promise<void> => {
    setDownloading(true)
    setError(null)

    try {
      const token = getToken()
      if (!token) {
        setError('সেশন expire হয়েছে। আবার লগইন করুন।')
        return
      }

      const response = await fetch(`/api/shares/certificate/${purchaseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `BBI_Share_Certificate_${certificateId || purchaseId}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Download error:', err)
      setError(err.message || 'ডাউনলোড ব্যর্থ হয়েছে')
    } finally {
      setDownloading(false)
    }
  }

  const clearError = () => setError(null)

  return {
    downloading,
    error,
    downloadCertificate,
    clearError
  }
}
