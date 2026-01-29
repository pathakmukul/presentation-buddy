import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { updateMessageOpacity } from '../utils/fadeMessages'
import { useVoiceAgent } from '../hooks/useVoiceAgent'
import './ProjectPage.css'

export default function ProjectPage({ project, user, onBack, onUpdateProject }) {
  const [agentInput, setAgentInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(project.name)
  const [isAnimating, setIsAnimating] = useState(false)
  const [messages, setMessages] = useState([])
  const [videoState, setVideoState] = useState('welcome')
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const messagesContainerRef = useRef(null)
  const videoRef = useRef(null)

  // Voice agent integration
  const voiceAgent = useVoiceAgent()

  // Initialize context when component mounts
  useEffect(() => {
    console.log('Project loaded with context:', {
      userId: user?.id,
      userName: user?.email,
      projectId: project.id,
      projectName: project.name
    })
  }, [project.id, user])

  // Handle client actions from agent
  useEffect(() => {
    voiceAgent.onClientAction((action, payload) => {
      console.log('Handling client action:', action, payload)

      switch (action) {
        case 'display_content':
          // TODO: Display content based on asset_id and mode
          console.log('Display content:', payload)
          break

        case 'transition_section':
          // TODO: Transition to new section
          console.log('Transition section:', payload)
          break

        case 'show_timer':
          // TODO: Show timer
          console.log('Show timer:', payload)
          break

        default:
          console.log('Unknown action:', action, payload)
      }
    })
  }, [voiceAgent])

  // Update video state based on agent status
  useEffect(() => {
    if (voiceAgent.agentStatus === 'speaking') {
      setVideoState('talk')
    } else if (voiceAgent.agentStatus === 'listening' && !isFirstLoad) {
      setVideoState('idle')
    }
  }, [voiceAgent.agentStatus, isFirstLoad])

  useEffect(() => {
    const handleScroll = () => {
      updateMessageOpacity(messagesContainerRef.current)
    }

    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      handleScroll()
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [messages])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleVideoEnd = () => {
      if (videoState === 'welcome') {
        setVideoState('idle')
        setIsFirstLoad(false)
      } else if (videoState === 'talk') {
        setVideoState('idle')
      }
    }

    video.addEventListener('ended', handleVideoEnd)
    return () => video.removeEventListener('ended', handleVideoEnd)
  }, [videoState])

  const handleConnectVoice = async () => {
    try {
      await voiceAgent.connect({
        userId: user?.id,
        userName: user?.email || 'User',
        projectId: project.id,
        projectName: project.name,
        presentationId: project.presentation_id, // Auto-created presentation ID
        mode: 'create' // 'create' or 'present'
      })
    } catch (err) {
      console.error('Failed to connect voice agent:', err)
      alert('Failed to connect to voice agent. Make sure backend is running.')
    }
  }

  const handleDisconnectVoice = async () => {
    await voiceAgent.disconnect()
  }

  const handleSendMessage = (e) => {
    e.preventDefault()

    if (agentInput.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        type: 'user',
        text: agentInput,
      }
      setMessages([...messages, newMessage])
      setAgentInput('')

      // Send action to voice agent if connected
      if (voiceAgent.isConnected) {
        voiceAgent.sendActionToAgent('user_message', { text: agentInput })
      }

      setIsAnimating(true)

      setTimeout(() => {
        const agentResponse = {
          id: (Date.now() + 1).toString(),
          type: 'agent',
          text: 'Working on your request...',
        }
        setMessages((prev) => [...prev, agentResponse])
        setIsAnimating(false)
      }, 2000)
    }
  }

  const handleRename = () => {
    if (editedName.trim() && editedName !== project.name) {
      onUpdateProject({
        ...project,
        name: editedName.trim(),
      })

      // Update context with new project name
      if (voiceAgent.isConnected) {
        voiceAgent.updateContext({ projectName: editedName.trim() })
      }
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedName(project.name)
    setIsEditing(false)
  }

  return (
    <div className="project-container">
      <header className="project-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={20} color="#e0e0e0" />
        </button>
        {isEditing ? (
          <div className="edit-name-container">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="edit-name-input"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') handleCancelEdit()
              }}
            />
            <button onClick={handleRename} className="save-btn">
              Save
            </button>
            <button onClick={handleCancelEdit} className="cancel-btn">
              Cancel
            </button>
          </div>
        ) : (
          <h1 onClick={() => setIsEditing(true)} className="project-title">
            {project.name}
          </h1>
        )}

        {/* Voice agent controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {voiceAgent.isConnected ? (
            <>
              <button
                onClick={() => voiceAgent.toggleMic()}
                className="voice-control-btn"
                title={voiceAgent.isMicEnabled ? 'Mute' : 'Unmute'}
              >
                {voiceAgent.isMicEnabled ? (
                  <Mic size={20} color="#4ade80" />
                ) : (
                  <MicOff size={20} color="#ef4444" />
                )}
              </button>
              <button
                onClick={handleDisconnectVoice}
                className="voice-control-btn"
                title="Disconnect"
              >
                <PhoneOff size={20} color="#ef4444" />
              </button>
              <span style={{ color: '#4ade80', fontSize: '12px' }}>
                {voiceAgent.agentStatus}
              </span>
            </>
          ) : (
            <button
              onClick={handleConnectVoice}
              className="voice-control-btn"
              disabled={voiceAgent.isConnecting}
              title="Connect Voice Agent"
            >
              <Phone size={20} color="#e0e0e0" />
            </button>
          )}
        </div>
      </header>

      {voiceAgent.error && (
        <div style={{
          background: '#ef4444',
          color: '#fff',
          padding: '10px',
          textAlign: 'center'
        }}>
          Error: {voiceAgent.error}
        </div>
      )}

      <div className="split-view">
        <div className="left-panel">
          <div className={`agent-card ${isAnimating ? 'animating' : ''}`}>
            <div className="panel-header">
              <h2>Agent</h2>
              {voiceAgent.isConnected && (
                <span style={{ fontSize: '12px', color: '#888' }}>
                  Voice Connected
                </span>
              )}
            </div>

            <video
              ref={videoRef}
              className="agent-video"
              autoPlay
              muted
              playsInline
              key={videoState}
            >
              <source
                src={
                  videoState === 'welcome'
                    ? '/videos/hello.mp4'
                    : videoState === 'talk'
                    ? '/videos/Talk.mp4'
                    : '/videos/idle.mp4'
                }
                type="video/mp4"
              />
            </video>

            <div className="messages-container" ref={messagesContainerRef}>
              <div className="messages-wrapper">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.type}-message`}
                  >
                    {message.text}
                  </div>
                ))}

                {/* Show transcript if voice connected */}
                {voiceAgent.transcript && (
                  <div className="message agent-message" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                    [Voice: {voiceAgent.transcript.slice(-100)}]
                  </div>
                )}
              </div>
            </div>

            <form className="input-container" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder={voiceAgent.isConnected ? "Or type a message..." : "Type a message..."}
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>

        <div className="right-panel">
          <div className={`preview-card ${isAnimating ? 'animating' : ''}`}>
            <div className="panel-header">
              <h2>Preview</h2>
            </div>

            <div className="preview-container">
              <div className="preview-screen">
                <div className="preview-placeholder">
                  <h3>1080p Preview Area</h3>
                  <p>Your presentation will appear here</p>
                  {voiceAgent.isConnected && (
                    <p style={{ color: '#4ade80', marginTop: '10px' }}>
                      Voice agent ready for content display
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
