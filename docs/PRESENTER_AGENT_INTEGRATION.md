# Presenter Agent Integration

## Overview

The Presenter Agent is a VocalBridge voice agent that controls the presentation mode. It receives full context about the presentation plan and available content assets, and can send client actions to display content on screen.

## Architecture

```
User clicks "Present"
  → Enters fullscreen presentation mode
  → Connects to Presenter Agent via VocalBridge/LiveKit
  → Passes full context (plan + assets)
  → Agent speaks and controls what's displayed
  → Client actions trigger content display
  → User can interact via voice
```

## Context Passed to Presenter Agent

When presentation mode starts, the following context is sent to the presenter agent:

### User & Project Info
```javascript
{
  userId: "uuid",
  userEmail: "user@example.com",
  projectId: "uuid",
  projectName: "Newton's Laws",
  presentationId: "uuid",
  mode: "presenter",
  recording: true/false
}
```

### Presentation Plan
```javascript
{
  presentationPlan: {
    topic: "Newton's Three Laws of Motion",
    duration: 300,
    sections: [
      {
        id: "intro",
        title: "Introduction",
        speaker: "user",
        duration: 30,
        content: "Welcome and overview...",
        talking_points: [...],
        visual_cues: ["title_slide"]
      },
      // ... more sections
    ],
    handoff_cues: [
      {
        trigger: "keyword",
        phrase: "let's talk about inertia",
        section_id: "first_law",
        action: "agent_takes_over"
      },
      // ... more cues
    ]
  }
}
```

### Content Assets
```javascript
{
  contentAssets: [
    {
      id: "uuid",
      type: "graph",
      url: "https://supabase.co/storage/.../graph.png",
      description: "Monthly sales growth comparison", // Max 8 words
      created_at: "2026-01-30T..."
    },
    {
      id: "uuid",
      type: "manim_animation",
      url: "https://supabase.co/storage/.../animation.mp4",
      description: "Newton's first law visualization",
      created_at: "2026-01-30T..."
    }
  ]
}
```

## Client Actions

The presenter agent can send client actions to control the UI:

### 1. display_content

Display a specific content asset on screen.

**By Asset ID:**
```json
{
  "action": "display_content",
  "payload": {
    "asset_id": "uuid"
  }
}
```

**By URL:**
```json
{
  "action": "display_content",
  "payload": {
    "type": "image",
    "url": "https://...",
    "description": "Graph showing X"
  }
}
```

**Result:** Content appears fullscreen in presentation canvas

### 2. hide_content

Clear the screen (return to blank black canvas).

```json
{
  "action": "hide_content",
  "payload": {}
}
```

### 3. transition_section

Notify the app that we're transitioning to a new section.

```json
{
  "action": "transition_section",
  "payload": {
    "section_id": "first_law"
  }
}
```

### 4. show_timer

Display a countdown timer (TODO: implementation pending).

```json
{
  "action": "show_timer",
  "payload": {
    "duration_seconds": 30
  }
}
```

## Content Asset Descriptions

### Why Descriptions Matter

The presenter agent needs to know what each asset shows without having to:
- Download and analyze the image/video
- Make assumptions about the content
- Waste time asking clarifying questions

### Adding Descriptions to MCP Tools

All MCP tools that generate content **must** accept a `description` parameter:

```typescript
// MCP Tool: generate_graph
{
  presentation_id: string,
  graph_type: 'bar' | 'line' | 'pie',
  data: { labels: string[], values: number[] },
  title?: string,
  description: string // REQUIRED! Max 8 words
}
```

**Example:**
```javascript
await mcp.generate_graph({
  presentation_id: "uuid",
  graph_type: "bar",
  data: {
    labels: ["Q1", "Q2", "Q3", "Q4"],
    values: [100, 150, 120, 180]
  },
  title: "Quarterly Revenue",
  description: "Quarterly revenue growth year over year" // ✅ 6 words
})
```

### Storage in Database

Descriptions are stored in the `metadata` JSONB field:

```sql
-- content_assets table
{
  id: uuid,
  presentation_id: uuid,
  type: 'graph' | 'image' | 'manim_animation',
  file_url: text,
  metadata: {
    title: "Quarterly Revenue",
    graph_type: "bar",
    description: "Quarterly revenue growth year over year" // ✅ Stored here
  },
  status: 'ready',
  created_at: timestamp
}
```

## Implementation in ProjectPage

### 1. Connect to Presenter Agent

```javascript
const startPresentation = async (withRecording = false) => {
  // Build context with plan + assets
  const presenterContext = {
    userId: user?.id,
    presentationId: project.presentation_id,
    mode: 'presenter',
    recording: withRecording,
    presentationPlan: { ...plan },
    contentAssets: assets.map(a => ({
      id: a.id,
      type: a.type,
      url: a.file_url,
      description: a.metadata?.description || 'Content asset'
    }))
  }

  // Connect agent
  await presenterAgent.connect(presenterContext)
}
```

### 2. Register Client Action Handler

```javascript
useEffect(() => {
  if (!isPresentMode) return

  const handleClientAction = (action, payload) => {
    switch (action) {
      case 'display_content':
        if (payload.asset_id) {
          const asset = contentAssets.find(a => a.id === payload.asset_id)
          setDisplayedContent(asset)
        }
        break
      case 'hide_content':
        setDisplayedContent(null)
        break
      // ... other actions
    }
  }

  presenterAgent.onClientAction(handleClientAction)
}, [isPresentMode, contentAssets])
```

### 3. Render Displayed Content

```jsx
{displayedContent && (
  <div className="presented-content">
    {displayedContent.type === 'manim_animation' ? (
      <video src={displayedContent.file_url} controls autoPlay />
    ) : (
      <img src={displayedContent.file_url} alt={displayedContent.metadata?.description} />
    )}
  </div>
)}
```

## Presentation Controls

Bottom-right corner hover controls:
- **Play** - Placeholder for future play/pause functionality
- **Pause** - Placeholder
- **Mute** - Toggles microphone (connected to voice agent)
- **Exit** - Exits presentation mode and disconnects agent

## Example Flow

1. **User clicks "Present"**
   - Enters fullscreen
   - Connects to presenter agent with full context

2. **Agent receives context**
   - Knows all sections of presentation
   - Knows all available content assets with descriptions
   - Knows handoff cues

3. **User starts speaking intro**
   - Agent listens

4. **Agent detects handoff cue: "let's talk about inertia"**
   - Agent takes over speaking
   - Sends client action: `display_content` with `asset_id` for "Inertia visualization"
   - Content appears on screen

5. **Agent finishes section**
   - Sends client action: `hide_content`
   - Screen goes blank
   - Sends client action: `transition_section` to "second_law"
   - Hands back to user

6. **User exits presentation**
   - Exits fullscreen
   - Disconnects from voice agent
   - Returns to editing view

## Future Enhancements

### Timer Display
```javascript
case 'show_timer':
  setTimerDuration(payload.duration_seconds)
  setShowTimer(true)
  break
```

### Section Transitions
Display section title briefly when transitioning:
```javascript
case 'transition_section':
  setSectionTitle(payload.section_id)
  setTimeout(() => setSectionTitle(null), 3000)
  break
```

### Multi-Content Display
Display multiple assets side-by-side:
```javascript
case 'display_content':
  if (payload.layout === 'split') {
    setDisplayedContent([asset1, asset2])
  }
  break
```

## Testing

### Manual Testing

1. Create a presentation with plan in Supabase
2. Generate some content assets with descriptions
3. Open project and click "Present"
4. Check browser console for context being sent
5. Use browser dev tools to simulate client actions

### Testing Client Actions from Console

```javascript
// Simulate agent sending display_content action
presenterAgent.onClientAction((action, payload) => {
  console.log('Action received:', action, payload)
})

// Manually trigger action (for testing)
const testAction = {
  action: 'display_content',
  payload: { asset_id: 'your-asset-uuid' }
}
// Then call your handler with it
```

---

**Status:** ✅ Implemented
**Last Updated:** 2026-01-30
**Next Steps:** Configure VocalBridge presenter agent with system prompt that uses this context
