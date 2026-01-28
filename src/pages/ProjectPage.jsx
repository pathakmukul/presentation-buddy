import { useState, useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { updateMessageOpacity } from '../utils/fadeMessages'
import './ProjectPage.css'

export default function ProjectPage({ project, onBack, onUpdateProject }) {
  const [agentInput, setAgentInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(project.name)
  const [isAnimating, setIsAnimating] = useState(false)
  const [messages, setMessages] = useState([])
  const [videoState, setVideoState] = useState('welcome') // 'welcome', 'idle', 'talk'
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const messagesContainerRef = useRef(null)
  const videoRef = useRef(null)

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

  useEffect(() => {
    if (isAnimating) {
      setVideoState('talk')
    }
  }, [isAnimating])

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
        <div style={{ width: '80px' }}></div>
      </header>

      <div className="split-view">
        <div className="left-panel">
          <div className={`agent-card ${isAnimating ? 'animating' : ''}`}>
            <div className="panel-header">
              <h2>Agent</h2>
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
              </div>
            </div>

            <form className="input-container" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
