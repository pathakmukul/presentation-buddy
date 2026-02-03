# Presentation Background Patterns

Background pattern system for presentation mode. Users can select a pattern from the preview area, and it displays behind their content during presentations.

## Available Patterns

| ID | Name | Description |
|----|------|-------------|
| `none` | None | Blank black background |
| `dots` | Dots | Subtle pulsing dot grid (matches preview card style) |
| `lines` | Lines | Tiny transparent lines moving randomly |

## File Structure

```
src/components/
├── PresentationPatterns.jsx   # Pattern components and selector
└── PresentationPatterns.css   # Pattern styles
```

## How It Works

1. User selects a pattern from the selector in the preview area (top-right)
2. Selection is stored in component state (`selectedPattern`)
3. When presentation mode starts, the pattern renders behind all content
4. Pattern has `z-index: 0`, content has `z-index: 1`

## Adding a New Pattern

### Step 1: Add to PATTERNS Registry

In `src/components/PresentationPatterns.jsx`, add to the `PATTERNS` array:

```javascript
export const PATTERNS = [
  // ... existing patterns
  {
    id: 'mypattern',
    name: 'My Pattern',
    description: 'Description shown on hover'
  }
]
```

### Step 2: Create Pattern Component

Add a new component in `PresentationPatterns.jsx`:

```javascript
// CSS-based pattern
function MyPattern() {
  return <div className="pattern-mypattern" />
}

// OR Canvas-based pattern (for animations)
function MyPattern() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    // ... animation logic
  }, [])

  return <canvas ref={canvasRef} className="pattern-mypattern" />
}
```

### Step 3: Register in Renderer

Add case to the `PresentationPattern` switch:

```javascript
export function PresentationPattern({ patternId }) {
  switch (patternId) {
    case 'dots':
      return <DotsPattern />
    case 'lines':
      return <LinesPattern />
    case 'mypattern':        // Add this
      return <MyPattern />
    case 'none':
    default:
      return null
  }
}
```

### Step 4: Add Styles

In `PresentationPatterns.css`:

```css
/* Pattern background */
.pattern-mypattern {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  /* Your pattern styles */
}

/* Thumbnail preview for selector */
.pattern-preview-mypattern {
  /* Small preview of the pattern */
}
```

## Pattern Guidelines

- Keep patterns subtle - they should not distract from content
- Use low opacity values (0.03 - 0.1 for moving elements)
- Colors should be grayscale or very muted
- Animations should be slow and smooth
- Always set `pointer-events: none` so pattern doesn't block interactions
- Always set `z-index: 0` so content appears above

## Example: CSS Pattern

```css
.pattern-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
  z-index: 0;
}
```

## Example: Canvas Animation Pattern

```javascript
function ParticlesPattern() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let particles = []
    let animationId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 1 + Math.random() * 2,
      opacity: 0.02 + Math.random() * 0.05,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3
    })

    const init = () => {
      resize()
      particles = Array.from({ length: 50 }, createParticle)
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy

        // Wrap around
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
        ctx.fill()
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

  return <canvas ref={canvasRef} className="pattern-particles" />
}
```

## Future Considerations

- Store pattern preference in database (per project or user)
- Allow custom colors/intensity settings
- Add pattern preview in presentation mode controls
- Support user-uploaded patterns or images
