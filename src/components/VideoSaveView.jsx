import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Download, Film, Loader, Scissors } from 'lucide-react'

export default function VideoSaveView({ videoBlob, recordingDuration, onBack, onEdit, projectName }) {
  const videoRef = useRef(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob)
      setVideoUrl(url)
      setVideoReady(false)
      return () => URL.revokeObjectURL(url)
    }
  }, [videoBlob])

  // Fix WebM duration metadata: MediaRecorder WebM blobs often have
  // missing/incorrect duration in the header, causing the scrubber to break.
  // Seeking to a large value forces the browser to calculate the real duration.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    const fixDuration = () => {
      if (video.duration === Infinity || isNaN(video.duration)) {
        video.currentTime = 1e10
        video.addEventListener('timeupdate', function onSeek() {
          video.removeEventListener('timeupdate', onSeek)
          video.currentTime = 0
          setVideoReady(true)
        }, { once: true })
      } else {
        setVideoReady(true)
      }
    }

    video.addEventListener('loadedmetadata', fixDuration, { once: true })
    return () => video.removeEventListener('loadedmetadata', fixDuration)
  }, [videoUrl])

  const handleDownload = () => {
    if (!videoUrl) return
    setIsDownloading(true)

    const a = document.createElement('a')
    a.href = videoUrl
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    const safeName = (projectName || 'presentation').replace(/[^a-zA-Z0-9]/g, '_')
    a.download = `${safeName}_${timestamp}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setTimeout(() => setIsDownloading(false), 1000)
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="video-save-container">
      <header className="video-save-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={20} color="#e0e0e0" />
        </button>
        <h1>Recording Complete</h1>
      </header>

      <div className="video-save-content">
        <div className="video-preview-wrapper">
          {videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                controls={videoReady}
                className="video-preview-player"
                style={{ opacity: videoReady ? 1 : 0 }}
              />
              {!videoReady && (
                <div className="video-preview-placeholder">
                  <Loader size={32} className="video-loading-spinner" />
                  <p>Preparing video...</p>
                </div>
              )}
            </>
          ) : (
            <div className="video-preview-placeholder">
              <Film size={48} />
              <p>No recording available</p>
            </div>
          )}
        </div>

        <div className="video-meta">
          {recordingDuration > 0 && (
            <span className="meta-item">Duration: {formatDuration(recordingDuration)}</span>
          )}
          <span className="meta-item">Size: {formatFileSize(videoBlob?.size)}</span>
          <span className="meta-item">Format: WebM</span>
        </div>

        <div className="video-save-actions">
          <button
            className="video-action-btn primary"
            onClick={handleDownload}
            disabled={!videoBlob || isDownloading}
          >
            <Download size={18} />
            <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
          </button>

          <button className="video-action-btn secondary" onClick={onEdit} disabled={!videoBlob}>
            <Scissors size={18} />
            <span>Edit</span>
          </button>

          <button className="video-action-btn secondary" onClick={onBack}>
            <ArrowLeft size={18} />
            <span>Back to Project</span>
          </button>
        </div>
      </div>
    </div>
  )
}
