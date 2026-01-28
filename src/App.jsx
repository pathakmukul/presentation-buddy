import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [projects, setProjects] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    setIsLoggedIn(!!token)

    const savedProjects = localStorage.getItem('projects')
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects))
    }
  }, [])

  const handleLogin = () => {
    localStorage.setItem('authToken', 'logged_in')
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    setIsLoggedIn(false)
    setSelectedProject(null)
  }

  const handleCreateProject = (newProject) => {
    const updatedProjects = [newProject, ...projects]
    setProjects(updatedProjects)
    localStorage.setItem('projects', JSON.stringify(updatedProjects))
    setSelectedProject(newProject)
  }

  const handleSelectProject = (project) => {
    setSelectedProject(project)
  }

  const handleUpdateProject = (updatedProject) => {
    const updatedProjects = projects.map((p) =>
      p.id === updatedProject.id ? updatedProject : p
    )
    setProjects(updatedProjects)
    localStorage.setItem('projects', JSON.stringify(updatedProjects))
    setSelectedProject(updatedProject)
  }

  const handleBackToDashboard = () => {
    setSelectedProject(null)
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (selectedProject) {
    return (
      <ProjectPage
        project={selectedProject}
        onBack={handleBackToDashboard}
        onUpdateProject={handleUpdateProject}
      />
    )
  }

  return (
    <DashboardPage
      projects={projects}
      onCreateProject={handleCreateProject}
      onSelectProject={handleSelectProject}
      onLogout={handleLogout}
    />
  )
}

export default App
