import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Download, Scissors, Zap, Loader } from 'lucide-react'
import { useVideoAnalysis } from '../hooks/useVideoAnalysis'
import { useVideoTrimmer } from '../hooks/useVideoTrimmer'

export default function VideoEditView({ videoBlob, recordingDuration, videoPlaybackRanges, projectName, onBack }) {
  const analysis = useVideoAnalysis()
  const trimmer = useVideoTrimmer()

  const videoRef = useRef(null)
  const timelineRef = useRef(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [trimmedUrl, setTrimmedUrl] = useState(null)
  const [showTrimmed, setShowTrimmed] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(recordingDuration || 0)
  const [videoReady, setVideoReady] = useState(false)

  // Create object URLs
  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob)
      setOriginalUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [videoBlob])

  useEffect(() => {
    if (trimmer.trimmedBlob) {
      const url = URL.createObjectURL(trimmer.trimmedBlob)
      setTrimmedUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [trimmer.trimmedBlob])

  // Fix WebM duration + track playback time
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const currentSrc = showTrimmed && trimmedUrl ? trimmedUrl : originalUrl
    if (!currentSrc) return

    setVideoReady(false)
    video.src = currentSrc

    const fixDuration = () => {
      if (video.duration === Infinity || isNaN(video.duration)) {
        video.currentTime = 1e10
        video.addEventListener('timeupdate', function onSeek() {
          video.removeEventListener('timeupdate', onSeek)
          video.currentTime = 0
          setVideoDuration(Math.round(video.duration))
          setVideoReady(true)
        }, { once: true })
      } else {
        setVideoDuration(Math.round(video.duration))
        setVideoReady(true)
      }
    }

    video.addEventListener('loadedmetadata', fixDuration, { once: true })
    return () => video.removeEventListener('loadedmetadata', fixDuration)
  }, [showTrimmed, trimmedUrl, originalUrl])

  // Playback time tracking
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTime = () => setPlaybackTime(video.currentTime)
    video.addEventListener('timeupdate', onTime)
    return () => video.removeEventListener('timeupdate', onTime)
  }, [])

  const handleAutoDetect = () => {
    analysis.analyze(videoBlob, videoPlaybackRanges)
  }

  const handleApplyTrim = () => {
    if (analysis.segments) {
      trimmer.trim(videoBlob, analysis.segments)
    }
  }

  // Switch to trimmed view when trimming completes
  useEffect(() => {
    if (trimmer.trimmedBlob) {
      setShowTrimmed(true)
    }
  }, [trimmer.trimmedBlob])

  const handleDownload = (blob, suffix = '') => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    const safeName = (projectName || 'presentation').replace(/[^a-zA-Z0-9]/g, '_')
    a.download = `${safeName}${suffix}_${timestamp}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds) % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const currentDuration = showTrimmed ? (trimmer.trimmedDuration || 0) : recordingDuration
  const savedPercent = analysis.deadTimeTotal > 0
    ? Math.round((analysis.deadTimeTotal / recordingDuration) * 100)
    : 0

  const isProcessing = analysis.isAnalyzing || trimmer.isTrimming
  const hasAnalysis = analysis.segments && analysis.segments.length > 0
  const hasTrimmed = !!trimmer.trimmedBlob
  const noDeadTime = hasAnalysis && analysis.deadTimeTotal === 0

  return (
    <div className="video-edit-container">
      <header className="video-edit-header">
        <button onClick={onBack} className="back-btn" disabled={isProcessing}>
          <ArrowLeft size={20} color="#e0e0e0" />
        </button>
        <h1>Edit Recording</h1>
      </header>

      <div className="video-edit-content">
        {/* Info note — shown before analysis */}
        {!hasAnalysis && !isProcessing && (
          <div className="edit-info-note">
            <p>
              <strong>Auto Detect</strong> scans your recording for dead time — moments where
              nobody is speaking and nothing is changing on screen. These gaps are typically
              caused by latency or pauses between sections.
            </p>
            <p>
              After detection, a timeline shows <span className="info-green">green</span> segments
              (kept) and <span className="info-red">red</span> segments (removed). Click Apply Trim
              to produce a shorter version. Video content (animations, etc.) is always protected.
            </p>
          </div>
        )}

        {/* Version toggle */}
        {hasTrimmed && (
          <div className="edit-version-toggle">
            <button
              className={`version-tab ${!showTrimmed ? 'active' : ''}`}
              onClick={() => setShowTrimmed(false)}
            >
              Original ({formatDuration(recordingDuration)})
            </button>
            <button
              className={`version-tab ${showTrimmed ? 'active' : ''}`}
              onClick={() => setShowTrimmed(true)}
            >
              Trimmed ({formatDuration(trimmer.trimmedDuration)})
            </button>
          </div>
        )}

        {/* Video player */}
        <div className="video-preview-wrapper">
          <video
            ref={videoRef}
            controls={videoReady}
            className="video-preview-player"
            style={{ opacity: videoReady ? 1 : 0 }}
          />
          {!videoReady && (
            <div className="video-preview-placeholder">
              <Loader size={32} className="video-loading-spinner" />
              <p>Loading video...</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        {hasAnalysis && !noDeadTime && (
          <div className="edit-timeline-section">
            <div className="edit-timeline" ref={timelineRef}>
              {analysis.segments.map((seg, i) => {
                const left = (seg.start / recordingDuration) * 100
                const width = ((seg.end - seg.start) / recordingDuration) * 100
                return (
                  <div
                    key={i}
                    className={`timeline-segment ${seg.type}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${seg.type === 'dead' ? 'Dead' : 'Active'}: ${formatDuration(seg.start)} - ${formatDuration(seg.end)}`}
                  />
                )
              })}
              {/* Playhead */}
              {!showTrimmed && videoReady && (
                <div
                  className="timeline-playhead"
                  style={{ left: `${(playbackTime / recordingDuration) * 100}%` }}
                />
              )}
            </div>
            <div className="timeline-labels">
              <span>0:00</span>
              <span>{formatDuration(recordingDuration)}</span>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {isProcessing && (
          <div className="edit-progress-section">
            <div className="edit-progress-bar">
              <div
                className="edit-progress-fill"
                style={{ width: `${analysis.isAnalyzing ? analysis.progress : trimmer.progress}%` }}
              />
            </div>
            <span className="edit-progress-label">
              {analysis.isAnalyzing ? 'Analyzing video...' : 'Trimming video...'}
              {' '}{analysis.isAnalyzing ? analysis.progress : trimmer.progress}%
            </span>
          </div>
        )}

        {/* Stats */}
        {hasAnalysis && !noDeadTime && (
          <div className="edit-stats">
            <span className="edit-stat">
              Dead time: {formatDuration(analysis.deadTimeTotal)}
            </span>
            <span className="edit-stat">
              Trimmed: {formatDuration(recordingDuration - analysis.deadTimeTotal)}
            </span>
            <span className="edit-stat">
              Saved: {savedPercent}%
            </span>
            {hasTrimmed && (
              <span className="edit-stat">
                Size: {formatFileSize(trimmer.trimmedBlob?.size)}
              </span>
            )}
          </div>
        )}

        {/* No dead time message */}
        {noDeadTime && (
          <div className="edit-no-dead-time">
            <p>No dead time detected — your recording is already clean!</p>
          </div>
        )}

        {/* Actions */}
        <div className="edit-actions">
          {!hasAnalysis && (
            <button
              className="video-action-btn primary"
              onClick={handleAutoDetect}
              disabled={isProcessing}
            >
              <Zap size={18} />
              <span>{analysis.isAnalyzing ? 'Analyzing...' : 'Auto Detect'}</span>
            </button>
          )}

          {hasAnalysis && !noDeadTime && !hasTrimmed && (
            <button
              className="video-action-btn trim"
              onClick={handleApplyTrim}
              disabled={isProcessing}
            >
              <Scissors size={18} />
              <span>{trimmer.isTrimming ? 'Trimming...' : 'Apply Trim'}</span>
            </button>
          )}

          {hasTrimmed && (
            <button
              className="video-action-btn primary"
              onClick={() => handleDownload(trimmer.trimmedBlob, '_trimmed')}
            >
              <Download size={18} />
              <span>Download Trimmed</span>
            </button>
          )}

          <button
            className="video-action-btn secondary"
            onClick={() => handleDownload(videoBlob)}
            disabled={isProcessing}
          >
            <Download size={18} />
            <span>Download Original</span>
          </button>

          <button
            className="video-action-btn secondary"
            onClick={onBack}
            disabled={isProcessing}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </div>
      </div>
    </div>
  )
}
