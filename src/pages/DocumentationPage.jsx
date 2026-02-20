import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import './DocumentationPage.css'

const SECTIONS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'how-it-works', title: 'How It Works' },
  { id: 'dashboard', title: 'Dashboard' },
  { id: 'workspace', title: 'Project Workspace' },
  { id: 'uploading', title: 'Uploading Content' },
  { id: 'creating-plan', title: 'Creating a Plan' },
  { id: 'generated-content', title: 'Generated Content' },
  { id: 'presentation-mode', title: 'Presentation Mode' },
  { id: 'controls', title: 'Presentation Controls' },
  { id: 'themes', title: 'Themes' },
  { id: 'support-levels', title: 'Support Levels' },
  { id: 'video-download', title: 'Video Download' },
  { id: 'post-editing', title: 'Post Editing' },
  { id: 'tips', title: 'Tips' },
  { id: 'requirements', title: 'Requirements' },
  { id: 'coming-soon', title: 'Coming Soon' },
]

export default function DocumentationPage({ onBack }) {
  const [activeSection, setActiveSection] = useState('welcome')

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.querySelector('.docs-content-card')
      if (!scrollContainer) return

      const scrollTop = scrollContainer.scrollTop

      for (const section of SECTIONS) {
        const element = document.getElementById(section.id)
        if (element) {
          const offsetTop = element.offsetTop - 100
          const offsetBottom = offsetTop + element.offsetHeight

          if (scrollTop >= offsetTop && scrollTop < offsetBottom) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    const scrollContainer = document.querySelector('.docs-content-card')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="docs-container">
      <header className="docs-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={20} color="#e0e0e0" />
        </button>
        <h1>Documentation</h1>
      </header>

      <div className="docs-layout">
        {/* Sidebar Navigation */}
        <nav className="docs-sidebar">
          <ul>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  className={activeSection === section.id ? 'active' : ''}
                  onClick={() => scrollToSection(section.id)}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content Card */}
        <div className="docs-content-card">
          <div className="docs-content">
            {/* Introduction */}
            <section className="docs-section" id="welcome">
              <h2>Welcome to PresentBuddy</h2>
              <p>
                PresentBuddy is an AI-powered content creation platform where you work with voice agents
                to create presentations and videos. You speak naturally with AI agents who help you
                plan your content, generate supporting visuals, and co-host your delivery in real-time.
              </p>
              <p>
                The entire experience is voice-based - you talk to the agents, they talk back,
                and together you create engaging content.
              </p>

              <h3>What You Can Create</h3>
              <ul>
                <li>
                  <strong>Live Presentations</strong><br />
                  Present with an AI co-host who guides you through sections, displays visuals,
                  and responds to your conversation in real-time.
                </li>
                <li>
                  <strong>Videos for YouTube & More</strong><br />
                  Record your presentation sessions and download them for platforms like YouTube,
                  courses, or social media.
                </li>
              </ul>
              <p>
                During the planning phase, the AI generates supporting content for your presentation
                including graphs, charts, and animations based on your conversation.
              </p>
            </section>

            {/* How It Works */}
            <section className="docs-section" id="how-it-works">
              <h2>How It Works</h2>
              <p>
                PresentBuddy has two AI agents that work with you at different stages:
              </p>

              <div className="docs-agent-boxs">
                <div className="docs-agent-box">
                  <div className="docs-agent-box-header">
                    <span className="agent-number">1</span>
                    <h3>Planner Agent</h3>
                  </div>
                  <p className="agent-description">
                    When you first open a project, connect to the Planner Agent to create your presentation plan.
                  </p>
                  <ul>
                    <li>Discuss your topic through voice conversation</li>
                    <li>Structure content into logical sections</li>
                    <li>Create talking points for each section</li>
                    <li>Generate visual assets (graphs, animations)</li>
                    <li>Build a complete presentation plan</li>
                  </ul>
                  <p className="agent-tip">
                    Click the phone icon to connect, then speak naturally about what you want to present.
                  </p>
                </div>

                <div className="docs-agent-box">
                  <div className="docs-agent-box-header">
                    <span className="agent-number">2</span>
                    <h3>Presenter Agent</h3>
                  </div>
                  <p className="agent-description">
                    When you're ready to present, the Presenter Agent acts as your co-host during delivery.
                  </p>
                  <ul>
                    <li>Guides you through each section</li>
                    <li>Displays visual content at the right moments</li>
                    <li>Listens and responds conversationally</li>
                    <li>Can take over sections (CoHost mode)</li>
                    <li>Helps if you get stuck or pause</li>
                  </ul>
                  <p className="agent-tip">
                    Click Present to enter presentation mode - the agent connects automatically.
                  </p>
                </div>
              </div>
            </section>

            {/* Dashboard */}
            <section className="docs-section" id="dashboard">
              <h2>Dashboard</h2>
              <p>
                The dashboard shows all your presentation projects as tiles.
              </p>
              <ul>
                <li><strong>Create New</strong> - Click to start a fresh project</li>
                <li><strong>Project Tiles</strong> - Click any tile to open that project</li>
                <li><strong>Three-dot Menu</strong> - Delete a project (this cannot be undone)</li>
              </ul>
              <p>
                Project tiles show thumbnails of your content if you have images or videos uploaded.
              </p>
            </section>

            {/* Project Workspace */}
            <section className="docs-section" id="workspace">
              <h2>Project Workspace</h2>
              <p>
                When you open a project, you see two panels:
              </p>

              <h3>Left Panel: Agent Area</h3>
              <p>
                This is where you interact with the voice agents:
              </p>
              <ul>
                <li><strong>Video Avatar</strong> - Shows the agent's state (idle, speaking, listening)</li>
                <li><strong>Transcripts</strong> - Live transcription of your conversation appears here</li>
                <li><strong>Connect Button</strong> - Phone icon to start/end voice connection</li>
                <li><strong>Microphone Toggle</strong> - Mute/unmute your mic during conversation</li>
              </ul>

              <h3>Right Panel: Preview Area</h3>
              <p>
                Shows a preview of your presentation:
              </p>
              <ul>
                <li><strong>Preview Screen</strong> - 16:9 display showing your first section</li>
                <li><strong>Theme Selector</strong> - Choose background theme (top-right)</li>
                <li><strong>Content Thumbnails</strong> - Your uploaded assets and plan appear at the bottom</li>
              </ul>

              <h3>Renaming Your Project</h3>
              <p>
                Click on the project title in the header bar to edit it.
              </p>
            </section>

            {/* Uploading Content */}
            <section className="docs-section" id="uploading">
              <h2>Uploading Content</h2>
              <p>
                You can upload supporting materials for your presentation:
              </p>
              <ul>
                <li><strong>Images</strong> - PNG, JPG, GIF, WebP (diagrams, charts, photos)</li>
                <li><strong>Documents</strong> - TXT files (notes, scripts, research)</li>
              </ul>
              <p>
                To upload, use the upload area in the workspace - click to select files or drag and drop.
              </p>
              <p>
                <strong>Tip:</strong> Upload images before talking to the Planner Agent.
                The agent can see what you've uploaded and incorporate them into your presentation plan.
              </p>
            </section>

            {/* Creating a Plan */}
            <section className="docs-section" id="creating-plan">
              <h2>Creating a Plan</h2>
              <p>
                Your presentation needs a plan before you can present. Here's how to create one:
              </p>
              <ol>
                <li>Upload any supporting content (images, documents)</li>
                <li>Click the phone icon to connect to the Planner Agent</li>
                <li>Allow microphone access when prompted</li>
                <li>Start speaking - tell the agent what your presentation is about</li>
                <li>The agent will ask about your audience, key messages, and preferences</li>
                <li>Discuss the structure and let the agent create sections</li>
                <li>The agent generates visual content (graphs, animations) as needed</li>
                <li>When satisfied, the agent saves your plan</li>
              </ol>
              <p>
                You can view your plan anytime by clicking the plan icon in the content thumbnails area.
              </p>
            </section>

            {/* Generated Content */}
            <section className="docs-section" id="generated-content">
              <h2>Generated Content</h2>
              <p>
                The Planner Agent can generate visual content for your presentation:
              </p>
              <ul>
                <li><strong>Graphs</strong> - Bar charts, line graphs, pie charts with your data</li>
                <li><strong>Manim Animations</strong> - Mathematical and scientific visualizations</li>
                <li><strong>Images</strong> - AI-generated illustrations and diagrams</li>
              </ul>
              <p>
                Generated content appears in your content thumbnails once ready.
                The agent will reference these during your presentation.
              </p>
            </section>

            {/* Presentation Mode */}
            <section className="docs-section" id="presentation-mode">
              <h2>Presentation Mode</h2>
              <p>
                When you have a plan ready, you can start presenting:
              </p>
              <ol>
                <li>Click the <strong>Present</strong> dropdown in the header</li>
                <li>Select <strong>Present</strong> to enter presentation mode</li>
                <li>Your screen goes fullscreen with your presentation</li>
                <li>The Presenter Agent connects automatically</li>
                <li>Start speaking - the agent guides you through your sections</li>
              </ol>

              <h3>During the Presentation</h3>
              <p>
                The Presenter Agent will:
              </p>
              <ul>
                <li>Display images, graphs, and animations when relevant</li>
                <li>Listen to what you're saying and respond appropriately</li>
                <li>Handle transitions between sections</li>
                <li>Show the current section's content as a fallback when no visual is active</li>
              </ul>
              <p>
                Speak naturally - you're having a conversation with your co-host, not reading a script.
              </p>
            </section>

            {/* Presentation Controls */}
            <section className="docs-section" id="controls">
              <h2>Presentation Controls</h2>
              <p>
                Hover at the bottom center of the screen during presentation to reveal controls:
              </p>
              <ul>
                <li>
                  <strong>Pause Conversation</strong> (Play/Pause icon)<br />
                  Pauses everything - mutes your mic and the agent's voice.
                  Use when you need a moment or have an interruption.
                </li>
                <li>
                  <strong>Mute Agent</strong> (Speaker icon)<br />
                  Silences the agent but it still listens.
                  Use when you want to speak uninterrupted.
                </li>
                <li>
                  <strong>Mute Mic</strong> (Microphone icon)<br />
                  Mutes your microphone. The agent can still speak but can't hear you.
                </li>
                <li>
                  <strong>Exit</strong> (X button)<br />
                  Ends the presentation and returns to the workspace.
                </li>
              </ul>
            </section>

            {/* Themes */}
            <section className="docs-section" id="themes">
              <h2>Themes</h2>
              <p>
                Choose a background theme for your presentation:
              </p>
              <ul>
                <li><strong>None</strong> - Solid black background</li>
                <li><strong>Dots</strong> - Animated dot grid pattern</li>
                <li><strong>Lines</strong> - Floating transparent lines</li>
                <li><strong>Light</strong> - White background with dark text</li>
              </ul>
              <p>
                Select your theme from the dropdown in the top-right of the preview area.
                Your selection is saved for future sessions.
              </p>
            </section>

            {/* Support Levels */}
            <section className="docs-section" id="support-levels">
              <h2>Agent Support Levels</h2>
              <p>
                When creating your plan, you can set how much the Presenter Agent participates:
              </p>
              <ul>
                <li>
                  <strong>CoHost</strong><br />
                  The agent presents entire sections independently.
                  You take turns presenting different parts.
                </li>
                <li>
                  <strong>When Stuck</strong><br />
                  The agent monitors your speech. If you pause for 2-3 seconds,
                  it jumps in to help you continue.
                </li>
                <li>
                  <strong>Moderator</strong><br />
                  The agent provides transitions and summaries between your sections,
                  but you do most of the presenting.
                </li>
              </ul>
            </section>

            {/* Video Download */}
            <section className="docs-section" id="video-download">
              <h2>Video Download</h2>
              <p>
                When you select <strong>Present + Record</strong> from the Present dropdown, your entire
                presentation session is recorded including your voice, the agent's voice, and all visual
                content displayed on screen.
              </p>
              <p>
                Your selected theme (Dots, Lines, Light, or None) is baked directly into the video -
                what you see during your presentation is exactly what appears in the downloaded file.
              </p>

              <h3>How It Works</h3>
              <ol>
                <li>Click <strong>Present + Record</strong> and allow microphone access</li>
                <li>Present as usual - a red recording indicator appears in the corner</li>
                <li>When you exit the presentation, you're taken to the Recording Complete page</li>
                <li>Preview your recording, then click <strong>Download</strong> to save as a WebM file</li>
              </ol>

              <h3>What Gets Recorded</h3>
              <ul>
                <li>All visual content (images, videos, animations, text slides)</li>
                <li>Your selected background theme</li>
                <li>Your voice (microphone audio)</li>
                <li>The agent's voice</li>
              </ul>
              <p>
                Videos are recorded at 1080p / 30fps. The file stays in your browser until you download it -
                nothing is uploaded to the cloud.
              </p>
            </section>

            {/* Auto Edit */}
            <section className="docs-section" id="post-editing">
              <h2>Auto Edit</h2>
              <p>
                From the Recording Complete page, click <strong>Edit</strong> to open the editor.
                The editor helps you automatically remove "dead time" from your recording -
                moments where nothing meaningful is happening.
              </p>

              <h3>What Is Dead Time?</h3>
              <p>
                Dead time is any period where <strong>both</strong> of these conditions are true at the same time:
              </p>
              <ul>
                <li><strong>Nobody is speaking</strong> - both you and the agent are silent</li>
                <li><strong>Nothing is changing on screen</strong> - no new visuals, no video playing, no transitions</li>
              </ul>
              <p>
                This typically happens during latency gaps while waiting for the agent to respond,
                or during pauses between sections. If either you or the agent is speaking, or if
                any visual content is changing on screen, that time is kept.
              </p>

              <h3>How Auto Detect Works</h3>
              <ol>
                <li>Click <strong>Auto Detect</strong> to start the analysis</li>
                <li>The system scans your audio for silence (using waveform analysis)</li>
                <li>It simultaneously scans the video for static frames (pixel-level comparison)</li>
                <li>Only segments where both audio is silent AND visuals are static are marked as dead time</li>
                <li>Segments shorter than 2 seconds are ignored - only meaningful gaps are flagged</li>
              </ol>

              <h3>Reading the Timeline</h3>
              <p>
                After detection, a timeline bar appears below your video:
              </p>
              <ul>
                <li><strong>Green segments</strong> - Active content that will be kept</li>
                <li><strong>Red segments</strong> - Dead time that will be removed</li>
                <li><strong>White line</strong> - Current playback position (moves as you play the original)</li>
              </ul>
              <p>
                Hover over any segment to see its exact time range and type.
              </p>

              <h3>Trimming</h3>
              <p>
                Once you're satisfied with the detected segments, click <strong>Apply Trim</strong>.
                This uses FFmpeg (running in your browser) to cut out the dead segments and stitch
                the active parts together into a shorter video.
              </p>
              <p>
                After trimming, you can switch between the <strong>Original</strong> and <strong>Trimmed</strong>
                versions using the tabs above the video player. Both versions are available for download.
              </p>

              <h3>Video Content Protection</h3>
              <p>
                If your presentation includes video content (like Manim animations), those segments are
                automatically protected - they will never be trimmed, even if there happens to be silence
                during playback.
              </p>
            </section>

            {/* Tips */}
            <section className="docs-section" id="tips">
              <h2>Tips</h2>

              <h3>Voice Quality</h3>
              <ul>
                <li>Use a good microphone for best voice recognition</li>
                <li>Speak clearly and at a natural pace</li>
                <li>Minimize background noise</li>
                <li>Test your audio before important presentations</li>
              </ul>

              <h3>Content</h3>
              <ul>
                <li>Upload images before planning - the agent can use them</li>
                <li>Use descriptive filenames for your uploads</li>
                <li>Keep text documents focused and organized</li>
              </ul>

              <h3>Presenting</h3>
              <ul>
                <li>Treat it as a conversation with your co-host</li>
                <li>Don't be afraid to pause - use the pause button if needed</li>
                <li>Let the agent guide transitions between topics</li>
                <li>You can ask the agent to show specific content</li>
              </ul>
            </section>

            {/* Requirements */}
            <section className="docs-section" id="requirements">
              <h2>Requirements</h2>
              <ul>
                <li><strong>Browser</strong> - Chrome, Edge, or Safari (latest versions)</li>
                <li><strong>Microphone</strong> - Required for voice interaction</li>
                <li><strong>Speakers/Headphones</strong> - To hear the agent</li>
                <li><strong>Internet</strong> - Stable connection for real-time voice</li>
              </ul>
            </section>

            {/* Future ToDos */}
            <section className="docs-section" id="coming-soon">
              <h2>Coming Soon</h2>
              <p>
                Features we're actively working on, roughly in order of priority:
              </p>

              <h3>High Priority</h3>
              <ul>
                <li><strong>Advanced Editing</strong> - Manual timeline editing, drag to adjust trim points, select/deselect individual segments, and fine-tune cuts before exporting</li>
                <li><strong>Reduce Latency</strong> - Faster response between agent speech and screen content</li>
                <li><strong>Retain Conversation History</strong> - Continue planning conversations across sessions</li>
              </ul>

              <h3>Enhancements</h3>
              <ul>
                <li><strong>Image Generation</strong> - AI-generated images using image models (DALL-E, etc.)</li>
                <li><strong>More Themes</strong> - Additional background themes and customization options</li>
                <li><strong>Better Static Content</strong> - Improved section slides and text displays</li>
                <li><strong>Better Intro Screen</strong> - Enhanced presentation mode opening experience</li>
              </ul>

              <h3>Collaboration</h3>
              <ul>
                <li><strong>Share Projects</strong> - Invite others to view or collaborate on projects</li>
              </ul>

              <p style={{ marginTop: '24px', color: '#666', fontStyle: 'italic' }}>
                And more to come...
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
