import { useState, useCallback, useEffect, useRef } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'

/**
 * Hook for VocalBridge voice agent integration
 * Handles connection, context passing, and client actions
 */
export function useVoiceAgent() {
  const [room] = useState(() => new Room())
  const [state, setState] = useState({
    isConnected: false,
    isConnecting: false,
    isMicEnabled: false,
    error: null,
    agentStatus: 'disconnected' // 'disconnected', 'listening', 'speaking'
  })

  const [transcripts, setTranscripts] = useState([]) // Array of {id, role, text, timestamp}
  const [toolCalls, setToolCalls] = useState([]) // Array of {id, tool, args, timestamp}
  const seenSegmentIds = useRef(new Set()) // Deduplicate segments
  const seenToolCallIds = useRef(new Set()) // Deduplicate tool calls
  const contextRef = useRef({}) // Store context (user info, presentation_id)
  const onClientActionRef = useRef(null) // Callback for client actions
  const audioContextRef = useRef(null) // Web Audio API context for audio detection
  const audioAnalyserRef = useRef(null) // Audio analyser
  const audioCheckIntervalRef = useRef(null) // Interval for checking audio level

  // Handle agent audio track subscription
  useEffect(() => {
    const handleTrackSubscribed = (track, publication, participant) => {
      // Only process audio tracks from the AGENT (remote participant), not local or other sources
      const isAgent = participant?.identity?.includes('agent') || participant?.identity?.includes('level0')

      if (track.kind === Track.Kind.Audio && isAgent) {
        const audioEl = track.attach()
        audioEl.autoplay = true
        document.body.appendChild(audioEl)


        // Set up audio analysis for speech detection
        try {
          // Use existing AudioContext or create new one
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
          }

          const audioContext = audioContextRef.current

          // Resume if suspended (browser autoplay policy)
          if (audioContext.state === 'suspended') {
            audioContext.resume()
          }

          const source = audioContext.createMediaStreamSource(track.mediaStream)
          const analyser = audioContext.createAnalyser()
          analyser.fftSize = 256
          analyser.smoothingTimeConstant = 0.8

          source.connect(analyser)
          // Don't connect to destination - LiveKit already handles playback

          audioAnalyserRef.current = analyser

          // Check audio level periodically with smoothing
          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          let speakingCount = 0
          let silenceCount = 0
          const SPEAKING_THRESHOLD = 3 // Start speaking after 3 consecutive detections (300ms)
          const SILENCE_THRESHOLD = 5 // Stop speaking after 5 consecutive silences (500ms)

          audioCheckIntervalRef.current = setInterval(() => {
            // Guard: don't process if analyser is gone
            if (!audioAnalyserRef.current) {
              return
            }

            analyser.getByteFrequencyData(dataArray)

            // Calculate average volume
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length

            // Detect if audio is present (threshold filters out codec noise/artifacts)
            const hasAudio = average > 12

            // Use counters to smooth transitions
            if (hasAudio) {
              speakingCount++
              silenceCount = 0
            } else {
              silenceCount++
              speakingCount = 0
            }

            setState(s => {
              // Guard: don't update if disconnected
              if (s.agentStatus === 'disconnected' || !s.isConnected) {
                return s
              }

              let newStatus = s.agentStatus

              // Switch to speaking only after consistent audio
              if (s.agentStatus !== 'speaking' && speakingCount >= SPEAKING_THRESHOLD) {
                newStatus = 'speaking'
              }
              // Switch to listening only after consistent silence
              else if (s.agentStatus === 'speaking' && silenceCount >= SILENCE_THRESHOLD) {
                newStatus = 'listening'
              }

              return s.agentStatus !== newStatus ? { ...s, agentStatus: newStatus } : s
            })
          }, 100) // Check every 100ms

        } catch (err) {
          console.error('❌ Failed to set up audio detection:', err)
          setState(s => ({ ...s, agentStatus: 'listening' }))
        }
      }
    }

    const handleTrackUnsubscribed = (track, publication, participant) => {
      const isAgent = participant?.identity?.includes('agent') || participant?.identity?.includes('level0')

      if (track.kind === Track.Kind.Audio && isAgent) {
        track.detach().forEach(el => el.remove())

        // Clean up audio detection
        if (audioCheckIntervalRef.current) {
          clearInterval(audioCheckIntervalRef.current)
          audioCheckIntervalRef.current = null
        }
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
        audioAnalyserRef.current = null

        setState(s => ({ ...s, agentStatus: 'listening' }))
      }
    }

    // Handle data from agent (client actions, tool calls)
    const handleDataReceived = (payload, participant, kind, topic) => {
      const decoder = new TextDecoder()
      const text = decoder.decode(payload)

      // Log ALL raw data to understand format
      console.log('📥 RAW DATA RECEIVED:', {
        topic,
        participant: participant?.identity,
        kind,
        text: text.slice(0, 200) // First 200 chars
      })

      try {
        const data = JSON.parse(text)
        console.log('📥 PARSED DATA:', { topic, type: data.type, data })

        // Handle client actions from agent
        if (topic === 'client_actions' && data.type === 'client_action') {
          console.log('✅ Client action received:', data.action, data.payload)

          // Call the registered callback if available
          if (onClientActionRef.current) {
            onClientActionRef.current(data.action, data.payload)
          }
        }

        // Handle tool calls from debug logs
        // NOTE: This is currently not receiving data from VocalBridge.
        // We can see tool calls in their debug mode logs, but they're not being sent via the data channel yet.
        // Keeping this code in place for when VocalBridge adds support for sending tool call events.
        // Expected format: { type: 'tool_call', tool: 'tool_name', args: {...}, timestamp: ... }
        if ((topic === 'tool_call' || topic === 'debug' || data.type === 'tool_call') && data.tool) {
          const toolCallId = `${data.tool}-${data.timestamp || Date.now()}`

          // Deduplicate
          if (seenToolCallIds.current.has(toolCallId)) return
          seenToolCallIds.current.add(toolCallId)

          const newToolCall = {
            id: toolCallId,
            tool: data.tool,
            args: data.args || data.arguments || {},
            timestamp: data.timestamp || Date.now()
          }

          console.log('🔧 Tool called:', data.tool)

          setToolCalls(prev => [...prev, newToolCall])
        }
      } catch (err) {
        console.error('Error parsing agent data:', err)
      }
    }

    const handleDisconnected = () => {
      setState(s => ({
        ...s,
        isConnected: false,
        isMicEnabled: false,
        agentStatus: 'disconnected'
      }))
    }

    // Handle live transcription (requires Debug Mode enabled on agent)
    const handleTranscriptionReceived = (segments, participant, publication) => {
      segments.forEach(segment => {
        // Only process final segments, skip interim
        if (!segment.final) return

        // Deduplicate by segment ID
        if (seenSegmentIds.current.has(segment.id)) return
        seenSegmentIds.current.add(segment.id)

        // Detect speaker from participant identity
        const isAgent = participant?.identity?.includes('agent') || participant?.identity?.includes('level0')
        const role = isAgent ? 'agent' : 'user'

        const newTranscript = {
          id: segment.id,
          role: role,
          text: segment.text,
          timestamp: Date.now()
        }

        console.log('📝 Transcript:', role, segment.text)

        setTranscripts(prev => [...prev, newTranscript])
      })
    }

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    room.on(RoomEvent.DataReceived, handleDataReceived)
    room.on(RoomEvent.Disconnected, handleDisconnected)
    room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived)

    return () => {
      // Clean up audio detection on unmount
      if (audioCheckIntervalRef.current) {
        clearInterval(audioCheckIntervalRef.current)
        audioCheckIntervalRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      audioAnalyserRef.current = null

      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      room.off(RoomEvent.DataReceived, handleDataReceived)
      room.off(RoomEvent.Disconnected, handleDisconnected)
      room.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived)
      room.disconnect()
    }
  }, [room])

  /**
   * Connect to VocalBridge agent with context
   * @param {Object} context - { userId, userName, presentationId, projectId, etc. }
   */
  const connect = useCallback(async (context = {}) => {
    setState(s => ({ ...s, isConnecting: true, error: null }))
    contextRef.current = context

    try {
      // Get token from backend endpoint
      // Mode determines which VocalBridge agent to connect to (planning or presenter)
      const res = await fetch('/api/voice-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_name: context.userName || 'User',
          mode: context.mode || 'planning' // 'planning' or 'presenter'
        })
      })

      if (!res.ok) {
        throw new Error('Failed to get voice token')
      }

      const { livekit_url, token } = await res.json()

      // Connect to LiveKit room
      await room.connect(livekit_url, token)

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true)

      // Send context to agent immediately after connecting
      await sendContextToAgent(context)

      setState(s => ({
        ...s,
        isConnected: true,
        isConnecting: false,
        isMicEnabled: true,
        agentStatus: 'listening'
      }))

      console.log('Connected to VocalBridge agent with context:', context)
    } catch (err) {
      console.error('Connection error:', err)
      setState(s => ({
        ...s,
        isConnecting: false,
        error: err.message
      }))
    }
  }, [room])

  /**
   * Send context data to agent via data channel as client action
   * This allows the agent to know user details and presentation info
   */
  const sendContextToAgent = useCallback(async (context) => {
    if (!room.localParticipant) return

    const contextMessage = JSON.stringify({
      type: 'client_action',
      action: 'update_context',
      payload: context,
      timestamp: Date.now()
    })

    await room.localParticipant.publishData(
      new TextEncoder().encode(contextMessage),
      { reliable: true, topic: 'client_actions' }
    )

    console.log('📤 Context sent to agent (update_context):', context)
  }, [room])

  /**
   * Update context dynamically (e.g., when presentation_id changes)
   */
  const updateContext = useCallback(async (newContext) => {
    contextRef.current = { ...contextRef.current, ...newContext }

    if (state.isConnected) {
      await sendContextToAgent(contextRef.current)
    }
  }, [state.isConnected, sendContextToAgent])

  /**
   * Send action to agent (e.g., button clicked, page changed)
   */
  const sendActionToAgent = useCallback(async (action, payload = {}) => {
    if (!state.isConnected) {
      console.warn('Cannot send action: not connected')
      return
    }

    const message = JSON.stringify({
      type: 'client_action',
      action,
      payload,
      timestamp: Date.now()
    })

    await room.localParticipant.publishData(
      new TextEncoder().encode(message),
      { reliable: true, topic: 'client_actions' }
    )

    console.log('Action sent to agent:', action, payload)
  }, [room, state.isConnected])

  /**
   * Register callback for handling client actions from agent
   */
  const onClientAction = useCallback((callback) => {
    onClientActionRef.current = callback
  }, [])

  const disconnect = useCallback(async () => {
    // Clean up audio detection FIRST before disconnecting
    if (audioCheckIntervalRef.current) {
      clearInterval(audioCheckIntervalRef.current)
      audioCheckIntervalRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    audioAnalyserRef.current = null

    // Set state to disconnected before room disconnect
    setState(s => ({
      ...s,
      isConnected: false,
      isMicEnabled: false,
      agentStatus: 'disconnected'
    }))

    await room.disconnect()
    setTranscripts([])
    setToolCalls([])
    seenSegmentIds.current.clear()
    seenToolCallIds.current.clear()
    contextRef.current = {}
  }, [room])

  const toggleMic = useCallback(async () => {
    const enabled = !state.isMicEnabled
    await room.localParticipant.setMicrophoneEnabled(enabled)
    setState(s => ({ ...s, isMicEnabled: enabled }))
  }, [room, state.isMicEnabled])

  return {
    // State
    ...state,
    transcripts, // Array of {id, role, text, timestamp}
    toolCalls, // Array of {id, tool, args, timestamp}

    // Methods
    connect,
    disconnect,
    toggleMic,
    updateContext,
    sendActionToAgent,
    onClientAction,

    // Get current context
    getContext: () => contextRef.current
  }
}
