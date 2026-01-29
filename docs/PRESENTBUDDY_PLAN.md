# PresentBuddy - Comprehensive Planning Document

## Executive Summary

PresentBuddy is an AI-powered presentation creation and delivery platform that enables users to create, practice, and record professional presentations with real-time AI assistance. The platform features three core modes (Create, Present, Edit) and leverages voice AI to provide dynamic support during presentation delivery.

---

## Product Vision

**Mission**: Transform presentation creation and delivery by providing intelligent, real-time AI assistance that adapts to the presenter's needs, from initial content planning through final recording.

**Target Users**:
- Educators creating instructional videos
- Content creators building YouTube content
- Business professionals preparing client presentations
- Students practicing presentations
- Training professionals developing courses

---

## Technical Architecture

### Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React Web App (Vite) | UI framework |
| Voice Agent | VocalBridge AI | Real-time voice conversation |
| Database | Supabase | Data persistence, real-time sync |
| Visual Generation | Manim (3b1b library) | Mathematical/scientific visualizations |
| Screen Recording | MediaRecorder API | Video/audio capture |
| Speech Recognition | Web Speech API | Keyword/cue detection |
| Content Generation | OpenAI/Anthropic API | Content creation, image generation |

### Infrastructure Components

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Create Mode  │  │ Present Mode │  │  Edit Mode   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ├────────────────────┼────────────────────┤
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐         ┌────▼────┐
    │Supabase │          │VocalBridge│        │MediaRec │
    │Database │          │  Voice AI │        │   API   │
    └─────────┘          └───────────┘        └─────────┘
         │
    ┌────▼────────────────────────┐
    │  Content Storage Structure   │
    │  - Projects                  │
    │  - Presentations             │
    │  - Plans                     │
    │  - Content Assets            │
    │  - Recordings                │
    └──────────────────────────────┘
```

---

## Core Modes & Features

## 1. CREATE MODE

### Overview
Create Mode is where users design their presentation plan, upload supporting materials, and work with the AI agent to structure content and generate visual assets.

### User Flow

```
Upload Docs/Paste Content
         │
         ▼
Set Presentation Parameters
         │
         ▼
Discuss & Create Plan with Agent
         │
         ▼
Generate Content Assets
         │
         ▼
Review & Finalize Plan
         │
         ▼
Ready for Present Mode
```

### Features

#### A. Content Input
- **Document Upload**: PDF, DOCX, TXT, MD files
- **Paste Content**: Direct text input
- **Voice Recording**: Speak with agent to create and store notes
- **URL Import**: Extract content from web pages

#### B. Presentation Parameters

##### Goal Selection
- **PPT (Slide-based presentation)**
  - Traditional slide format
  - Transitions between discrete content pieces
  - Suitable for structured presentations

- **Video (Continuous presentation)**
  - Flowing content display
  - Dynamic visual transitions
  - Suitable for tutorials and storytelling

##### Support Level

| Level | Description | Agent Behavior |
|-------|-------------|----------------|
| **CoHost** | Equal participation | Agent presents entire sections independently, takes turns with user |
| **When Stuck** | Safety net | Agent monitors silence/hesitation, jumps in after 2-3 seconds of pause |
| **Moderator** | Active support | Agent provides transitions, summaries, and bridges between topics |

##### Duration
- Minimum: 1 minute
- Maximum: 5 minutes
- Agent automatically paces content to fit timeframe

#### C. Presentation Planning

The AI agent and user collaborate to create a detailed plan including:

**1. Content Structure**
```
- Introduction (10 seconds)
- Main Topic 1 (60 seconds)
  - Sub-point A
  - Sub-point B
- Main Topic 2 (60 seconds)
- Conclusion (10 seconds)
```

**2. Role Distribution**
```
USER: "I'll introduce the topic and explain the problem statement"
AGENT: "I'll present the data analysis and key findings"
USER: "Then I'll discuss implications"
AGENT: "And I'll wrap up with actionable recommendations"
```

**3. Handoff Cues**
- **Keyword-based**: "After I explain ABC, I'll say 'Now let's look at the data' and you jump in"
- **Time-based**: "At the 2-minute mark, you take over"
- **Visual-based**: "When slide 5 appears, you present"
- **Silence-based**: "If I pause for 3+ seconds, help me out"

**4. Visual Asset Planning**

The agent identifies needed visuals and creates task queues:

| Asset Type | Generation Method | Example |
|------------|------------------|---------|
| Images | DALL-E / Midjourney API | Concept illustrations, backgrounds |
| Graphs | Manim library | Bar charts, line graphs, pie charts |
| Tables | HTML/CSS rendering | Data tables, comparison matrices |
| Mathematical Visuals | Manim (3b1b) | Equations, geometric animations |
| Diagrams | SVG generation | Flowcharts, architecture diagrams |

**5. Web Research**
- Agent can search web for supporting data
- Fact-checking user-provided information
- Finding relevant statistics or quotes
- Discovering related examples/case studies

#### D. Plan Storage

The finalized plan is stored as a structured prompt in Supabase:

```json
{
  "presentation_id": "uuid",
  "goal": "video",
  "support_level": "cohost",
  "duration_seconds": 180,
  "structure": [
    {
      "section": "introduction",
      "speaker": "user",
      "duration": 15,
      "content": "Problem statement overview",
      "cues": ["when I say 'now let's dive in'"]
    },
    {
      "section": "data_analysis",
      "speaker": "agent",
      "duration": 60,
      "content": "Present survey findings",
      "visuals": ["graph_1", "graph_2"],
      "cues": ["after user introduction", "on_keyword: 'now let's dive in'"]
    }
  ],
  "handoff_cues": [
    {
      "trigger": "keyword",
      "phrase": "now let's dive in",
      "action": "agent_takes_over"
    },
    {
      "trigger": "silence",
      "duration_ms": 2500,
      "action": "agent_provides_support"
    }
  ],
  "content_assets": ["asset_id_1", "asset_id_2"],
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### E. Content Asset Generation & Storage

All generated content is stored in Supabase Storage with metadata:

```javascript
// Content Asset Schema
{
  "asset_id": "uuid",
  "type": "image|graph|table|manim_animation",
  "file_url": "supabase_storage_url",
  "metadata": {
    "prompt": "original generation prompt",
    "generation_method": "dalle3|manim|custom",
    "dimensions": "1920x1080",
    "duration": "5s" // for animations
  },
  "associated_section": "section_id",
  "status": "generating|ready|failed"
}
```

---

## 2. PRESENT MODE

### Overview
Present Mode is where the user delivers their presentation with real-time AI agent support, content display, and optional screen/audio recording.

### User Flow

```
Start Present Mode
         │
         ▼
[Optional] Start Recording
         │
         ▼
Begin Presenting (Voice)
         │
         ▼
Agent Listens & Detects Cues ──┐
         │                      │
         ▼                      │
Display Content on Screen       │
         │                      │
         ▼                      │
Agent Participates (based on    │
  support level & cues)         │
         │                      │
         └──────────────────────┘
         │
         ▼
End Presentation
         │
         ▼
[Optional] Download Recording
```

### Features

#### A. Real-Time Speech Detection

**VocalBridge Integration**:
- Continuous voice conversation with AI agent
- Real-time speech-to-text transcription
- Keyword/cue detection from spoken words
- Low-latency response (<600ms)

**Cue Detection Engine**:
```javascript
// Pseudo-logic
const detectCues = (transcript) => {
  // Check keyword cues
  if (transcript.includes("now let's dive in")) {
    triggerHandoff("agent_takes_over");
  }

  // Check silence cues
  if (timeSinceLastWord() > 2500 && supportLevel === "when_stuck") {
    triggerAgentSupport();
  }

  // Check time-based cues
  if (presentationElapsedTime() >= cueTime) {
    triggerAgentAction();
  }
};
```

#### B. Content Display System

**Display Modes**:

1. **Focus Mode**: Single content piece displayed prominently
   - Used for important slides/visuals
   - Full screen or large centered view
   - Triggered by: "Show [content name]"

2. **Mood Board Mode**: Multiple content pieces simultaneously
   - 2-4 pieces arranged aesthetically
   - Supporting visuals during discussion
   - Dynamic layout based on content count

**Display Logic**:
```javascript
// Content rendering based on spoken keywords
const displayContent = (spokenText, plan) => {
  // Extract relevant keywords
  const keywords = extractKeywords(spokenText);

  // Match to plan sections
  const matchedSection = plan.sections.find(s =>
    s.keywords.some(k => keywords.includes(k))
  );

  // Display associated content
  if (matchedSection) {
    renderContent(matchedSection.visuals, matchedSection.displayMode);
  }
};
```

**Content Transitions**:
- Smooth fade-in/fade-out (0.3-0.5s)
- Slide animations for PPT mode
- Continuous flow for Video mode

#### C. Agent Participation

Based on **Support Level**:

**CoHost Mode**:
```
USER: "Let me introduce today's topic..." [speaks for 30s]
AGENT: [Detects handoff cue] "Thanks for the introduction. Now let me walk you through the data we collected..." [presents for 60s]
USER: [Detects handoff cue back] "Great insights! Let me discuss the implications..."
```

**When Stuck Mode**:
```
USER: "So the main finding was... um..." [3 second pause]
AGENT: "The main finding was that 78% of users preferred the new interface. Would you like to elaborate on what made it successful?"
USER: "Yes! The key factors were..."
```

**Moderator Mode**:
```
USER: "That covers the problem statement."
AGENT: "Excellent overview. Now let's transition to our proposed solution."
USER: "Our solution involves three key components..."
```

#### D. Screen & Audio Recording

**MediaRecorder API Implementation**:

```javascript
// Recording setup
const startRecording = async () => {
  // Capture screen
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: 1920, height: 1080 },
    audio: true // System audio
  });

  // Capture microphone
  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: true
  });

  // Merge streams
  const combinedStream = new MediaStream([
    ...displayStream.getVideoTracks(),
    ...displayStream.getAudioTracks(),
    ...micStream.getAudioTracks()
  ]);

  // Start recording
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5000000 // 5 Mbps
  });

  recorder.start();
};
```

**Recording Features**:
- **Resolution**: 1080p (1920x1080)
- **Format**: WebM (VP9 codec)
- **Audio**: Dual track (system + microphone)
- **Quality**: 5 Mbps bitrate
- **Storage**: Blob URL → Supabase Storage
- **Download**: Direct download as .webm file

#### E. Real-Time UI Elements

**Presentation Dashboard** (minimal, non-intrusive):
```
┌─────────────────────────────────────────────┐
│  [REC] 02:34 / 05:00                       │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │     CONTENT DISPLAY AREA            │   │
│  │                                     │   │
│  │     [Current slide/visual]          │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Agent Status: 🎤 Listening                │
│  Next Cue: "now let's look at solutions"   │
└─────────────────────────────────────────────┘
```

#### F. Session Data Capture

Real-time logging for analytics and post-processing:

```javascript
{
  "session_id": "uuid",
  "presentation_id": "uuid",
  "start_time": "timestamp",
  "end_time": "timestamp",
  "transcript": [
    {
      "timestamp": "00:00:15",
      "speaker": "user",
      "text": "Welcome to today's presentation..."
    },
    {
      "timestamp": "00:01:30",
      "speaker": "agent",
      "text": "Let me show you the data..."
    }
  ],
  "cues_triggered": [
    {
      "timestamp": "00:01:28",
      "cue_type": "keyword",
      "cue_value": "show me the data",
      "action": "agent_takeover"
    }
  ],
  "content_displayed": [
    {
      "timestamp": "00:00:30",
      "asset_id": "uuid",
      "display_mode": "focus"
    }
  ],
  "recording_url": "supabase_storage_url"
}
```

---

## 3. EDIT MODE (Future - Placeholder)

### Overview
Post-presentation editing to modify content displayed in the recording before final download.

### Placeholder Features (Not Implementing in V1)
- Timeline-based editing
- Content replacement
- Re-record segments
- Audio adjustments
- Visual effect additions

**Implementation Status**: Deferred to future release

---

## Database Schema (Supabase)

### Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Presentations
CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  goal TEXT CHECK (goal IN ('ppt', 'video')),
  support_level TEXT CHECK (support_level IN ('cohost', 'when_stuck', 'moderator')),
  duration_seconds INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'recording', 'completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Presentation Plans
CREATE TABLE presentation_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presentation_id UUID REFERENCES presentations(id),
  structure JSONB NOT NULL, -- Full plan structure
  handoff_cues JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Content Assets
CREATE TABLE content_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presentation_id UUID REFERENCES presentations(id),
  type TEXT CHECK (type IN ('image', 'graph', 'table', 'manim_animation', 'document')),
  file_url TEXT NOT NULL, -- Supabase Storage URL
  metadata JSONB,
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Presentation Sessions
CREATE TABLE presentation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presentation_id UUID REFERENCES presentations(id),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  transcript JSONB,
  cues_triggered JSONB,
  content_displayed JSONB,
  recording_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Conversations (for Create Mode)
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  presentation_id UUID REFERENCES presentations(id),
  messages JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Storage Buckets

```
presentbuddy-storage/
├── content-assets/
│   ├── images/
│   ├── graphs/
│   ├── animations/
│   └── documents/
└── recordings/
    └── [session_id].webm
```

---

## VocalBridge Integration

### Architecture

```
React App
    │
    ├─── Backend API (Node/Express)
    │         │
    │         └─── POST /api/voice-token
    │                   │
    │                   └─── VocalBridge API
    │                          POST /api/v1/token
    │
    └─── LiveKit Client (Browser)
              │
              └─── WebRTC Connection
                      │
                      └─── VocalBridge Voice Agent
```

### Implementation

**Backend Token Endpoint** (Express):
```javascript
// server/routes/vocalbridge.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

router.post('/api/voice-token', async (req, res) => {
  try {
    const { participant_name } = req.body;

    const response = await axios.post(
      'https://vocalbridgeai.com/api/v1/token',
      { participant_name: participant_name || 'PresentBuddy User' },
      {
        headers: {
          'X-API-Key': process.env.VOCALBRIDGE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get voice token' });
  }
});

module.exports = router;
```

**React Hook** (`useVoiceAgent.ts`):
```typescript
import { useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

export function useVoiceAgent() {
  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<string>('');

  // Handle agent audio
  useEffect(() => {
    const handleTrackSubscribed = (track: any) => {
      if (track.kind === Track.Kind.Audio) {
        const audioEl = track.attach();
        document.body.appendChild(audioEl);
      }
    };

    // Handle data from agent (cues, actions)
    const handleDataReceived = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
      if (topic === 'transcript') {
        const text = new TextDecoder().decode(payload);
        setTranscript(prev => prev + ' ' + text);
      }
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.DataReceived, handleDataReceived);
      room.disconnect();
    };
  }, [room]);

  const connect = useCallback(async () => {
    const res = await fetch('/api/voice-token', { method: 'POST' });
    const { livekit_url, token } = await res.json();

    await room.connect(livekit_url, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    setIsConnected(true);
  }, [room]);

  const disconnect = useCallback(async () => {
    await room.disconnect();
    setIsConnected(false);
  }, [room]);

  return { isConnected, transcript, connect, disconnect };
}
```

### Agent Configuration

Configure VocalBridge agent with:

**System Prompt** (for Create Mode):
```
You are PresentBuddy, an AI presentation assistant helping users create engaging presentations.

Your role is to:
1. Understand the user's presentation topic and goals
2. Help structure the content into a clear, logical flow
3. Identify what visuals would enhance the presentation
4. Create a detailed plan for how the presentation will be delivered
5. Set up handoff cues for when you should participate during the presentation

Ask clarifying questions about:
- Target audience
- Key messages
- Preferred visual style
- How much they want you to participate (cohost, when stuck, or moderator)

Be conversational, helpful, and enthusiastic about making their presentation great.
```

**System Prompt** (for Present Mode):
```
You are PresentBuddy's presentation co-host. Your role is to support the presenter based on the plan.

Support Level: {support_level}
Plan: {presentation_plan}

Behaviors:
- CoHost: Present your designated sections with energy and clarity
- When Stuck: Listen carefully. If the user pauses for 2-3 seconds, gently help them continue
- Moderator: Provide smooth transitions between sections

Always:
- Match the user's tone and energy
- Be concise and clear
- Follow the handoff cues precisely
- Stay on time
```

**Client Actions** (for controlling UI):
```javascript
// Agent can trigger these actions
{
  "display_content": {
    "asset_id": "uuid",
    "mode": "focus|moodboard"
  },
  "transition_section": {
    "section_id": "uuid"
  },
  "show_timer": {
    "duration": 60
  }
}
```

---

## Content Generation Pipeline

### 1. Image Generation

**Provider**: OpenAI DALL-E 3 or Anthropic

```javascript
// Generate image from prompt
const generateImage = async (prompt, style = "professional") => {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: `${prompt}. Style: ${style}, professional presentation quality, 16:9 aspect ratio`,
    size: "1792x1024",
    quality: "hd",
  });

  const imageUrl = response.data[0].url;

  // Upload to Supabase
  const { data } = await supabase.storage
    .from('content-assets')
    .upload(`images/${uuid()}.png`, imageUrl);

  return data.path;
};
```

### 2. Graph Generation (Manim)

**Server-side Python service**:

```python
# graph_generator.py
from manim import *
import json

class BarChartScene(Scene):
    def construct(self, data):
        chart = BarChart(
            values=data['values'],
            bar_names=data['labels'],
            y_range=[0, 100, 10],
            y_length=6,
            x_length=10,
        )
        self.add(chart)

# API endpoint receives data, renders with Manim, uploads to Supabase
```

**Integration**:
```javascript
// Call Python service from Node backend
const generateGraph = async (graphData) => {
  const response = await axios.post('http://manim-service:5000/generate', {
    type: 'bar_chart',
    data: graphData
  });

  return response.data.video_url; // Manim outputs MP4
};
```

### 3. Table Generation

**Client-side HTML rendering** → Canvas → Image:

```javascript
const generateTable = (tableData) => {
  // Render table in hidden div
  const table = document.createElement('table');
  // ... populate table with data

  // Convert to canvas
  html2canvas(table).then(canvas => {
    canvas.toBlob(blob => {
      // Upload to Supabase
      supabase.storage.from('content-assets').upload(`tables/${uuid()}.png`, blob);
    });
  });
};
```

---

## User Flows & Wireframes

### Create Mode Flow

```
┌─────────────────────────────────────────┐
│         Create New Presentation         │
│                                         │
│  [Upload Docs]  [Paste Text]  [Voice]  │
│                                         │
│  Content: _____________________         │
│                                         │
│  [ Start Planning with AI Agent ]      │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│        Agent Chat Interface             │
│  ┌──────────────────────────────────┐   │
│  │ Agent: "What's your topic?"      │   │
│  │ User: "Machine Learning basics"  │   │
│  │ Agent: "Who's the audience?"     │   │
│  │ User: "College students"         │   │
│  └──────────────────────────────────┘   │
│                                         │
│  [ Continue ]                           │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│        Set Parameters                   │
│                                         │
│  Goal: ○ PPT  ● Video                   │
│                                         │
│  Support: ● CoHost  ○ When Stuck        │
│           ○ Moderator                   │
│                                         │
│  Duration: [3] minutes                  │
│                                         │
│  [ Generate Plan ]                      │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Review Plan                     │
│  ┌──────────────────────────────────┐   │
│  │ 00:00-00:15 | USER | Intro       │   │
│  │ 00:15-01:15 | AGENT| ML Concepts │   │
│  │ 01:15-02:45 | USER | Examples    │   │
│  │ 02:45-03:00 | AGENT| Conclusion  │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Content Being Generated: [####    ]    │
│  - Graph 1: ✓                           │
│  - Image 1: Loading...                  │
│                                         │
│  [ Start Presenting ]                   │
└─────────────────────────────────────────┘
```

### Present Mode Flow

```
┌─────────────────────────────────────────┐
│         Ready to Present                │
│                                         │
│  □ Record this session                  │
│                                         │
│  [ Start Presentation ]                 │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  [REC] 00:32 / 03:00     [End] [Pause]  │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │                                  │   │
│  │     [Content Display Area]       │   │
│  │                                  │   │
│  │   📊 Machine Learning Growth     │   │
│  │      [Bar chart showing...]      │   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│                                         │
│  🎤 User Speaking...                    │
│  Next: Agent presents ML concepts       │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Presentation Complete           │
│                                         │
│  Duration: 3:02                         │
│  Sections covered: 4/4                  │
│                                         │
│  Recording: presentation_final.webm     │
│                                         │
│  [ Download Video ]  [ View Transcript ]│
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Supabase database & auth
- [ ] Implement basic project management (dashboard from existing code)
- [ ] Create database schema and migrations
- [ ] Set up backend API server (Express/Node)
- [ ] Integrate VocalBridge token endpoint

### Phase 2: Create Mode - Basic (Weeks 3-4)
- [ ] Build Create Mode UI
- [ ] Implement document upload
- [ ] Integrate VocalBridge for planning conversations
- [ ] Create parameter selection interface
- [ ] Build plan storage system

### Phase 3: Create Mode - Content Generation (Weeks 5-6)
- [ ] Integrate OpenAI for image generation
- [ ] Set up Manim service for graph generation
- [ ] Implement table generation
- [ ] Build content asset management
- [ ] Create task queue for async generation

### Phase 4: Present Mode - Core (Weeks 7-8)
- [ ] Build Present Mode UI
- [ ] Implement VocalBridge connection for presentation
- [ ] Create cue detection engine
- [ ] Build content display system (focus/mood board modes)
- [ ] Implement real-time transcript processing

### Phase 5: Present Mode - Recording (Week 9)
- [ ] Integrate MediaRecorder API
- [ ] Implement screen + audio capture
- [ ] Build recording controls (start/stop/pause)
- [ ] Upload recordings to Supabase Storage
- [ ] Create download functionality

### Phase 6: Polish & Testing (Week 10)
- [ ] End-to-end testing
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation

### Phase 7: Edit Mode (Future)
- Placeholder implementation only
- No active development in V1

---

## Technical Considerations

### Performance Optimization

1. **Content Preloading**
   - Preload all assets before Present Mode starts
   - Cache content in browser memory
   - Progressive loading for large files

2. **Real-time Processing**
   - Debounce transcript processing (100ms)
   - Optimize cue detection algorithm
   - Use Web Workers for heavy computations

3. **Recording Quality**
   - Balance bitrate vs file size
   - Implement adaptive quality based on connection
   - Compress before upload to Supabase

### Security

1. **API Keys**
   - Store VocalBridge key server-side only
   - Use environment variables
   - Implement token expiration

2. **User Data**
   - Enable Supabase Row Level Security (RLS)
   - Encrypt recordings at rest
   - Implement user data isolation

3. **Content Generation**
   - Rate limit API calls
   - Validate user inputs
   - Sanitize uploaded documents

### Error Handling

1. **VocalBridge Connection**
   ```javascript
   try {
     await room.connect(url, token);
   } catch (error) {
     if (error.code === 'TOKEN_EXPIRED') {
       // Refresh token
     } else if (error.code === 'CONNECTION_FAILED') {
       // Retry with exponential backoff
     }
   }
   ```

2. **Content Generation Failures**
   - Retry logic (3 attempts)
   - Fallback to placeholder content
   - User notification system

3. **Recording Issues**
   - Check browser compatibility
   - Handle permission denials
   - Implement recovery from interruptions

---

## Success Metrics

### Create Mode
- Time to create a plan: < 5 minutes
- Content generation success rate: > 95%
- User satisfaction with AI planning: > 4.0/5.0

### Present Mode
- Agent response latency: < 800ms
- Cue detection accuracy: > 90%
- Recording success rate: > 98%
- Video quality rating: > 4.0/5.0

### Overall
- User retention (7-day): > 40%
- Presentations completed: > 70% of started
- Average presentation length: 2-4 minutes

---

## Future Enhancements (Post-V1)

### Advanced Features
- Multi-language support
- Advanced video editing in Edit Mode
- Collaborative presentation creation
- Template library
- Analytics dashboard

### Content Generation
- Custom Manim animation library
- 3D visualizations
- Interactive elements
- AR/VR presentation modes

### AI Enhancements
- Emotion detection for better support timing
- Advanced pacing algorithms
- Personalized coaching feedback
- Style transfer for consistent branding

### Integrations
- Export to YouTube (direct upload)
- PowerPoint/Keynote import
- Zapier webhooks
- LMS integrations (Canvas, Moodle)

---

## Cost Estimation

### Per Presentation (3-minute average)

| Service | Usage | Cost |
|---------|-------|------|
| VocalBridge | ~3 min voice | $0.15 - $0.30 |
| OpenAI (DALL-E) | 2-3 images | $0.08 - $0.12 |
| OpenAI (GPT-4) | Planning chat | $0.05 - $0.10 |
| Manim Rendering | 2 graphs | $0.02 (compute) |
| Supabase Storage | 200MB recording | $0.00 (within free tier) |
| **Total** | | **~$0.30 - $0.54** |

### Monthly Infrastructure (100 users, 10 presentations each)

| Service | Cost |
|---------|------|
| Supabase Pro | $25/mo |
| Backend Hosting (Railway/Render) | $20/mo |
| Manim Service (Docker container) | $15/mo |
| Domain & CDN | $10/mo |
| **Total Fixed** | **$70/mo** |

**Variable Costs** (1000 presentations): ~$400/mo

**Total Monthly** (100 active users): ~$470/mo

---

## Open Questions & Decisions Needed

1. **Content Generation Priority**
   - Q: Should we support real-time content generation during Present Mode?
   - Recommendation: No for V1. Generate all content in Create Mode.

2. **Agent Voice**
   - Q: Should users be able to customize the agent's voice?
   - Recommendation: Single default voice in V1, customization in V2.

3. **Presentation Length Limits**
   - Q: Should we enforce the 1-5 minute limit?
   - Recommendation: Soft limit with warning, hard limit at 10 minutes.

4. **Edit Mode Scope**
   - Q: How deep should Edit Mode functionality go?
   - Recommendation: Simple content replacement only, defer advanced editing.

5. **Collaboration**
   - Q: Should multiple users be able to work on one presentation?
   - Recommendation: Not in V1. Single user per presentation.

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| VocalBridge latency issues | High | Medium | Implement fallback text input, buffer critical cues |
| Content generation failures | Medium | Low | Retry logic, fallback placeholders, manual upload option |
| Browser compatibility (MediaRecorder) | Medium | Medium | Feature detection, graceful degradation, user warnings |
| Manim rendering timeouts | Low | Medium | Async queue, progress indicators, skip option |
| Supabase storage limits | Medium | Low | Compression, auto-cleanup old recordings, upgrade plan |

---

## Conclusion

PresentBuddy represents a novel approach to presentation creation and delivery by deeply integrating AI assistance throughout the entire workflow. The combination of VocalBridge's real-time voice capabilities, intelligent content generation, and seamless recording makes it a comprehensive solution for modern presentation needs.

**Key Differentiators**:
1. Real-time AI co-hosting during presentations
2. Intelligent cue detection for seamless handoffs
3. Automated content generation aligned with speech
4. Built-in recording with professional quality
5. End-to-end workflow from planning to final video

**V1 Success Criteria**:
- Users can create a full presentation plan in < 5 minutes
- Agent provides helpful, timely support during delivery
- Recordings are high-quality and downloadable
- System is reliable and performant

With careful execution across the 10-week development timeline, PresentBuddy can launch as a minimum viable product that demonstrates clear value and provides a foundation for future enhancements.

---

*Document Version: 1.0*
*Last Updated: 2025-01-27*
*Author: PresentBuddy Planning Team*
