import { useState, useCallback, useRef } from 'react'

/**
 * Analyzes a video blob to find "dead" segments where both
 * audio is silent AND visuals are static. These can be trimmed out.
 */
export function useVideoAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [segments, setSegments] = useState(null)
  const [deadTimeTotal, setDeadTimeTotal] = useState(0)
  const cancelledRef = useRef(false)

  const reset = useCallback(() => {
    setIsAnalyzing(false)
    setProgress(0)
    setSegments(null)
    setDeadTimeTotal(0)
    cancelledRef.current = false
  }, [])

  /**
   * Detect silent ranges from audio PCM data.
   * Returns array of { start, end } in seconds.
   */
  const detectSilence = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new AudioContext()

    let audioBuffer
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    } catch (err) {
      console.warn('Could not decode audio, treating entire video as non-silent:', err)
      audioContext.close()
      return []
    }

    const sampleRate = audioBuffer.sampleRate
    const channelData = audioBuffer.getChannelData(0)
    const windowSize = Math.floor(sampleRate * 0.1) // 100ms windows
    const totalWindows = Math.floor(channelData.length / windowSize)
    const threshold = 0.01

    const silentWindows = []

    for (let i = 0; i < totalWindows; i++) {
      const start = i * windowSize
      let sumSquares = 0
      for (let j = start; j < start + windowSize; j++) {
        sumSquares += channelData[j] * channelData[j]
      }
      const rms = Math.sqrt(sumSquares / windowSize)
      silentWindows.push(rms < threshold)
    }

    audioContext.close()

    // Build silence ranges (merge consecutive silent windows)
    const ranges = []
    let rangeStart = null

    for (let i = 0; i < silentWindows.length; i++) {
      if (silentWindows[i]) {
        if (rangeStart === null) rangeStart = i * 0.1
      } else {
        if (rangeStart !== null) {
          const rangeEnd = i * 0.1
          if (rangeEnd - rangeStart >= 2.0) {
            ranges.push({ start: rangeStart, end: rangeEnd })
          }
          rangeStart = null
        }
      }
    }
    // Close trailing range
    if (rangeStart !== null) {
      const rangeEnd = totalWindows * 0.1
      if (rangeEnd - rangeStart >= 2.0) {
        ranges.push({ start: rangeStart, end: rangeEnd })
      }
    }

    return ranges
  }

  /**
   * Detect visually static ranges by comparing video frames.
   * Returns array of { start, end } in seconds.
   */
  const detectStaticFrames = (blob, duration) => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true

      const canvas = document.createElement('canvas')
      const W = 320
      const H = 180
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      const url = URL.createObjectURL(blob)
      video.src = url

      const stepSize = 0.5 // sample every 500ms
      const times = []
      for (let t = 0; t <= duration; t += stepSize) {
        times.push(t)
      }

      let prevData = null
      const staticWindows = [] // boolean per step
      let idx = 0

      const processNext = () => {
        if (cancelledRef.current) {
          cleanup()
          resolve([])
          return
        }

        if (idx >= times.length) {
          cleanup()
          resolve(buildStaticRanges(staticWindows, stepSize))
          return
        }

        video.currentTime = times[idx]
      }

      const onSeeked = () => {
        ctx.drawImage(video, 0, 0, W, H)
        const imageData = ctx.getImageData(0, 0, W, H)
        const data = imageData.data

        if (prevData) {
          let diff = 0
          const totalPixels = W * H
          for (let i = 0; i < data.length; i += 4) {
            diff += Math.abs(data[i] - prevData[i])       // R
            diff += Math.abs(data[i + 1] - prevData[i + 1]) // G
            diff += Math.abs(data[i + 2] - prevData[i + 2]) // B
          }
          const avgDiff = diff / (totalPixels * 3 * 255)
          staticWindows.push(avgDiff < 0.005)
        } else {
          staticWindows.push(false) // first frame is always "active"
        }

        prevData = new Uint8ClampedArray(data)
        idx++

        // Update progress (visual analysis is 50-100% of total)
        const visualProgress = Math.floor((idx / times.length) * 50)
        setProgress(50 + visualProgress)

        processNext()
      }

      const cleanup = () => {
        video.removeEventListener('seeked', onSeeked)
        URL.revokeObjectURL(url)
      }

      video.addEventListener('seeked', onSeeked)
      video.addEventListener('loadedmetadata', () => processNext(), { once: true })
    })
  }

  /**
   * Build static ranges from boolean array.
   */
  const buildStaticRanges = (staticWindows, stepSize) => {
    const ranges = []
    let rangeStart = null

    for (let i = 0; i < staticWindows.length; i++) {
      if (staticWindows[i]) {
        if (rangeStart === null) rangeStart = i * stepSize
      } else {
        if (rangeStart !== null) {
          const rangeEnd = i * stepSize
          if (rangeEnd - rangeStart >= 2.0) {
            ranges.push({ start: rangeStart, end: rangeEnd })
          }
          rangeStart = null
        }
      }
    }
    if (rangeStart !== null) {
      const rangeEnd = staticWindows.length * stepSize
      if (rangeEnd - rangeStart >= 2.0) {
        ranges.push({ start: rangeStart, end: rangeEnd })
      }
    }

    return ranges
  }

  /**
   * Find intersection of silence ranges and static ranges.
   * Returns overlap segments where BOTH conditions are true,
   * excluding any time during which a video was playing on screen.
   */
  const findDeadSegments = (silenceRanges, staticRanges, videoRanges, duration) => {
    const dead = []

    for (const s of silenceRanges) {
      for (const v of staticRanges) {
        const overlapStart = Math.max(s.start, v.start)
        const overlapEnd = Math.min(s.end, v.end)
        if (overlapEnd - overlapStart >= 2.0) {
          dead.push({
            start: Math.max(0, overlapStart + 0.3), // 0.3s padding
            end: Math.min(duration, overlapEnd - 0.3)
          })
        }
      }
    }

    // Re-check after padding that segments are still >= 2s
    const filtered = dead.filter(d => d.end - d.start >= 2.0)

    // Remove any dead segment that overlaps with a video playback range
    if (!videoRanges || videoRanges.length === 0) return filtered

    return filtered.filter(d => {
      for (const vr of videoRanges) {
        // If dead segment overlaps with video playback at all, exclude it
        if (d.start < vr.end && d.end > vr.start) {
          return false
        }
      }
      return true
    })
  }

  /**
   * Build final segment list (dead + active) covering entire duration.
   */
  const buildSegmentList = (deadSegments, duration) => {
    if (deadSegments.length === 0) {
      return [{ start: 0, end: duration, type: 'active' }]
    }

    // Sort dead segments by start time
    const sorted = [...deadSegments].sort((a, b) => a.start - b.start)
    const result = []
    let cursor = 0

    for (const dead of sorted) {
      if (dead.start > cursor) {
        result.push({ start: cursor, end: dead.start, type: 'active' })
      }
      result.push({ start: dead.start, end: dead.end, type: 'dead' })
      cursor = dead.end
    }

    if (cursor < duration) {
      result.push({ start: cursor, end: duration, type: 'active' })
    }

    return result
  }

  /**
   * Main analysis function.
   * @param {Blob} blob - Video blob to analyze
   * @param {Array} videoPlaybackRanges - Time ranges where a video was playing on screen
   *   (these are always kept, never trimmed). Array of { start, end } in seconds.
   */
  const analyze = useCallback(async (blob, videoPlaybackRanges) => {
    setIsAnalyzing(true)
    setProgress(0)
    setSegments(null)
    setDeadTimeTotal(0)
    cancelledRef.current = false

    try {
      // Get video duration
      const duration = await getVideoDuration(blob)

      // Phase 1: Silence detection (0-50%)
      setProgress(5)
      const silenceRanges = await detectSilence(blob)
      setProgress(50)

      if (cancelledRef.current) return

      // Phase 2: Visual change detection (50-100%)
      const staticRanges = await detectStaticFrames(blob, duration)

      if (cancelledRef.current) return

      // Phase 3: Find dead segments (intersection, excluding video playback)
      const deadSegments = findDeadSegments(silenceRanges, staticRanges, videoPlaybackRanges || [], duration)
      const allSegments = buildSegmentList(deadSegments, duration)
      const totalDead = deadSegments.reduce((sum, d) => sum + (d.end - d.start), 0)

      setSegments(allSegments)
      setDeadTimeTotal(Math.round(totalDead))
      setProgress(100)
    } catch (err) {
      console.error('Video analysis failed:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  return { isAnalyzing, progress, segments, deadTimeTotal, analyze, reset }
}

/**
 * Get duration of a video blob.
 */
function getVideoDuration(blob) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(blob)
    video.src = url

    const onMeta = () => {
      if (video.duration === Infinity || isNaN(video.duration)) {
        video.currentTime = 1e10
        video.addEventListener('timeupdate', function onSeek() {
          video.removeEventListener('timeupdate', onSeek)
          const dur = video.duration
          URL.revokeObjectURL(url)
          resolve(dur)
        }, { once: true })
      } else {
        const dur = video.duration
        URL.revokeObjectURL(url)
        resolve(dur)
      }
    }

    video.addEventListener('loadedmetadata', onMeta, { once: true })
  })
}
