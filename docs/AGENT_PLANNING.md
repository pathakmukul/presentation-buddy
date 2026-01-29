# PresentBuddy - Agent Architecture Planning

## Agent Overview

### Total Agents: 4

**1. Planning Agent** (Create Mode)
- Conversations with user to understand content and goals
- Structures presentation into logical flow
- Identifies visual assets needed
- Creates detailed presentation plan with handoff cues
- Queues content generation tasks during conversation (non-blocking)

**2. Content Generator Agent** (Create Mode - Backend)
- Executes content generation via MCP tools
- Generates images, graphs, tables, Manim animations
- Searches web for supporting data
- Saves assets to Supabase and stores metadata

**3. Presenter Agent** (Present Mode)
- Real-time voice co-host during presentation
- Listens to user speech and detects cues
- Sends Client Actions to trigger UI updates
- Participates based on support level (CoHost/When Stuck/Moderator)
- Manages handoffs and transitions

**4. Post-Processing Agent** (After Presentation)
- Analyzes transcript automatically after call ends
- Creates summary and extracts insights
- Identifies action items and improvements
- Runs via VocalBridge's built-in post-processing

---

## Agent 1: Planning Agent

### Purpose
Help users create a complete presentation plan through natural conversation.

### VocalBridge Configuration
- **Agent Type:** Conversational with MCP tools enabled
- **MCP Server URL:** Points to custom Supabase Edge Function
- **Tools Available:** queue_content_generation, check_generation_status, search_web

### Conversation Flow

**Phase 1: Discovery**
- Ask about presentation topic
- Understand target audience
- Clarify key messages
- Determine preferred visual style
- Set support level preference

**Phase 2: Structure**
- Break content into logical sections
- Assign time to each section
- Decide who presents what (user vs agent)
- Define handoff cues and triggers

**Phase 3: Visual Planning**
- Identify where visuals enhance the message
- Specify type of visual needed (graph/image/animation)
- Gather data for graphs
- Create descriptions for images

**Phase 4: Content Generation (Synchronous)**
- Generate content as identified during conversation
- Agent waits 5-10 seconds per asset (synchronous execution)
- User sees brief pause while content generates
- Assets immediately available after generation completes

**Phase 5: Finalization**
- Save complete plan to Supabase
- Confirm all assets are ready
- Mark presentation as ready for Present Mode

### System Prompt Key Points
- Be conversational and enthusiastic
- Ask clarifying questions
- Help structure content logically
- Identify visual enhancement opportunities
- Set up clear handoff cues for presentation

### Output
Complete presentation plan stored in Supabase:
- Presentation parameters (goal, duration, support level)
- Section breakdown with timings
- Speaker assignments
- Handoff cues (keyword, time, silence-based)
- List of generated assets with URLs
- Ready status for Present Mode

---

## Agent 2: Content Generator (MCP Backend)

### Purpose
Execute content generation tasks requested by Planning Agent.

### Implementation
Vercel HTTP MCP server using `mcp-handler` package.

### Available Tools

**Tool 1: generate_graph**
- Input: `presentation_id`, `graph_type` (bar/line/pie), `data` (labels, values), optional `title`
- Process: Creates job, calls Python worker, waits for completion (5-10s)
- Output: Graph URL, job_id, asset_id
- Behavior: **Synchronous** - blocks until complete

**Tool 2: check_generation_status**
- Input: `presentation_id`
- Process: Queries Supabase content_jobs table
- Output: List of all jobs with statuses and asset URLs
- Behavior: Fast query (<200ms)

**Tool 3: search_web**
- Input: `query`
- Process: DuckDuckGo API search
- Output: Search results JSON
- Behavior: Synchronous (1-2s)

### Execution Flow (Synchronous)
1. Planning Agent identifies need: "User wants sales graph"
2. Agent calls `generate_graph` MCP tool
3. MCP server creates job in Supabase (status: "queued")
4. MCP calls Python worker at `/api/content-worker`
5. Python worker generates matplotlib graph (~3-5s)
6. Worker uploads PNG to Supabase Storage bucket
7. Worker updates job status to "completed" with asset_id
8. MCP waits for worker response
9. MCP returns graph URL + asset_id to agent (~5-10s total)
10. Agent continues conversation with completed asset

### Why Synchronous?
- **Tried async fire-and-forget**: Worker never executed (Vercel kills pending requests)
- **Chose reliability over speed**: 5-10s wait acceptable for guaranteed completion
- **Agent can still multitask**: Use `check_generation_status` to verify old jobs

---

## Agent 3: Presenter Agent

### Purpose
Provide real-time voice support during presentation delivery.

### VocalBridge Configuration
- **Agent Type:** Real-time voice conversation
- **Client Actions Enabled:** Yes
- **System Prompt:** Dynamic, loaded from user's presentation plan
- **MCP Tools:** None (read-only during presentation)

### Dynamic System Prompt
Loaded when Present Mode starts, includes:
- Support level (CoHost/When Stuck/Moderator)
- Full presentation plan and structure
- Handoff cues to watch for
- Content to present in agent sections
- Timing expectations

### Behavior by Support Level

**CoHost Mode:**
- Present entire designated sections independently
- Take turns with user as equal participant
- Trigger content display via Client Actions during own sections
- Hand back to user at specified cues

**When Stuck Mode:**
- Listen silently while user presents
- Monitor for pauses longer than 2-3 seconds
- Gently provide support to help user continue
- Avoid taking over unless user is clearly stuck

**Moderator Mode:**
- Provide smooth transitions between sections
- Summarize key points
- Bridge topics
- Keep presentation flowing

### Client Actions Used

**display_content**
- Triggers when agent detects relevant keyword or time
- Payload: asset_id, display_mode (focus/moodboard)
- React app receives and displays content from IndexedDB

**transition_section**
- Marks section change
- Payload: section_id
- UI updates to show current section

**show_timer**
- Optional time awareness cues
- Payload: time_remaining
- Helps keep presentation on pace

### Cue Detection

**Keyword Cues:**
- Agent processes transcript in real-time
- Matches against predefined phrases
- Triggers action when detected

**Time Cues:**
- Agent tracks elapsed presentation time
- Triggers at specific timestamps
- Ensures timing stays on track

**Silence Cues:**
- Monitors gaps in user speech
- Triggers support after configured duration
- Only active in "When Stuck" mode

### Real-time Flow
- VocalBridge provides continuous speech-to-text
- Agent processes transcript for cues
- Sends Client Actions to React app
- React app displays content from IndexedDB
- Agent speaks when appropriate based on support level
- All happens with sub-second latency

---

## Agent 4: Post-Processing Agent

### Purpose
Automatic analysis after presentation ends.

### VocalBridge Configuration
- **Built-in Feature:** Runs automatically after call ends
- **Post-Processing Prompt:** Custom instructions for analysis
- **Post-Processing MCP:** Optional, for taking actions

### Analysis Tasks
- Create 2-3 sentence summary of presentation
- Extract key points covered
- Identify what went well
- Note areas for improvement
- List any action items mentioned
- Rate presentation flow and pacing

### Optional Actions via MCP
- Save summary to Supabase
- Send follow-up email with transcript
- Create task list in project management tool
- Log analytics data

### Output
Stored in Supabase for user review:
- Full transcript with speaker labels
- Summary and key points
- Performance insights
- Action items
- Improvement suggestions

---

## Data Architecture

### Where Data Lives

**Supabase Database:**
- User accounts and authentication
- Projects and presentations metadata
- Presentation plans (JSON)
- Agent conversation history
- Content generation jobs queue (status tracking)
- Asset metadata (URLs, types, dimensions)
- Presentation session logs
- Post-processing results

**Supabase Storage:**
- Generated images
- Generated graphs
- Manim animations
- Source documents uploaded by user
- Recorded presentation videos (optional backup)

**IndexedDB (Browser):**
- Downloaded assets for offline access
- Presentation plan cache
- Recording blobs before upload
- Session state

### Data Flow by Mode

**Create Mode:**
1. User uploads docs → Supabase Storage
2. Planning Agent conversation starts → Stored in Supabase DB
3. Agent identifies content need → Calls `generate_graph` MCP tool
4. Agent waits 5-10s while graph generates → Returns asset URL
5. Agent continues conversation with completed asset
6. Repeat for each content piece (sequential)
7. Complete plan → Supabase DB
8. Mark presentation ready

**Present Mode Load:**
1. Fetch plan from Supabase DB
2. Download all assets to IndexedDB
3. Preload into memory for instant access
4. Start Presenter Agent with plan
5. No Supabase calls during presentation

**Present Mode Active:**
1. User speaks → VocalBridge transcribes
2. Agent detects cues → Sends Client Actions
3. React app displays content from IndexedDB
4. Agent speaks at appropriate times
5. MediaRecorder captures screen + audio
6. Recording blob saved to IndexedDB

**After Presentation:**
1. Recording available for immediate download
2. Post-processing agent analyzes transcript
3. Results saved to Supabase
4. User optionally uploads recording to Supabase

---

## MCP Server Architecture

### Implementation Platform
**Vercel Serverless Functions** with HTTP transport

### Technology Stack
- **mcp-handler** v1.0.7 - Official Vercel MCP package
- **@modelcontextprotocol/sdk** v1.25.2 - MCP protocol implementation
- **Zod** - Input validation
- **@supabase/supabase-js** - Database/storage client

### Single Endpoint, Multiple Tools
`https://buddy-api-rouge.vercel.app/api/mcp` exposes all 3 tools

### Tool Discovery
VocalBridge automatically calls `tools/list` method to discover available tools

### Execution Pattern: Synchronous Await
All tools use **synchronous execution** - MCP waits for completion before returning:

**generate_graph:**
- Creates job in DB
- Calls Python worker with `await fetch()`
- Waits 5-10 seconds for graph generation
- Returns completed asset URL

**check_generation_status:**
- Quick DB query
- Returns immediately (<200ms)

**search_web:**
- DuckDuckGo API call
- Returns in 1-2 seconds

---

## VocalBridge Integration Details

### Authentication Flow
Backend API generates tokens, never exposes API key to client.

**Server Side:**
- Store VocalBridge API key in environment variable
- Endpoint receives request from React app
- Calls VocalBridge token API
- Returns LiveKit URL and token to client

**Client Side:**
- Requests token from backend
- Uses LiveKit SDK to connect
- Establishes WebRTC connection
- Enables microphone for voice conversation

### Agent Switching
Two separate VocalBridge agents configured differently.

**Planning Agent:**
- Configured with MCP server URL
- System prompt for planning conversations
- Used only in Create Mode

**Presenter Agent:**
- Configured with Client Actions enabled
- Dynamic system prompt loaded from plan
- Used only in Present Mode

React app requests token for appropriate agent based on current mode.

### Client Actions vs MCP Tools

**Client Actions:**
- Lightweight JSON messages from agent to app
- Used for UI control and triggering
- Agent sends, React app listens and responds
- Examples: display content, change sections, show timers

**MCP Tools:**
- Heavy operations requiring external services
- Used for content generation and data operations
- Agent calls, MCP server executes, returns result
- Examples: generate graphs, search web, save assets

**Relationship:**
They complement each other. MCP Tools create content in Create Mode. Client Actions display content in Present Mode.

---

## Performance Considerations

### Content Generation Speed
- **Graph generation**: 5-10 seconds (synchronous - agent waits)
  - Job creation: <100ms
  - Python matplotlib: 3-5 seconds
  - Supabase upload: 1-2 seconds
  - Total blocking time: ~5-10s per graph
- **Web search**: 1-2 seconds (synchronous)
- **Status check**: <200ms (quick DB query)
- **Sequential execution**: Multiple graphs = N × 10 seconds
- **Trade-off**: Reliability over speed (async failed in Vercel)

### Presentation Mode Performance
- All assets preloaded into IndexedDB before starting
- Zero network calls during presentation
- Content displayed from local storage instantly
- Agent response latency: <800ms (VocalBridge + LiveKit)
- Client Actions processed immediately by React app

### Recording Performance
- MediaRecorder API captures screen + audio
- 1080p resolution, 5 Mbps bitrate
- Stored as blob in IndexedDB during recording
- Download available immediately after ending
- Upload to Supabase optional (background process)

### Scaling Considerations
- IndexedDB can store GBs per origin
- Sufficient for hundreds of presentations
- Automatic cleanup of old recordings recommended
- Supabase handles storage at scale

---

## Agent Cost Analysis

### Per Presentation (3-minute average)

**VocalBridge Usage:**
- Planning conversation: ~5 minutes = $0.15-0.25
- Presentation with agent: ~3 minutes = $0.10-0.20
- Post-processing: included

**Content Generation:**
- DALL-E images (2-3): $0.08-0.12
- Manim graphs (1-2): $0.02 compute
- Web search: negligible

**Total per presentation:** ~$0.35-0.60

### Monthly Cost (100 users, 10 presentations each)
- Variable costs (1000 presentations): $350-600
- Supabase Pro: $25
- Backend hosting: $20
- Total: ~$400-650/month

---

## Error Handling & Resilience

### Content Generation Job Failures
- Background workers retry failed jobs: 3 attempts with exponential backoff
- Job status updated to "failed" if all retries exhausted
- Agent checks status and informs user: "Graph generation failed, would you like to try again or continue without it?"
- User can choose to retry or proceed
- Plan still usable even if some assets missing
- Failed jobs tracked in database for debugging

### VocalBridge Connection Issues
- Token expiration: Request new token and reconnect
- Connection drops: Automatic reconnection attempt
- Microphone permission denied: Clear user prompt
- Audio issues: Check browser compatibility, provide instructions

### Recording Failures
- Browser compatibility check before starting
- Permission requests handled gracefully
- Recovery from interruptions (page reload saves state)
- Blob saved incrementally to prevent data loss

### IndexedDB Limits
- Monitor storage quota using navigator.storage.estimate()
- Warn user when approaching limit
- Provide cleanup options for old presentations
- Graceful degradation if storage full

---

## Security & Privacy

### API Key Management
- VocalBridge API key stored server-side only
- Never exposed in client code
- Environment variables for all credentials
- Token-based authentication for clients

### User Data Protection
- Supabase Row Level Security (RLS) enabled
- Users can only access their own data
- Recordings encrypted at rest
- HTTPS for all network communication

### Content Generation Safety
- Rate limiting on MCP endpoints
- Input validation and sanitization
- Abuse detection for API usage
- User upload scanning for malicious content

---

## Success Metrics

### Planning Agent Effectiveness
- Average planning time: <5 minutes
- Content generation success rate: >95%
- User satisfaction with plan quality: >4/5

### Presenter Agent Performance
- Response latency: <800ms
- Cue detection accuracy: >90%
- Handoff smoothness rating: >4/5
- Support timing appropriateness: >85%

### Overall System
- Presentation completion rate: >70%
- Recording success rate: >98%
- Video quality rating: >4/5
- User retention (7-day): >40%

---

## Open Questions

### Agent Coordination
- Should Planning Agent save draft plans during conversation for recovery?
- How to handle user changing mind after content generated?

### Presenter Agent Customization
- Voice customization in V1 or defer to V2?
- Allow users to adjust cue sensitivity thresholds?

### Post-Processing
- Should insights be shown immediately or email later?
- Auto-generate improvement suggestions for next presentation?

### Content Generation
- Real-time generation during Present Mode for V2?
- User-provided custom visuals vs AI-generated preference?

---

## Future Enhancements

### Multi-Agent Collaboration
- Multiple users with separate Presenter Agents
- Panel discussion mode with 3+ agents
- Moderator + multiple co-hosts

### Advanced Cue Detection
- Emotion detection for better timing
- Visual cue detection (user gestures)
- Context-aware interruption handling

### Content Generation
- Custom Manim template library
- 3D visualization generation
- Interactive chart elements
- Real-time data integration

### Agent Intelligence
- Learn from past presentations
- Personalized coaching feedback
- Style adaptation to user preferences
- Predictive cue suggestions

---

*Document Version: 1.2*
*Last Updated: 2026-01-29*
*Updated: Synchronous execution model - MCP awaits worker completion (async failed in Vercel)*
