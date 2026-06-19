import { useEffect, useRef, useState } from 'react'
import QrScannerLib from 'qr-scanner'
import { X } from 'lucide-react'

interface QrScannerProps {
  onScan: (slug: string) => void
  onClose: () => void
}

function extractSlug(raw: string): string | null {
  try {
    const url = new URL(raw)
    const match = url.pathname.match(/\/r\/([^/]+)/)
    return match ? match[1] : null
  } catch {
    // not a URL — treat the raw scanned text as the slug itself
    return raw.trim() || null
  }
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScannerLib | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!videoRef.current) return

    const scanner = new QrScannerLib(
      videoRef.current,
      (result) => {
        const slug = extractSlug(result.data)
        if (slug) {
          scanner.stop()
          onScan(slug)
        }
      },
      { highlightScanRegion: true, highlightCodeOutline: true },
    )
    scannerRef.current = scanner

    scanner.start().catch(() => {
      setError('Camera access is required to scan a QR code.')
    })

    return () => {
      scanner.stop()
      scanner.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-lg font-semibold">Scan QR Code</h2>
        <button onClick={onClose} className="p-2">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" />
      </div>

      {error && (
        <div className="p-4 text-center text-sm text-white bg-red-600">
          {error}
        </div>
      )}

      <p className="p-4 text-center text-sm text-white/70">
        Point your camera at a restaurant's QR code
      </p>
    </div>
  )
}
