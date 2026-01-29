Vocal Bridge Developer Guide
Everything you need to integrate voice agents into your application.

Overview
Vocal Bridge provides voice AI agents that you can integrate into any application using WebRTC. Your users can have real-time voice conversations with AI agents through web browsers, mobile apps, or any platform that supports WebRTC.

Real-time Voice
Sub-second latency voice AI using WebRTC

Secure API Keys
Production-ready authentication

Multi-platform
JavaScript, Python, React, and more

Quick Start
Get your voice agent working in 3 steps:

1
Create an API Key
Go to your agent's page, open Developer Mode, and click "Create API Key" in the API Keys section.

2
Generate a Token (Server-side)
Call the token endpoint from your backend to get a LiveKit access token.

curl -X POST "http://vocalbridgeai.com/api/v1/token" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"participant_name": "User"}'
Copy
3
Connect from Your Client
Use the LiveKit SDK to connect and enable the microphone.

import { Room } from 'livekit-client';

const room = new Room();
await room.connect(livekit_url, token);
await room.localParticipant.setMicrophoneEnabled(true);
Copy
Authentication
Vocal Bridge uses API keys for authentication. API keys allow your backend server to generate access tokens without requiring user login.

Security: Never expose your API key in client-side code. Always call the token endpoint from your backend server.

API Key Format
API keys start with vb_ followed by a secure random string:

vb_abc123def456...
Using API Keys
Include your API key in requests using either method:

# Option 1: X-API-Key header (recommended)
curl -H "X-API-Key: vb_your_api_key" http://vocalbridgeai.com/api/v1/token

# Option 2: Authorization header
curl -H "Authorization: Bearer vb_your_api_key" http://vocalbridgeai.com/api/v1/token
Copy
API Reference
POST
/api/v1/token
Generate a LiveKit access token for connecting to the agent.

Request Headers
X-API-Key	Your API key (required)
Content-Type	application/json
Request Body (optional)
Field	Type	Description
participant_name	string	Display name for the participant (default: "API Client")
session_id	string	Custom session ID (default: auto-generated)
Response
{
  "livekit_url": "wss://tutor-j7bhwjbm.livekit.cloud",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "room_name": "user-abc-agent-xyz-api-12345",
  "participant_identity": "api-client-xxxx-12345",
  "expires_in": 3600,
  "agent_mode": "cascaded_concierge"
}
Copy
GET
/api/v1/agent
Get information about the agent associated with your API key.

Response
{
  "id": "uuid",
  "name": "My Voice Agent",
  "mode": "cascaded_concierge",
  "deployment_status": "active",
  "phone_number": "+1234567890",
  "greeting": "Hello! How can I help you?",
  "background_enabled": true,
  "hold_enabled": false,
  "hangup_enabled": false,
  "created_at": "2025-01-14T12:00:00Z"
}
Copy
Python SDK
Use the LiveKit Python SDK for server-side or desktop applications.

Installation
pip install livekit requests
Copy
Complete Example
import asyncio
import os
import requests
from livekit import rtc

VOCAL_BRIDGE_API_KEY = os.environ.get('VOCAL_BRIDGE_API_KEY')
VOCAL_BRIDGE_URL = 'http://vocalbridgeai.com'


def get_voice_token(participant_name: str = 'Python Client'):
    """Get a voice token from Vocal Bridge API."""
    response = requests.post(
        f'{VOCAL_BRIDGE_URL}/api/v1/token',
        headers={
            'X-API-Key': VOCAL_BRIDGE_API_KEY,
            'Content-Type': 'application/json'
        },
        json={'participant_name': participant_name}
    )
    response.raise_for_status()
    return response.json()


async def main():
    # Get token
    token_data = get_voice_token()
    print(f"Connecting to room: {token_data['room_name']}")

    # Create room
    room = rtc.Room()

    # Set up event handlers
    @room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            print("Agent audio connected!")
            # Process audio stream
            audio_stream = rtc.AudioStream(track)
            # ... handle audio frames

    @room.on("disconnected")
    def on_disconnected():
        print("Disconnected from room")

    # Connect
    await room.connect(token_data['livekit_url'], token_data['token'])
    print(f"Connected! Room: {room.name}")

    # Publish microphone (requires audio input device)
    source = rtc.AudioSource(sample_rate=48000, num_channels=1)
    track = rtc.LocalAudioTrack.create_audio_track("microphone", source)
    await room.local_participant.publish_track(track)
    print("Microphone enabled - start speaking!")

    # Keep running
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        await room.disconnect()


if __name__ == '__main__':
    asyncio.run(main())
Copy
Flask Backend Example
# app.py
from flask import Flask, jsonify
import requests
import os

app = Flask(__name__)

VOCAL_BRIDGE_API_KEY = os.environ.get('VOCAL_BRIDGE_API_KEY')
VOCAL_BRIDGE_URL = 'http://vocalbridgeai.com'


@app.route('/api/voice-token')
def get_voice_token():
    response = requests.post(
        f'{VOCAL_BRIDGE_URL}/api/v1/token',
        headers={
            'X-API-Key': VOCAL_BRIDGE_API_KEY,
            'Content-Type': 'application/json'
        },
        json={'participant_name': 'Web User'}
    )
    return jsonify(response.json())


if __name__ == '__main__':
    app.run(port=5000)
Copy
React Integration
Use the LiveKit React Components for easy integration with React applications.

Use the same backend token endpoint from the JavaScript SDK section to get LiveKit tokens.

Installation
npm install @livekit/components-react livekit-client
Copy
React Hook Example
// useVoiceAgent.ts
import { useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

interface VoiceAgentState {
  isConnected: boolean;
  isConnecting: boolean;
  isMicEnabled: boolean;
  error: string | null;
}

export function useVoiceAgent() {
  const [room] = useState(() => new Room());
  const [state, setState] = useState<VoiceAgentState>({
    isConnected: false,
    isConnecting: false,
    isMicEnabled: false,
    error: null
  });

  useEffect(() => {
    // Handle agent audio
    const handleTrackSubscribed = (track: any) => {
      if (track.kind === Track.Kind.Audio) {
        const audioEl = track.attach();
        document.body.appendChild(audioEl);
      }
    };

    const handleDisconnected = () => {
      setState(s => ({ ...s, isConnected: false, isMicEnabled: false }));
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.disconnect();
    };
  }, [room]);

  const connect = useCallback(async () => {
    setState(s => ({ ...s, isConnecting: true, error: null }));

    try {
      // Get token from your backend
      const res = await fetch('/api/voice-token');
      const { livekit_url, token } = await res.json();

      await room.connect(livekit_url, token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setState(s => ({
        ...s,
        isConnected: true,
        isConnecting: false,
        isMicEnabled: true
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Connection failed'
      }));
    }
  }, [room]);

  const disconnect = useCallback(async () => {
    await room.disconnect();
  }, [room]);

  const toggleMic = useCallback(async () => {
    const enabled = !state.isMicEnabled;
    await room.localParticipant.setMicrophoneEnabled(enabled);
    setState(s => ({ ...s, isMicEnabled: enabled }));
  }, [room, state.isMicEnabled]);

  return { ...state, connect, disconnect, toggleMic };
}

// VoiceAgentButton.tsx
import { useVoiceAgent } from './useVoiceAgent';

export function VoiceAgentButton() {
  const { isConnected, isConnecting, isMicEnabled, error, connect, disconnect, toggleMic } = useVoiceAgent();

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        {isConnecting ? 'Connecting...' : 'Start Voice Chat'}
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={toggleMic}
        className={`px-4 py-2 rounded-lg ${isMicEnabled ? 'bg-green-600' : 'bg-gray-600'} text-white`}
      >
        {isMicEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button
        onClick={disconnect}
        className="px-4 py-2 bg-red-600 text-white rounded-lg"
      >
        End Call
      </button>
    </div>
  );
}
Copy
Handling Client Actions (React)
// Add to useVoiceAgent hook for bidirectional communication

import { RoomEvent } from 'livekit-client';

// Inside useVoiceAgent hook:

// Handle actions FROM the agent (Agent to App)
useEffect(() => {
  const handleData = (
    payload: Uint8Array,
    participant: any,
    kind: any,
    topic?: string
  ) => {
    if (topic === 'client_actions') {
      const data = JSON.parse(new TextDecoder().decode(payload));
      if (data.type === 'client_action') {
        handleAgentAction(data.action, data.payload);
      }
    }
  };

  room.on(RoomEvent.DataReceived, handleData);
  return () => { room.off(RoomEvent.DataReceived, handleData); };
}, [room]);

function handleAgentAction(action: string, payload: any) {
  switch (action) {
    case 'navigate':
      // Navigate to a route
      window.location.href = payload.url;
      break;
    case 'show_product':
      // Show a product modal
      setProductId(payload.productId);
      break;
    default:
      console.log('Unknown action:', action, payload);
  }
}

// Send actions TO the agent (App to Agent)
const sendActionToAgent = useCallback(async (
  action: string,
  payload: Record<string, any> = {}
) => {
  const message = JSON.stringify({
    type: 'client_action',
    action,
    payload
  });
  await room.localParticipant.publishData(
    new TextEncoder().encode(message),
    { reliable: true, topic: 'client_actions' }
  );
}, [room]);

// Example usage in component:
// <button onClick={() => sendActionToAgent('button_clicked', { buttonId: 'buy' })}>
//   Buy Now
// </button>
Copy
Next.js API Route Example
Create app/api/voice-token/route.ts:

// app/api/voice-token/route.ts (Next.js App Router)
import { NextResponse } from 'next/server';

const VOCAL_BRIDGE_API_KEY = process.env.VOCAL_BRIDGE_API_KEY!;
const VOCAL_BRIDGE_URL = 'http://vocalbridgeai.com';

export async function GET() {
  try {
    const response = await fetch(`${VOCAL_BRIDGE_URL}/api/v1/token`, {
      method: 'POST',
      headers: {
        'X-API-Key': VOCAL_BRIDGE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_name: 'Web User',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get token');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get voice token' },
      { status: 500 }
    );
  }
}
Client Actions
Client Actions allow your voice agent to trigger actions in your client application. When the agent calls a client action, your app receives a message and can respond accordingly (e.g., navigate to a page, show a modal, update the UI).

How It Works
Configure client actions in your agent settings (name, description, parameters)
The agent's LLM can call these actions during conversation
Your client receives the action via LiveKit's data channel
Your app handles the action and updates the UI
Listening for Client Actions (JavaScript)
import { Room, RoomEvent } from 'livekit-client';

const room = new Room();

// Listen for client actions from the agent
room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
  if (topic === 'client_actions') {
    const data = JSON.parse(new TextDecoder().decode(payload));

    if (data.type === 'client_action') {
      handleClientAction(data.action, data.payload);
    }
  }
});

function handleClientAction(action, payload) {
  switch (action) {
    case 'navigate':
      // Navigate to a page
      window.location.href = payload.url;
      break;

    case 'show_product':
      // Show product details
      showProductModal(payload.product_id);
      break;

    case 'add_to_cart':
      // Add item to cart
      addToCart(payload.product_id, payload.quantity);
      break;

    case 'show_confirmation':
      // Show confirmation dialog
      showConfirmationDialog(payload.message);
      break;

    default:
      console.log('Unknown action:', action, payload);
  }
}
Copy
Example Client Action Configuration
When configuring your agent, you can add client actions like:

Action Name	Description
navigate	Navigate to a URL in the app
show_product	Display product details modal
add_to_cart	Add an item to the shopping cart
MCP Tools
The Model Context Protocol (MCP) allows your voice agent to connect to external tools and services. By providing an MCP server URL, your agent gains access to calendars, email, CRM systems, databases, and thousands of other integrations.

Quick Setup with Zapier
The easiest way to add tools is through Zapier MCP. Connect 7,000+ apps to your voice agent in minutes.

How MCP Works
Obtain an MCP server URL from Zapier or your own MCP server
Add the URL in your agent's configuration
The agent automatically discovers and loads available tools
During conversations, the agent can call these tools to fetch data or perform actions
Example Use Cases
Calendar Integration
Check availability, book appointments, send meeting invites via Google Calendar or Outlook

CRM Access
Look up customer info, create leads, update contact records in Salesforce, HubSpot, etc.

Email & Messaging
Send emails, Slack messages, or SMS notifications during or after calls

Database Queries
Query product catalogs, inventory, order status, or any custom database

Getting an MCP Server URL
Option 1: Zapier MCP (Recommended)

Go to zapier.com/mcp
Sign in and configure the apps you want to connect
Copy your MCP server URL (format: https://actions.zapier.com/mcp/...)
Paste into your agent's MCP Server URL field
Option 2: Custom MCP Server

Build your own MCP server using the MCP specification. Your server must support the Streamable HTTP transport.

Viewing Available Tools
After adding an MCP server URL to your agent, the available tools will be displayed in the agent's configuration page. The agent will automatically use these tools when relevant during conversations.

Post-Processing
Post-processing runs automatically after each call ends. Use it to summarize conversations, update CRM records, send follow-up emails, create tickets, or trigger any workflow based on what happened during the call.

Automatic Execution
Post-processing runs in the background after every call. No user action required. The transcript and call metadata are automatically available.

How It Works
Call ends (user hangs up or agent ends the call)
Full conversation transcript is captured
Post-processing LLM analyzes the transcript using your custom prompt
If MCP tools are configured, the LLM can call them to perform actions
Results are logged for review
Configuration Options
Post-Processing Prompt
Tell the LLM what to do with the conversation transcript. Be specific about the output format and actions to take.

Example: "Analyze this call transcript and: 1) Create a brief summary (2-3 sentences), 2) Extract any action items mentioned, 3) Identify the caller's sentiment (positive/neutral/negative), 4) If the caller requested a callback, create a task in the CRM."
Post-Processing MCP Server
Optionally connect a separate MCP server specifically for post-processing tasks. This allows the post-processing LLM to update CRMs, send emails, create tickets, or trigger any automation after the call.

Example Use Cases
Call Summaries
Generate structured summaries with key points, decisions, and next steps

CRM Updates
Automatically log call notes, update lead status, or create follow-up tasks

Follow-up Emails
Send personalized follow-up emails based on the conversation content

Escalation Alerts
Detect urgent issues and notify team members via Slack, email, or SMS

Available Context
The post-processing LLM has access to:

Full transcript - Complete conversation with speaker labels
Call duration - How long the call lasted
Timestamp - When the call started and ended
Agent configuration - The agent's system prompt and settings
MCP tools - Any tools configured for post-processing
Troubleshooting
Connection fails with "403 Forbidden"
Your API key may be invalid or revoked. Check that you're using the correct API key and that it hasn't been revoked in the dashboard.

No audio from the agent
Make sure you're attaching the audio track to an audio element when it's subscribed. Also check that the audio element is not muted and that the browser has autoplay permissions.

room.on(RoomEvent.TrackSubscribed, (track) => {
  if (track.kind === 'audio') {
    const audioEl = track.attach();
    audioEl.play(); // May need user gesture first
    document.body.appendChild(audioEl);
  }
});
Microphone not working
The browser may not have microphone permissions. Request permission before calling setMicrophoneEnabled(true):

// Request microphone permission first
await navigator.mediaDevices.getUserMedia({ audio: true });

// Then enable in LiveKit
await room.localParticipant.setMicrophoneEnabled(true);
Token expired
Tokens are valid for 1 hour. If you get a token expiration error, request a new token from your backend and reconnect.

CORS errors
Don't call the Vocal Bridge API directly from the browser. Instead, make requests from your backend server to avoid CORS issues and keep your API key secure.

Claude Code Plugin
The Vocal Bridge plugin for Claude Code lets you manage your voice agents directly from the command line. View call logs, update prompts, stream debug events, and iterate on your agent without leaving your terminal.

Works with Claude Code
Install the plugin in Claude Code to get native slash commands for managing your voice agent. Claude can automatically use these commands when you ask about your agent.

Installation
Install the plugin from the Vocal Bridge marketplace:

/plugin marketplace add vocalbridgeai/vocal-bridge-marketplace
/plugin install vocal-bridge@vocal-bridge
Copy
Getting Started
After installing, authenticate with your API key:

/vocal-bridge:login vb_your_api_key_here
Copy
Get your API key from your agent's detail page in the dashboard.

Available Commands
Command	Description
/vocal-bridge:login	Authenticate with your API key
/vocal-bridge:status	Check authentication status
/vocal-bridge:agent	Show agent information (name, mode, phone number)
/vocal-bridge:logs	View call logs and transcripts
/vocal-bridge:stats	Show call statistics
/vocal-bridge:prompt	View or update system prompt
/vocal-bridge:debug	Stream real-time debug events
/vocal-bridge:help	Show all available commands
Example Workflow
# Check recent calls
/vocal-bridge:logs

# View a specific call transcript
/vocal-bridge:logs 550e8400-e29b-41d4-a716-446655440000

# Find failed calls
/vocal-bridge:logs --status failed

# Check statistics
/vocal-bridge:stats

# View current prompt
/vocal-bridge:prompt show

# Stream debug events while testing
/vocal-bridge:debug
Copy
Benefits
Stay in Flow
No context switching between terminal and browser

AI-Assisted
Claude can use commands automatically when you ask about your agent

Real-time Debug
Stream live events while making test calls

Quick Iteration
Update prompts and test changes rapidly

