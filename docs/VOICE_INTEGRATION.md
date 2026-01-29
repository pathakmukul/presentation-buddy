# Voice Agent Integration

## What's Implemented

### Files Created
- `/api/voice-token.js` - Backend endpoint to get VocalBridge tokens
- `/src/lib/supabase.js` - Supabase client with anon key
- `/src/hooks/useVoiceAgent.js` - Voice agent hook with context passing
- `/src/pages/ProjectPage_with_voice.jsx` - Example implementation

### Environment Variables Added
- `VITE_SUPABASE_URL` - For React app
- `VITE_SUPABASE_ANON_KEY` - For React app
- `VOCALBRIDGE_API_KEY` - For backend (set to `vb_your_api_key_here`)

## How Context Passing Works

### Connect with Context
The `useVoiceAgent` hook allows passing user info, project details, and presentation data to the agent when connecting.

### Update Context Dynamically
When app state changes (e.g., presentation created, project renamed), context can be updated without reconnecting.

### Send Actions to Agent
App can notify agent about user actions (button clicks, page changes, etc.)

### Receive Client Actions from Agent
Agent can send actions back to control UI (display content, transition sections, show timers, etc.)

## Setup Steps

1. Get VocalBridge API key from https://vocalbridgeai.com
2. Update `VOCALBRIDGE_API_KEY` in `.env`
3. Deploy backend: `vercel`
4. Set `VOCALBRIDGE_API_KEY` in Vercel dashboard
5. Use `useVoiceAgent` hook in components

## Key Methods

- `connect(context)` - Connect with user/project context
- `updateContext(newContext)` - Update context dynamically
- `sendActionToAgent(action, payload)` - Send action to agent
- `onClientAction(callback)` - Handle actions from agent
- `disconnect()` - Disconnect from agent
- `toggleMic()` - Mute/unmute microphone

## Integration Points

### VocalBridge Agent
Configure agent with system prompt that references context variables (userName, projectName, presentationId, etc.)

### Client Actions
Configure in VocalBridge dashboard:
- `display_content` - Display asset on screen
- `transition_section` - Move to next section
- `show_timer` - Show countdown timer

### MCP Server
Agent uses MCP tools from buddy-api (generate_graph, search_web) - separate deployment.