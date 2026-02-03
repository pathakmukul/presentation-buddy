import { useState, useRef, useEffect } from 'react'
import { User, Presentation, MoreVertical, Trash2 } from 'lucide-react'
import './DashboardPage.css'

export default function DashboardPage({ projects, user, onCreateProject, onSelectProject, onDeleteProject, onLogout }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [openProjectMenu, setOpenProjectMenu] = useState(null)
  const menuRef = useRef(null)
  const projectMenuRef = useRef(null)

  const handleCreateNew = () => {
    onCreateProject({
      name: `Project ${projects.length + 1}`,
    })
  }

  const handleDeleteClick = (e, project) => {
    e.stopPropagation()
    if (confirm(`Delete "${project.name}"? This will delete all assets and cannot be undone.`)) {
      onDeleteProject(project)
    }
    setOpenProjectMenu(null)
  }

  const handleMenuClick = (e, projectId) => {
    e.stopPropagation()
    setOpenProjectMenu(openProjectMenu === projectId ? null : projectId)
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target)) {
        setOpenProjectMenu(null)
      }
    }

    if (showUserMenu || openProjectMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu, openProjectMenu])

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>My Projects</h1>

        <div className="user-menu-container" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="user-icon-btn"
            title="User menu"
          >
            <User size={20} color="#e0e0e0" />
          </button>

          {showUserMenu && (
            <div className="user-menu-dropdown">
              <div className="user-email">{user?.email}</div>
              <button onClick={onLogout} className="logout-btn-dropdown">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="tile-grid">
        <div className="tile new-tile" onClick={handleCreateNew}>
          <div className="new-tile-content">
            <div className="plus-icon">+</div>
            <div className="new-text">Create New</div>
          </div>
        </div>

        {projects.map((project) => (
          <div
            key={project.id}
            className={`tile project-tile ${project.thumbnail_url ? 'has-thumbnail' : ''}`}
            onClick={() => onSelectProject(project)}
          >
            {project.thumbnail_url && project.thumbnail_type === 'manim_animation' ? (
              <video
                className="tile-thumbnail-video"
                src={project.thumbnail_url}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  // Seek to 3-4 seconds or middle if video is shorter
                  const video = e.target
                  video.currentTime = Math.min(3.5, video.duration / 2)
                }}
              />
            ) : project.thumbnail_url ? (
              <img
                className="tile-thumbnail"
                src={project.thumbnail_url}
                alt=""
                loading="lazy"
              />
            ) : null}
            <div className="tile-bg-pattern">
              <div className="pattern-circle circle-1"></div>
              <div className="pattern-circle circle-2"></div>
            </div>
            <div className="tile-content">
              <div className="tile-icon">
                <Presentation size={28} />
              </div>
              <h3>{project.name}</h3>
              <p>{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
            <div className="tile-shine"></div>

            {/* Project menu */}
            <div
              className="tile-menu-container"
              ref={openProjectMenu === project.id ? projectMenuRef : null}
            >
              <button
                className="tile-menu-btn"
                onClick={(e) => handleMenuClick(e, project.id)}
                title="Options"
              >
                <MoreVertical size={18} />
              </button>

              {openProjectMenu === project.id && (
                <div className="tile-menu-dropdown">
                  <button
                    className="tile-menu-item delete"
                    onClick={(e) => handleDeleteClick(e, project)}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
