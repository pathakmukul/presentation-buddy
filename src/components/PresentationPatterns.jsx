/**
 * Presentation Background Patterns
 *
 * Extensible pattern system for presentation mode backgrounds.
 * To add a new pattern:
 * 1. Add entry to PATTERNS array with id, name, and component
 * 2. Create the pattern component (CSS-based or canvas-based)
 */

import { useState, useEffect, useRef } from 'react'
import './PresentationPatterns.css'

// Pattern registry - add new patterns here
export const PATTERNS = [
  {
    id: 'none',
    name: 'None',
    description: 'Blank black background',
    isLight: false
  },
  {
    id: 'dots',
    name: 'Dots',
    description: 'Subtle pulsing dot grid',
    isLight: false
  },
  {
    id: 'lines',
    name: 'Lines',
    description: 'Moving transparent lines',
    isLight: false
  },
  {
    id: 'light',
    name: 'Light',
    description: 'White background with dark text',
    isLight: true
  }
]

/**
 * Dot pattern - matches the preview card pattern
 */
function DotsPattern() {
  return <div className="pattern-dots" />
}

/**
 * Light theme - white background
 */
function LightPattern() {
  return <div className="pattern-light" />
}

/**
 * Moving lines pattern - subtle transparent lines moving randomly
 */
function LinesPattern() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationId
    let lines = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createLine = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      length: 50 + Math.random() * 100,
      angle: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      opacity: 0.4 + Math.random() * 0.3,
      rotationSpeed: (Math.random() - 0.5) * 0.01
    })

    const init = () => {
      resize()
      lines = Array.from({ length: 30 }, createLine)
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      lines.forEach(line => {
        // Update position
        line.x += Math.cos(line.angle) * line.speed
        line.y += Math.sin(line.angle) * line.speed
        line.angle += line.rotationSpeed

        // Wrap around screen
        if (line.x < -line.length) line.x = canvas.width + line.length
        if (line.x > canvas.width + line.length) line.x = -line.length
        if (line.y < -line.length) line.y = canvas.height + line.length
        if (line.y > canvas.height + line.length) line.y = -line.length

        // Draw line
        ctx.save()
        ctx.translate(line.x, line.y)
        ctx.rotate(line.angle)
        ctx.strokeStyle = `rgba(255, 255, 255, ${line.opacity})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(-line.length / 2, 0)
        ctx.lineTo(line.length / 2, 0)
        ctx.stroke()
        ctx.restore()
      })

      animationId = requestAnimationFrame(draw)
    }

    init()
    draw()

    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="pattern-lines" />
}

/**
 * Main pattern renderer - renders the selected pattern
 */
export function PresentationPattern({ patternId }) {
  switch (patternId) {
    case 'dots':
      return <DotsPattern />
    case 'lines':
      return <LinesPattern />
    case 'light':
      return <LightPattern />
    case 'none':
    default:
      return null
  }
}

/**
 * Helper to check if a pattern is light-themed
 */
export function isLightPattern(patternId) {
  const pattern = PATTERNS.find(p => p.id === patternId)
  return pattern?.isLight ?? false
}

/**
 * Pattern selector for preview area - dropdown style
 */
export function PatternSelector({ selectedPattern, onSelectPattern }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectorRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedPatternData = PATTERNS.find(p => p.id === selectedPattern) || PATTERNS[0]

  return (
    <div className="pattern-selector" ref={selectorRef}>
      <button
        className="pattern-selector-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={`pattern-preview pattern-preview-${selectedPattern}`} />
        <span>Theme</span>
      </button>

      {isOpen && (
        <div className="pattern-dropdown">
          {PATTERNS.map(pattern => (
            <button
              key={pattern.id}
              className={`pattern-option ${selectedPattern === pattern.id ? 'selected' : ''}`}
              onClick={() => {
                onSelectPattern(pattern.id)
                setIsOpen(false)
              }}
            >
              <div className={`pattern-preview pattern-preview-${pattern.id}`} />
              <span>{pattern.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
