import { useState, useRef, useEffect } from 'react'
import { User } from 'lucide-react'
import './DashboardPage.css'

export default function DashboardPage({ projects, user, onCreateProject, onSelectProject, onLogout }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  const handleCreateNew = () => {
    onCreateProject({
      name: `Project ${projects.length + 1}`,
    })
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

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
          <div className="plus-icon">+</div>
          <div className="new-text">New</div>
        </div>

        {projects.map((project) => (
          <div
            key={project.id}
            className="tile project-tile"
            onClick={() => onSelectProject(project)}
          >
            <h3>{project.name}</h3>
            <p>{new Date(project.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
