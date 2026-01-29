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

  const [transcript, setTranscript] = useState('')
  const contextRef = useRef({}) // Store context (user info, presentation_id)
  const onClientActionRef = useRef(null) // Callback for client actions

  // Handle agent audio track subscription
  useEffect(() => {
    const handleTrackSubscribed = (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        console.log('Agent audio connected')
        const audioEl = track.attach()
        document.body.appendChild(audioEl)

        setState(s => ({ ...s, agentStatus: 'speaking' }))
      }
    }

    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach(el => el.remove())
        setState(s => ({ ...s, agentStatus: 'listening' }))
      }
    }

    // Handle data from agent (client actions, transcript)
    const handleDataReceived = (payload, participant, kind, topic) => {
      const decoder = new TextDecoder()
      const text = decoder.decode(payload)

      try {
        const data = JSON.parse(text)

        // Handle transcript updates
        if (topic === 'transcript') {
          setTranscript(prev => prev + ' ' + text)
        }

        // Handle client actions from agent
        if (topic === 'client_actions' && data.type === 'client_action') {
          console.log('Client action received:', data.action, data.payload)

          // Call the registered callback if available
          if (onClientActionRef.current) {
            onClientActionRef.current(data.action, data.payload)
          }
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

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    room.on(RoomEvent.DataReceived, handleDataReceived)
    room.on(RoomEvent.Disconnected, handleDisconnected)

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      room.off(RoomEvent.DataReceived, handleDataReceived)
      room.off(RoomEvent.Disconnected, handleDisconnected)
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
      // TODO: Get token from your backend endpoint
      // This endpoint should call VocalBridge API to get LiveKit token
      const res = await fetch('/api/voice-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_name: context.userName || 'User',
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
   * Send context data to agent via data channel
   * This allows the agent to know user details and presentation info
   */
  const sendContextToAgent = useCallback(async (context) => {
    if (!room.localParticipant) return

    const contextMessage = JSON.stringify({
      type: 'context_update',
      context: context,
      timestamp: Date.now()
    })

    await room.localParticipant.publishData(
      new TextEncoder().encode(contextMessage),
      { reliable: true, topic: 'context' }
    )

    console.log('Context sent to agent:', context)
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
    await room.disconnect()
    setTranscript('')
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
    transcript,

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
