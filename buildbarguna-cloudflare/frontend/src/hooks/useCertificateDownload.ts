import { useState } from 'react'
import { getToken } from '../lib/api'
import { downloadShareCertificate, type ShareCertificateData } from '../lib/certificateGenerator'

interface UseCertificateDownloadReturn {
  downloading: boolean
  error: string | null
  downloadCertificate: (purchaseId: number, certificateId?: string) => Promise<void>
  clearError: () => void
}

/**
 * Reusable hook for downloading share certificates
 * Generates PDF entirely in the browser — zero server CPU cost
 */
export function useCertificateDownload(): UseCertificateDownloadReturn {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadCertificate = async (purchaseId: number, _certificateId?: string): Promise<void> => {
    setDownloading(true)
    setError(null)

    try {
      const token = getToken()
      if (!token) {
        setError('সেশন expire হয়েছে। আবার লগইন করুন।')
        return
      }

      // Fetch certificate data as JSON from the preview endpoint
      const res = await fetch(`/api/shares/certificate/${purchaseId}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Preview data fetch failed')
      }

      const json = await res.json() as { data: ShareCertificateData }

      // Generate PDF entirely in the browser
      await downloadShareCertificate(json.data)
    } catch (err: any) {
      console.error('Certificate generation error:', err)
      setError(err.message || 'সার্টিফিকেট তৈরি ব্যর্থ হয়েছে')
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
