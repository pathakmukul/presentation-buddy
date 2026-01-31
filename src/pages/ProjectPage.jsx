import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Info, FileText } from 'lucide-react'
import { updateMessageOpacity } from '../utils/fadeMessages'
import { supabase } from '../lib/supabase'
import './ProjectPage.css'

export default function ProjectPage({ project, onBack, onUpdateProject }) {
  const [agentInput, setAgentInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(project.name)
  const [isAnimating, setIsAnimating] = useState(false)
  const [messages, setMessages] = useState([])
  const [videoState, setVideoState] = useState('welcome') // 'welcome', 'idle', 'talk'
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [showProjectId, setShowProjectId] = useState(false)
  const [contentAssets, setContentAssets] = useState([])
  const [presentationPlan, setPresentationPlan] = useState(null)
  const [loadingAssets, setLoadingAssets] = useState(true)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const messagesContainerRef = useRef(null)
  const videoRef = useRef(null)
  const projectIdRef = useRef(null)

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

  // Close project ID tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectIdRef.current && !projectIdRef.current.contains(event.target)) {
        setShowProjectId(false)
      }
    }

    if (showProjectId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProjectId])

  // Fetch content assets and presentation plan
  useEffect(() => {
    const fetchData = async () => {
      if (!project.presentation_id) {
        setLoadingAssets(false)
        return
      }

      try {
        // Fetch content assets
        const { data: assets, error: assetsError } = await supabase
          .from('content_assets')
          .select('*')
          .eq('presentation_id', project.presentation_id)
          .eq('status', 'ready')
          .order('created_at', { ascending: false })

        if (assetsError) {
          console.error('Error fetching assets:', assetsError)
        } else {
          setContentAssets(assets || [])
        }

        // Fetch presentation plan
        const { data: plan, error: planError } = await supabase
          .from('presentation_plans')
          .select('*')
          .eq('presentation_id', project.presentation_id)
          .single()

        if (planError) {
          console.error('Error fetching plan:', planError)
        } else {
          setPresentationPlan(plan)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoadingAssets(false)
      }
    }

    fetchData()

    // Real-time subscription for assets
    const subscription = supabase
      .channel(`content_${project.presentation_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_assets',
          filter: `presentation_id=eq.${project.presentation_id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'ready') {
            setContentAssets(prev => [payload.new, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [project.presentation_id])

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 onClick={() => setIsEditing(true)} className="project-title">
              {project.name}
            </h1>
            <div className="project-id-container" ref={projectIdRef}>
              <button
                onClick={() => setShowProjectId(!showProjectId)}
                className="info-icon-btn"
                title="Project ID"
              >
                <Info size={16} color="#666" />
              </button>
              {showProjectId && (
                <div className="project-id-bubble">
                  <div className="project-id-label">Project ID:</div>
                  <div className="project-id-value">{project.id}</div>
                  {project.presentation_id && (
                    <>
                      <div className="project-id-label" style={{ marginTop: '12px' }}>Presentation ID:</div>
                      <div className="project-id-value">{project.presentation_id}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
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

              {!loadingAssets && (contentAssets.length > 0 || presentationPlan) && (
                <div className="content-assets-overlay">
                  {presentationPlan && (
                    <div
                      className="asset-thumbnail plan-thumbnail"
                      onClick={() => setShowPlanModal(true)}
                      title="Presentation Plan"
                    >
                      <div className="plan-icon">
                        <FileText size={32} />
                      </div>
                    </div>
                  )}

                  {contentAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="asset-thumbnail"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      {asset.type === 'manim_animation' ? (
                        <video
                          src={asset.file_url}
                          className="asset-preview"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={asset.file_url}
                          alt={asset.type}
                          className="asset-preview"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedAsset && (
              <div className="asset-modal" onClick={() => setSelectedAsset(null)}>
                <div className="asset-modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="asset-modal-close" onClick={() => setSelectedAsset(null)}>
                    ×
                  </button>
                  {selectedAsset.type === 'manim_animation' ? (
                    <video
                      src={selectedAsset.file_url}
                      controls
                      autoPlay
                      className="asset-modal-media"
                    />
                  ) : (
                    <img
                      src={selectedAsset.file_url}
                      alt={selectedAsset.type}
                      className="asset-modal-media"
                    />
                  )}
                </div>
              </div>
            )}

            {showPlanModal && presentationPlan && (
              <div className="asset-modal" onClick={() => setShowPlanModal(false)}>
                <div className="plan-modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="asset-modal-close" onClick={() => setShowPlanModal(false)}>
                    ×
                  </button>
                  <div className="plan-modal-inner">
                    <h2>{presentationPlan.structure.topic}</h2>
                    <div className="plan-meta">
                      <span>Duration: {presentationPlan.structure.duration_total}s</span>
                      <span>Sections: {presentationPlan.structure.sections.length}</span>
                    </div>

                    <div className="plan-sections">
                      {presentationPlan.structure.sections.map((section, idx) => (
                        <div key={section.id} className="plan-section">
                          <div className="section-header">
                            <span className="section-number">{idx + 1}</span>
                            <h3>{section.section}</h3>
                            <span className="section-speaker">{section.speaker}</span>
                            <span className="section-duration">{section.duration}s</span>
                          </div>
                          <p className="section-content">{section.content}</p>
                          {section.talking_points && (
                            <ul className="talking-points">
                              {section.talking_points.map((point, pidx) => (
                                <li key={pidx}>{point}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="plan-cues">
                      <h3>Handoff Cues</h3>
                      {presentationPlan.handoff_cues.cues.map((cue, idx) => (
                        <div key={idx} className="cue-item">
                          <span className="cue-trigger">{cue.trigger}</span>
                          {cue.phrase && <span className="cue-phrase">"{cue.phrase}"</span>}
                          {cue.timestamp && <span className="cue-time">{cue.timestamp}s</span>}
                          <span className="cue-action">→ {cue.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
