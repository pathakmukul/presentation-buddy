import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'

function AppContent() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [selectedProject, setSelectedProject] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Fetch projects from Supabase with localStorage cache
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) {
        setProjects([])
        setLoading(false)
        return
      }

      try {
        // Check localStorage cache first
        const cacheKey = `projects_${user.id}`
        const lastSyncKey = `projects_last_sync_${user.id}`
        const cachedProjects = localStorage.getItem(cacheKey)
        const lastSync = localStorage.getItem(lastSyncKey)

        // Use cache if less than 5 minutes old
        if (cachedProjects && lastSync) {
          const cacheAge = Date.now() - parseInt(lastSync)
          if (cacheAge < 5 * 60 * 1000) {
            setProjects(JSON.parse(cachedProjects))
            setLoading(false)
            return
          }
        }

        // Fetch projects with presentations
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            presentations(id)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Fetch content_assets for all presentations
        const presentationIds = (data || [])
          .map(p => p.presentations?.[0]?.id)
          .filter(Boolean)

        let assetsMap = {}
        if (presentationIds.length > 0) {
          const { data: assets } = await supabase
            .from('content_assets')
            .select('presentation_id, file_url, type')
            .in('presentation_id', presentationIds)
            .in('type', ['image', 'graph', 'manim_animation'])
            .eq('status', 'ready')

          // Group assets by presentation_id
          assetsMap = (assets || []).reduce((acc, asset) => {
            if (!acc[asset.presentation_id]) acc[asset.presentation_id] = []
            acc[asset.presentation_id].push(asset)
            return acc
          }, {})
        }

        // Flatten and add thumbnail with priority: image > graph > video
        const projectsWithPresentationId = (data || []).map(project => {
          const presentationId = project.presentations?.[0]?.id
          const assets = assetsMap[presentationId] || []

          const findByType = (type) => assets.find(a => a.type === type)
          const thumbnail = findByType('image') || findByType('graph') || findByType('manim_animation')


          return {
            ...project,
            presentation_id: presentationId || null,
            thumbnail_url: thumbnail?.file_url || null,
            thumbnail_type: thumbnail?.type || null
          }
        })

        setProjects(projectsWithPresentationId)

        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify(projectsWithPresentationId))
        localStorage.setItem(lastSyncKey, Date.now().toString())
      } catch (error) {
        console.error('Error fetching projects:', error)
        // Fall back to cache on error
        const cacheKey = `projects_${user.id}`
        const cachedProjects = localStorage.getItem(cacheKey)
        if (cachedProjects) {
          setProjects(JSON.parse(cachedProjects))
        }
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchProjects()
    }
  }, [user, authLoading, refreshTrigger])

  const handleLogout = async () => {
    try {
      await signOut()
      setSelectedProject(null)
      setProjects([])
    } catch (error) {
      console.error('Error logging out:', error)
      alert('Failed to logout')
    }
  }

  const handleCreateProject = async (newProject) => {
    try {
      // Create project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: newProject.name,
        })
        .select()
        .single()

      if (projectError) throw projectError

      // Auto-create default presentation for this project
      const { data: presentationData, error: presentationError } = await supabase
        .from('presentations')
        .insert({
          project_id: projectData.id,
          goal: 'video',
          support_level: 'cohost',
          duration_seconds: 180,
          status: 'draft'
        })
        .select()
        .single()

      if (presentationError) throw presentationError

      // Attach presentation_id to project object for easy access
      const projectWithPresentation = {
        ...projectData,
        presentation_id: presentationData.id
      }

      // Update state and cache
      const updatedProjects = [projectWithPresentation, ...projects]
      setProjects(updatedProjects)

      const cacheKey = `projects_${user.id}`
      const lastSyncKey = `projects_last_sync_${user.id}`
      localStorage.setItem(cacheKey, JSON.stringify(updatedProjects))
      localStorage.setItem(lastSyncKey, Date.now().toString())

      setSelectedProject(projectWithPresentation)
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project')
    }
  }

  const handleSelectProject = async (project) => {
    // If project doesn't have presentation_id, fetch it
    if (!project.presentation_id) {
      try {
        const { data, error } = await supabase
          .from('presentations')
          .select('id')
          .eq('project_id', project.id)
          .single()

        if (error) throw error

        project.presentation_id = data.id
      } catch (error) {
        console.error('Error fetching presentation:', error)
      }
    }

    setSelectedProject(project)
  }

  const handleUpdateProject = async (updatedProject) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: updatedProject.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedProject.id)
        .select()
        .single()

      if (error) throw error

      // Update state and cache
      const updatedProjects = projects.map((p) =>
        p.id === data.id ? data : p
      )
      setProjects(updatedProjects)

      const cacheKey = `projects_${user.id}`
      const lastSyncKey = `projects_last_sync_${user.id}`
      localStorage.setItem(cacheKey, JSON.stringify(updatedProjects))
      localStorage.setItem(lastSyncKey, Date.now().toString())

      setSelectedProject(data)
    } catch (error) {
      console.error('Error updating project:', error)
      alert('Failed to update project')
    }
  }

  const handleDeleteProject = async (project) => {
    try {
      // Delete presentation (cascades to content_assets, presentation_plans, etc.)
      if (project.presentation_id) {
        const { error: presentationError } = await supabase
          .from('presentations')
          .delete()
          .eq('id', project.presentation_id)

        if (presentationError) {
          console.error('Error deleting presentation:', presentationError)
        }
      }

      // Delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (error) throw error

      // Update state and cache
      const updatedProjects = projects.filter(p => p.id !== project.id)
      setProjects(updatedProjects)

      const cacheKey = `projects_${user.id}`
      const lastSyncKey = `projects_last_sync_${user.id}`
      localStorage.setItem(cacheKey, JSON.stringify(updatedProjects))
      localStorage.setItem(lastSyncKey, Date.now().toString())
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    }
  }

  const handleBackToDashboard = () => {
    // Invalidate cache and trigger refetch for fresh thumbnails
    if (user) {
      const lastSyncKey = `projects_last_sync_${user.id}`
      localStorage.removeItem(lastSyncKey)
    }
    setSelectedProject(null)
    setRefreshTrigger(prev => prev + 1)
  }

  if (authLoading || loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#000',
        color: '#e0e0e0'
      }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (selectedProject) {
    return (
      <ProjectPage
        project={selectedProject}
        user={user}
        onBack={handleBackToDashboard}
        onUpdateProject={handleUpdateProject}
      />
    )
  }

  return (
    <DashboardPage
      projects={projects}
      user={user}
      onCreateProject={handleCreateProject}
      onSelectProject={handleSelectProject}
      onDeleteProject={handleDeleteProject}
      onLogout={handleLogout}
    />
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
