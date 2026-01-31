import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Info, FileText, Play, Pause, Volume2, Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { updateMessageOpacity } from '../utils/fadeMessages'
import { supabase } from '../lib/supabase'
import { useVoiceAgent } from '../hooks/useVoiceAgent'
import './ProjectPage.css'

export default function ProjectPage({ project, user, onBack, onUpdateProject }) {
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
  const [showPresentDropdown, setShowPresentDropdown] = useState(false)
  const [isPresentMode, setIsPresentMode] = useState(false)
  const [shouldRecord, setShouldRecord] = useState(false)
  const [showPresentControls, setShowPresentControls] = useState(false)
  const [displayedContent, setDisplayedContent] = useState(null)
  const [newAssetIds, setNewAssetIds] = useState(new Set())
  const messagesContainerRef = useRef(null)
  const videoRef = useRef(null)
  const projectIdRef = useRef(null)
  const presentDropdownRef = useRef(null)

  // Voice agents
  const voiceAgent = useVoiceAgent() // Planning agent for create mode
  const presenterAgent = useVoiceAgent() // Presenter agent for presentation mode

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
  }, [messages, voiceAgent.transcripts, voiceAgent.toolCalls])

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

  // Sync video state with planning agent status
  useEffect(() => {
    if (voiceAgent.agentStatus === 'speaking') {
      setVideoState('talk')
    } else if (voiceAgent.agentStatus === 'listening' || voiceAgent.agentStatus === 'thinking') {
      setVideoState('idle')
    }
  }, [voiceAgent.agentStatus])

  const handleSendMessage = (e) => {
    e.preventDefault()

    if (agentInput.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        type: 'user',
        text: agentInput,
      }
      setMessages([...messages, newMessage])

      // Send action to voice agent if connected
      if (voiceAgent.isConnected) {
        voiceAgent.sendActionToAgent('user_message', { text: agentInput })
      }

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

  const handleDeleteAsset = async (asset) => {
    if (!confirm('Delete this asset? This cannot be undone.')) {
      return
    }

    console.log('🗑️ Starting delete for asset:', asset.id)

    try {
      // Delete database record FIRST
      console.log('🗑️ Deleting from database...')
      const { data: deleteData, error: dbError } = await supabase
        .from('content_assets')
        .delete()
        .eq('id', asset.id)
        .select()

      console.log('Database delete result:', { deleteData, dbError })

      if (dbError) {
        console.error('❌ Database delete error:', dbError)
        alert(`Failed to delete asset from database: ${dbError.message}`)
        return
      }

      console.log('✅ Database record deleted')

      // Extract file path from URL
      // URL format: https://gcebekzpnpeunkofchtb.supabase.co/storage/v1/object/public/content-assets/graphs/abc123.png
      console.log('📎 Full asset URL:', asset.file_url)

      const url = new URL(asset.file_url)
      console.log('📎 URL pathname:', url.pathname)

      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/content-assets\/(.+)$/)
      console.log('📎 Path match result:', pathMatch)

      if (pathMatch) {
        const filePath = pathMatch[1]
        console.log('🗑️ Attempting to delete from storage bucket "content-assets", path:', filePath)

        // Delete file from Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('content-assets')
          .remove([filePath])

        console.log('📊 Storage delete result:', {
          storageData,
          storageError,
          deletedCount: storageData?.length || 0
        })

        if (storageError) {
          console.error('❌ Storage delete error:', storageError)
          alert(`Storage delete failed: ${storageError.message}`)
        } else if (storageData && storageData.length > 0) {
          console.log('✅ Storage file deleted:', storageData)
        } else {
          console.warn('⚠️ Storage delete returned 0 files - file may not exist or path is wrong')
        }
      } else {
        console.error('❌ Could not extract file path from URL:', asset.file_url)
      }

      // Remove from local state
      setContentAssets(prev => prev.filter(a => a.id !== asset.id))
      setSelectedAsset(null)

      console.log('✅ Asset deleted successfully from UI')
    } catch (err) {
      console.error('❌ Delete error:', err)
      alert(`Failed to delete asset: ${err.message}`)
    }
  }

  // Video thumbnail component
  const VideoThumbnail = ({ src }) => {
    const videoRef = useRef(null)

    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      const seekToMiddle = () => {
        if (video.duration) {
          video.currentTime = video.duration / 2
        }
      }

      video.addEventListener('loadedmetadata', seekToMiddle)
      return () => video.removeEventListener('loadedmetadata', seekToMiddle)
    }, [src])

    return (
      <video
        ref={videoRef}
        src={src}
        className="asset-preview"
        muted
        playsInline
        preload="metadata"
      />
    )
  }

  // Planning agent connection
  const handleConnectVoice = async () => {
    try {
      await voiceAgent.connect({
        userId: user?.id,
        userName: user?.email || 'User',
        projectId: project.id,
        projectName: project.name,
        presentationId: project.presentation_id,
        mode: 'create'
      })
    } catch (err) {
      console.error('Failed to connect planning agent:', err)
      alert('Failed to connect to planning agent. Make sure backend is running.')
    }
  }

  const handleDisconnectVoice = async () => {
    try {
      await voiceAgent.disconnect()
    } catch (err) {
      console.error('Failed to disconnect planning agent:', err)
    }
  }

  // Presentation mode handlers
  const startPresentation = async (withRecording = false) => {
    setShouldRecord(withRecording)
    setIsPresentMode(true)
    setShowPresentDropdown(false)
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
    }

    // Connect presenter agent with full context
    try {
      const presenterContext = {
        userId: user?.id,
        userEmail: user?.email || 'Unknown',
        projectId: project.id,
        projectName: project.name,
        presentationId: project.presentation_id,
        mode: 'presenter',
        recording: withRecording,
        presentationPlan: presentationPlan ? {
          topic: presentationPlan.structure.topic,
          duration: presentationPlan.structure.duration_total,
          sections: presentationPlan.structure.sections.map(section => ({
            id: section.id,
            title: section.section,
            speaker: section.speaker,
            duration: section.duration,
            content: section.content,
            talking_points: section.talking_points,
            visual_cues: section.visual_cues
          })),
          handoff_cues: presentationPlan.handoff_cues.cues
        } : null,
        contentAssets: contentAssets.map(asset => ({
          id: asset.id,
          type: asset.type,
          url: asset.file_url,
          description: asset.metadata?.description || 'Content asset',
          created_at: asset.created_at
        }))
      }

      console.log('🎯 Connecting presenter agent:', presenterContext)
      await presenterAgent.connect(presenterContext)
    } catch (err) {
      console.error('Failed to connect presenter agent:', err)
    }
  }

  const exitPresentMode = async () => {
    setIsPresentMode(false)
    setShouldRecord(false)
    setDisplayedContent(null)

    if (presenterAgent.isConnected) {
      await presenterAgent.disconnect()
    }

    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
  }

  // Client action handlers for presenter agent
  useEffect(() => {
    if (!isPresentMode) return

    const handleClientAction = (action, payload) => {
      console.log('📥 Client action:', action, payload)

      switch (action) {
        case 'display_content':
          if (payload.asset_id) {
            const asset = contentAssets.find(a => a.id === payload.asset_id)
            if (asset) {
              setDisplayedContent(asset)
            }
          } else if (payload.url) {
            setDisplayedContent({
              type: payload.type || 'image',
              file_url: payload.url,
              metadata: { description: payload.description }
            })
          }
          break

        case 'hide_content':
          setDisplayedContent(null)
          break

        case 'transition_section':
          console.log('🔀 Transition to section:', payload.section_id)
          break

        case 'show_timer':
          console.log('⏱️ Show timer:', payload.duration_seconds)
          break

        default:
          console.log('⚠️ Unknown action:', action)
      }
    }

    presenterAgent.onClientAction(handleClientAction)

    return () => {
      presenterAgent.onClientAction(null)
    }
  }, [isPresentMode, contentAssets, presenterAgent])

  // Mouse tracking for present controls
  useEffect(() => {
    if (!isPresentMode) return

    const handleMouseMove = (e) => {
      const isBottomRight =
        e.clientX > window.innerWidth - 150 &&
        e.clientY > window.innerHeight - 150

      setShowPresentControls(isBottomRight)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isPresentMode])

  // Close present dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (presentDropdownRef.current && !presentDropdownRef.current.contains(event.target)) {
        setShowPresentDropdown(false)
      }
    }

    if (showPresentDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPresentDropdown])

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
    if (!project.presentation_id) return

    console.log('🔴 Setting up real-time subscription for:', project.presentation_id)

    const channel = supabase.channel(`content_assets_${project.presentation_id}`)

    // Listen to ALL events on content_assets (no filter first to debug)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'content_assets'
      },
      (payload) => {
        console.log('🟢 Real-time event received (ANY):', payload.eventType, payload)

        // For DELETE events, check payload.old instead of payload.new
        const record = payload.eventType === 'DELETE' ? payload.old : payload.new
        const presentationIdMatch = record?.presentation_id === project.presentation_id

        console.log('   presentation_id match?', presentationIdMatch, 'record:', record)

        // Only process if it matches our presentation
        if (!presentationIdMatch) {
          console.log('   ❌ Skipping - different presentation')
          return
        }

        if (payload.eventType === 'DELETE') {
          console.log('✅ Removing deleted asset from list:', payload.old.id)
          setContentAssets(prev => prev.filter(a => a.id !== payload.old.id))
        } else if (payload.eventType === 'INSERT' && payload.new.status === 'ready') {
          console.log('✅ Adding new asset to list:', payload.new)
          setContentAssets(prev => [payload.new, ...prev])

          // Mark as new for glow effect
          setNewAssetIds(prev => new Set([...prev, payload.new.id]))

          // Remove glow after 1 second
          setTimeout(() => {
            setNewAssetIds(prev => {
              const newSet = new Set(prev)
              newSet.delete(payload.new.id)
              return newSet
            })
          }, 1000)
        } else if (payload.eventType === 'UPDATE' && payload.new.status === 'ready') {
          console.log('✅ Updating asset status to ready:', payload.new)
          setContentAssets(prev => {
            const exists = prev.find(a => a.id === payload.new.id)
            if (exists) {
              return prev.map(a => a.id === payload.new.id ? payload.new : a)
            }
            // If doesn't exist yet, add it and mark as new
            setNewAssetIds(prevIds => new Set([...prevIds, payload.new.id]))
            setTimeout(() => {
              setNewAssetIds(prevIds => {
                const newSet = new Set(prevIds)
                newSet.delete(payload.new.id)
                return newSet
              })
            }, 1000)
            return [payload.new, ...prev]
          })
        } else {
          console.log('   ℹ️  Event type or status not ready:', payload.eventType, payload.new?.status)
        }
      }
    )

    const subscription = channel.subscribe((status, err) => {
      console.log('🔵 Subscription status:', status)
      if (err) {
        console.error('❌ Subscription error:', err)
      }
    })

    return () => {
      console.log('🔴 Unsubscribing from real-time updates')
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

        <div className="present-btn-container" ref={presentDropdownRef}>
          <button
            className="present-btn"
            onClick={() => setShowPresentDropdown(!showPresentDropdown)}
          >
            <Play size={18} />
            <span>Present</span>
          </button>

          {showPresentDropdown && (
            <div className="present-dropdown">
              <div
                className="present-dropdown-item"
                onClick={() => startPresentation(false)}
              >
                <Play size={16} />
                <span>Present</span>
              </div>
              <div
                className="present-dropdown-item"
                onClick={() => startPresentation(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Play size={16} />
                  <span style={{ fontSize: '12px', color: '#ef4444' }}>●</span>
                </div>
                <span>Present + Record</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="split-view">
        <div className="left-panel">
          <div className={`agent-card ${isAnimating ? 'animating' : ''}`}>
            <div className="panel-header">
              <h2>Agent</h2>
              {voiceAgent.isConnected && (
                <span style={{ fontSize: '12px', color: '#4ade80' }}>
                  Voice: {voiceAgent.agentStatus}
                </span>
              )}
            </div>

            {voiceAgent.error && (
              <div style={{
                background: '#ef4444',
                color: '#fff',
                padding: '10px',
                textAlign: 'center',
                fontSize: '12px'
              }}>
                Error: {voiceAgent.error}
              </div>
            )}

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

                {/* Merge and show live transcripts and tool calls chronologically */}
                {[...voiceAgent.transcripts, ...voiceAgent.toolCalls.map(tc => ({
                  id: tc.id,
                  role: 'tool',
                  text: tc.tool,
                  args: tc.args,
                  timestamp: tc.timestamp
                }))].sort((a, b) => a.timestamp - b.timestamp).map((item) => (
                  item.role === 'tool' ? (
                    <div
                      key={item.id}
                      className="message tool-message"
                    >
                      <div className="tool-name">🔧 {item.text}</div>
                      {item.args && Object.keys(item.args).length > 0 && (
                        <div className="tool-args">
                          {Object.entries(item.args).slice(0, 2).map(([key, val]) => (
                            <span key={key} className="tool-arg">
                              {key}: {typeof val === 'string' && val.length > 30 ? val.slice(0, 30) + '...' : String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      className={`message ${item.role}-message`}
                    >
                      {item.text}
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="input-container">
              {!voiceAgent.isConnected ? (
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button
                    onClick={handleConnectVoice}
                    disabled={voiceAgent.isConnecting}
                    className="voice-btn primary"
                    style={{ flex: 1 }}
                  >
                    {voiceAgent.isConnecting ? (
                      'Connecting...'
                    ) : (
                      <>
                        <Phone size={18} />
                        <span>Start Agent</span>
                      </>
                    )}
                  </button>
                  <button className="voice-btn secondary" style={{ flex: 1 }}>
                    <span>Upload Document</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button
                    onClick={() => voiceAgent.toggleMic()}
                    className={`voice-btn ${voiceAgent.isMicEnabled ? 'active' : 'muted'}`}
                    style={{ flex: 1 }}
                  >
                    {voiceAgent.isMicEnabled ? (
                      <>
                        <Mic size={18} />
                        <span>Mute</span>
                      </>
                    ) : (
                      <>
                        <MicOff size={18} />
                        <span>Unmute</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDisconnectVoice}
                    className="voice-btn danger"
                    style={{ flex: 1 }}
                  >
                    <PhoneOff size={18} />
                    <span>End Call</span>
                  </button>
                </div>
              )}
            </div>
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
                      className={`asset-thumbnail ${newAssetIds.has(asset.id) ? 'new-asset' : ''}`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      {asset.type === 'manim_animation' ? (
                        <VideoThumbnail src={asset.file_url} />
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
                  <button
                    className="asset-modal-delete"
                    onClick={() => handleDeleteAsset(selectedAsset)}
                    title="Delete asset"
                  >
                    Delete
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

      {/* Presentation Mode */}
      {isPresentMode && (
        <div className="presentation-mode">
          <div className="presentation-canvas">
            {displayedContent ? (
              <div className="presented-content">
                {displayedContent.type === 'manim_animation' ? (
                  <video
                    src={displayedContent.file_url}
                    controls
                    autoPlay
                    className="presented-media"
                  />
                ) : (
                  <img
                    src={displayedContent.file_url}
                    alt={displayedContent.metadata?.description || 'Content'}
                    className="presented-media"
                  />
                )}
              </div>
            ) : (
              <div className="presentation-placeholder">
                {shouldRecord && (
                  <div className="recording-indicator">
                    <span className="rec-dot">●</span>
                    <span>Recording</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`presentation-controls ${showPresentControls ? 'visible' : ''}`}>
            <button className="control-btn" title="Play">
              <Play size={20} />
            </button>
            <button className="control-btn" title="Pause">
              <Pause size={20} />
            </button>
            <button
              className="control-btn"
              title={presenterAgent.isMicEnabled ? 'Mute' : 'Unmute'}
              onClick={() => presenterAgent.toggleMic()}
            >
              <Volume2 size={20} />
            </button>
            <button className="control-btn exit-btn" onClick={exitPresentMode} title="Exit">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
