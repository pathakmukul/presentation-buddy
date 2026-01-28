import './DashboardPage.css'

export default function DashboardPage({ projects, onCreateProject, onSelectProject, onLogout }) {
  const handleCreateNew = () => {
    const newProject = {
      id: Date.now().toString(),
      name: `Project ${projects.length + 1}`,
      createdAt: new Date().toISOString(),
    }
    onCreateProject(newProject)
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>My Projects</h1>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
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
            <p>{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
