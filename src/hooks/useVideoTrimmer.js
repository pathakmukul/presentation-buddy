import { useState, useCallback, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

/**
 * Uses FFmpeg.wasm to trim dead segments from a video blob.
 * Lazy-loads FFmpeg on first use.
 */
export function useVideoTrimmer() {
  const [isTrimming, setIsTrimming] = useState(false)
  const [progress, setProgress] = useState(0)
  const [trimmedBlob, setTrimmedBlob] = useState(null)
  const [trimmedDuration, setTrimmedDuration] = useState(0)
  const ffmpegRef = useRef(null)

  const reset = useCallback(() => {
    setIsTrimming(false)
    setProgress(0)
    setTrimmedBlob(null)
    setTrimmedDuration(0)
  }, [])

  /**
   * Load FFmpeg if not already loaded.
   */
  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current

    const ffmpeg = new FFmpeg()

    ffmpeg.on('progress', ({ progress: p }) => {
      // FFmpeg progress is per-command, scale to overall progress
      setProgress(Math.min(Math.floor(p * 100), 99))
    })

    ffmpeg.on('log', ({ message }) => {
      // Useful for debugging — can be removed in production
      if (message.includes('Error') || message.includes('error')) {
        console.warn('FFmpeg:', message)
      }
    })

    await ffmpeg.load()
    ffmpegRef.current = ffmpeg
    return ffmpeg
  }

  /**
   * Format seconds to FFmpeg time string (HH:MM:SS.mmm)
   */
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = (seconds % 60).toFixed(3)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.padStart(6, '0')}`
  }

  /**
   * Trim the video by extracting only active segments and concatenating them.
   * @param {Blob} videoBlob - Original video blob
   * @param {Array} segments - Full segment list from useVideoAnalysis (with type: 'active'|'dead')
   */
  const trim = useCallback(async (videoBlob, segments) => {
    const activeSegments = segments.filter(s => s.type === 'active')

    if (activeSegments.length === 0) {
      console.warn('No active segments to trim')
      return
    }

    setIsTrimming(true)
    setProgress(0)
    setTrimmedBlob(null)

    try {
      const ffmpeg = await loadFFmpeg()
      setProgress(10)

      // Write input file
      const inputData = await fetchFile(videoBlob)
      await ffmpeg.writeFile('input.webm', inputData)
      setProgress(15)

      // If only 1 active segment covers the whole video, no trimming needed
      if (activeSegments.length === 1 && segments.length === 1) {
        setTrimmedBlob(videoBlob)
        setTrimmedDuration(activeSegments[0].end - activeSegments[0].start)
        setProgress(100)
        setIsTrimming(false)
        return
      }

      // Extract each active segment
      const segmentFiles = []
      for (let i = 0; i < activeSegments.length; i++) {
        const seg = activeSegments[i]
        const outFile = `seg_${i}.webm`
        segmentFiles.push(outFile)

        await ffmpeg.exec([
          '-i', 'input.webm',
          '-ss', formatTime(seg.start),
          '-to', formatTime(seg.end),
          '-c', 'copy',
          '-avoid_negative_ts', 'make_zero',
          outFile
        ])

        setProgress(15 + Math.floor((i + 1) / activeSegments.length * 55))
      }

      // If only one segment, just rename it
      if (segmentFiles.length === 1) {
        const data = await ffmpeg.readFile(segmentFiles[0])
        const blob = new Blob([data.buffer], { type: 'video/webm' })
        const dur = activeSegments[0].end - activeSegments[0].start

        // Cleanup
        await ffmpeg.deleteFile('input.webm')
        await ffmpeg.deleteFile(segmentFiles[0])

        setTrimmedBlob(blob)
        setTrimmedDuration(Math.round(dur))
        setProgress(100)
        setIsTrimming(false)
        return
      }

      // Create concat file list
      const concatList = segmentFiles.map(f => `file '${f}'`).join('\n')
      const encoder = new TextEncoder()
      await ffmpeg.writeFile('list.txt', encoder.encode(concatList))

      setProgress(75)

      // Concatenate segments
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'list.txt',
        '-c', 'copy',
        'output.webm'
      ])

      setProgress(90)

      // Read output
      const outputData = await ffmpeg.readFile('output.webm')
      const outputBlob = new Blob([outputData.buffer], { type: 'video/webm' })
      const totalDuration = activeSegments.reduce((sum, s) => sum + (s.end - s.start), 0)

      // Cleanup virtual FS
      await ffmpeg.deleteFile('input.webm')
      await ffmpeg.deleteFile('list.txt')
      await ffmpeg.deleteFile('output.webm')
      for (const f of segmentFiles) {
        await ffmpeg.deleteFile(f).catch(() => {})
      }

      setTrimmedBlob(outputBlob)
      setTrimmedDuration(Math.round(totalDuration))
      setProgress(100)
    } catch (err) {
      console.error('Trimming failed:', err)
    } finally {
      setIsTrimming(false)
    }
  }, [])

  return { isTrimming, progress, trimmedBlob, trimmedDuration, trim, reset }
}
