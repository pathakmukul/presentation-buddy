import { useState, useRef, useCallback, useEffect } from 'react'

const CANVAS_WIDTH = 1920
const CANVAS_HEIGHT = 1080

/**
 * Hook for recording presentation by painting content onto a hidden canvas.
 * No getDisplayMedia — no prompts, no browser chrome, stays fullscreen.
 *
 * Paints the selected theme (dots/lines/light/none) directly onto the canvas
 * so themes are baked into the recorded video file.
 *
 * @param {Object} options
 * @param {React.RefObject} options.agentAudioElementRef - Ref to agent's <audio> element
 * @param {React.RefObject} options.presentationRef - Ref to the .presentation-mode DOM element
 * @param {string} options.selectedPattern - Active theme pattern id ('none'|'dots'|'lines'|'light')
 * @returns {Object} Recording controls and state
 */
export function useRecording({ agentAudioElementRef, presentationRef, selectedPattern }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [error, setError] = useState(null)

  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const micStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const durationIntervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const stoppingRef = useRef(false)
  const animationFrameRef = useRef(null)

  // Track when presented videos are playing (for edit/trim protection)
  const videoPlaybackRangesRef = useRef([])
  const videoPlayingRef = useRef(false) // is a video currently on screen?
  // Create the hidden canvas once
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    canvas.style.display = 'none'
    document.body.appendChild(canvas)
    canvasRef.current = canvas

    return () => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
      }
    }
  }, [])

  // ─── Theme painting helpers ───

  /**
   * Paint dot grid pattern onto canvas.
   * Replicates CSS: radial-gradient(circle, #333 1px, transparent 1px) at 20x20px, opacity 0.7
   */
  function paintDotsPattern(ctx) {
    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.fillStyle = '#333333'
    const spacing = 20
    for (let x = spacing; x < CANVAS_WIDTH; x += spacing) {
      for (let y = spacing; y < CANVAS_HEIGHT; y += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  /**
   * Paint lines pattern by copying the live .pattern-lines canvas from the DOM.
   * The LinesPattern component in PresentationPatterns.jsx already animates
   * its own canvas — we just drawImage() it onto the recording canvas each frame.
   */
  function paintLinesPattern(ctx, container) {
    const linesCanvas = container?.querySelector('canvas.pattern-lines')
    if (linesCanvas && linesCanvas.width > 0) {
      ctx.drawImage(linesCanvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }
  }

  // ─── Content painting ───

  /**
   * Paint the current presentation state onto the hidden canvas.
   * Reads the DOM from presentationRef to find what's currently displayed.
   * Paints theme background + pattern first, then content on top.
   */
  const paintFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const isLight = selectedPattern === 'light'

    // 1. Paint theme background
    ctx.fillStyle = isLight ? '#f5f5f5' : '#000000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const container = presentationRef?.current

    // 2. Paint pattern on top of background (behind content)
    if (selectedPattern === 'dots') {
      paintDotsPattern(ctx)
    } else if (selectedPattern === 'lines') {
      paintLinesPattern(ctx, container)
    }

    // 3. Paint content
    if (!container) return

    // Check for video being displayed — and track playback time ranges
    const video = container.querySelector('video.presented-media')
    const videoVisible = video && video.readyState >= 2 && video.videoWidth > 0
    if (videoVisible) {
      drawMediaCentered(ctx, video, video.videoWidth, video.videoHeight)
      // Track: video just appeared → record start time
      if (!videoPlayingRef.current && startTimeRef.current) {
        videoPlayingRef.current = true
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        videoPlaybackRangesRef.current.push({ start: elapsed, end: null })
      }
      return
    } else if (videoPlayingRef.current) {
      // Video just disappeared → record end time
      videoPlayingRef.current = false
      const ranges = videoPlaybackRangesRef.current
      if (ranges.length > 0 && ranges[ranges.length - 1].end === null) {
        ranges[ranges.length - 1].end = (Date.now() - startTimeRef.current) / 1000
      }
    }

    // Check for image being displayed
    const img = container.querySelector('img.presented-media')
    if (img && img.naturalWidth > 0) {
      drawMediaCentered(ctx, img, img.naturalWidth, img.naturalHeight)
      return
    }

    // Check for text content (presented-text or section-background)
    const textEl = container.querySelector('.presented-text') || container.querySelector('.section-background')
    if (textEl) {
      drawTextContent(ctx, textEl, isLight)
      return
    }
  }, [presentationRef, selectedPattern])

  /**
   * Draw an image or video frame centered and fitted within the canvas,
   * maintaining aspect ratio (object-fit: contain behavior).
   */
  function drawMediaCentered(ctx, source, sourceWidth, sourceHeight) {
    const scale = Math.min(
      (CANVAS_WIDTH - 80) / sourceWidth,
      (CANVAS_HEIGHT - 80) / sourceHeight
    )
    const w = sourceWidth * scale
    const h = sourceHeight * scale
    const x = (CANVAS_WIDTH - w) / 2
    const y = (CANVAS_HEIGHT - h) / 2

    // Draw rounded rect clip for the media (matches border-radius: 12px in CSS)
    ctx.save()
    roundedRect(ctx, x, y, w, h, 12)
    ctx.clip()
    ctx.drawImage(source, x, y, w, h)
    ctx.restore()
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  /**
   * Draw text content onto the canvas by reading DOM text nodes.
   * Uses theme-aware colors: light theme gets dark text, dark themes get light text.
   */
  function drawTextContent(ctx, textEl, isLight) {
    const titleColor = isLight ? '#1a1a1a' : '#e0e0e0'
    const bodyColor = isLight ? '#333333' : '#cccccc'
    const bulletDotColor = '#007aff'

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    let yPos = CANVAS_HEIGHT * 0.3

    // Title
    const titleEl = textEl.querySelector('.text-title, .section-bg-title')
    if (titleEl) {
      ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.fillStyle = titleColor
      const lines = wrapText(ctx, titleEl.textContent.trim(), CANVAS_WIDTH * 0.8)
      lines.forEach(line => {
        ctx.fillText(line, CANVAS_WIDTH / 2, yPos)
        yPos += 80
      })
      yPos += 30
    }

    // Body text
    const bodyEl = textEl.querySelector('.text-body')
    if (bodyEl) {
      ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.fillStyle = bodyColor
      const lines = wrapText(ctx, bodyEl.textContent.trim(), CANVAS_WIDTH * 0.75)
      lines.forEach(line => {
        ctx.fillText(line, CANVAS_WIDTH / 2, yPos)
        yPos += 48
      })
      yPos += 20
    }

    // Bullet points
    const pointsEl = textEl.querySelector('.text-points, .section-bg-points')
    if (pointsEl) {
      ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      const startX = CANVAS_WIDTH * 0.18
      const maxWidth = CANVAS_WIDTH * 0.64

      const items = pointsEl.querySelectorAll('li')
      items.forEach(li => {
        // Bullet dot
        ctx.fillStyle = bulletDotColor
        ctx.font = 'bold 28px sans-serif'
        ctx.fillText('•', startX, yPos)

        // Point text
        ctx.fillStyle = bodyColor
        ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        const lines = wrapText(ctx, li.textContent.trim(), maxWidth)
        lines.forEach((line, i) => {
          ctx.fillText(line, startX + 40, yPos + i * 40)
        })
        yPos += Math.max(lines.length, 1) * 40 + 20
      })
    }
  }

  /**
   * Word-wrap text to fit within maxWidth.
   */
  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ')
    const lines = []
    let currentLine = ''

    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    if (currentLine) lines.push(currentLine)

    return lines.length > 0 ? lines : ['']
  }

  /**
   * Render loop — paints frames onto the hidden canvas at ~30fps.
   */
  const startRenderLoop = useCallback(() => {
    let lastFrame = 0
    const frameInterval = 1000 / 30 // 30fps

    const render = (timestamp) => {
      if (timestamp - lastFrame >= frameInterval) {
        paintFrame()
        lastFrame = timestamp
      }
      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [paintFrame])

  const stopRenderLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const cleanupStreams = useCallback(() => {
    stopRenderLoop()
if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }, [stopRenderLoop])

  const stopRecording = useCallback(() => {
    if (stoppingRef.current) return
    stoppingRef.current = true

    // Close any open video playback range
    if (videoPlayingRef.current && startTimeRef.current) {
      videoPlayingRef.current = false
      const ranges = videoPlaybackRangesRef.current
      if (ranges.length > 0 && ranges[ranges.length - 1].end === null) {
        ranges[ranges.length - 1].end = (Date.now() - startTimeRef.current) / 1000
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }, [])

  /**
   * Start recording. Accepts a pre-acquired mic stream so that the
   * browser permission prompt happens BEFORE entering fullscreen.
   * @param {MediaStream} [micStream] - Pre-acquired mic stream from getUserMedia
   */
  const startRecording = useCallback(async (micStream) => {
    try {
      setError(null)
      setRecordedBlob(null)
      setRecordingDuration(0)
      chunksRef.current = []
      stoppingRef.current = false
      videoPlaybackRangesRef.current = []
      videoPlayingRef.current = false

      const canvas = canvasRef.current
      if (!canvas) throw new Error('Recording canvas not initialized')

      // 1. Start render loop — paints presentation to hidden canvas
      startRenderLoop()

      // 2. Get canvas video stream at 30fps
      const canvasStream = canvas.captureStream(30)

      // 3. Use the pre-acquired mic stream (permission was granted before fullscreen)
      if (micStream) {
        micStreamRef.current = micStream
      }

      // 4. Mix audio via Web Audio API
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const destination = audioContext.createMediaStreamDestination()

      if (micStream) {
        const micSource = audioContext.createMediaStreamSource(micStream)
        micSource.connect(destination)
      }

      // Add agent audio to mix
      const agentAudioEl = agentAudioElementRef?.current
      if (agentAudioEl) {
        try {
          const agentStream = agentAudioEl.captureStream
            ? agentAudioEl.captureStream()
            : agentAudioEl.mozCaptureStream
              ? agentAudioEl.mozCaptureStream()
              : null

          if (agentStream && agentStream.getAudioTracks().length > 0) {
            const agentSource = audioContext.createMediaStreamSource(agentStream)
            agentSource.connect(destination)
          }
        } catch (agentErr) {
          console.warn('Could not capture agent audio:', agentErr)
        }
      }

      // 5. Combine canvas video + mixed audio
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ])

      // 6. Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm'

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000
      })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        cleanupStreams()
        stoppingRef.current = false
      }

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error)
        setError('Recording failed: ' + (event.error?.message || 'Unknown error'))
        cleanupStreams()
        setIsRecording(false)
        stoppingRef.current = false
      }

      recorder.start(1000)
      setIsRecording(true)
      startTimeRef.current = Date.now()

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)

    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Failed to start recording: ' + err.message)
      cleanupStreams()
      setIsRecording(false)
      stoppingRef.current = false
    }
  }, [agentAudioElementRef, startRenderLoop, cleanupStreams])

  const clearRecording = useCallback(() => {
    setRecordedBlob(null)
    setRecordingDuration(0)
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStreams()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [cleanupStreams])

  return {
    isRecording,
    recordedBlob,
    recordingDuration,
    videoPlaybackRanges: videoPlaybackRangesRef.current,
    error,
    startRecording,
    stopRecording,
    clearRecording
  }
}
