import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state from localStorage or Supabase
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check localStorage first
        const cachedSession = localStorage.getItem('auth_session')
        const cachedUser = localStorage.getItem('user')

        if (cachedSession && cachedUser) {
          const parsedSession = JSON.parse(cachedSession)
          const parsedUser = JSON.parse(cachedUser)

          // Check if session is expired
          const expiresAt = parsedSession.expires_at
          if (expiresAt && Date.now() < expiresAt * 1000) {
            // Use cached session
            setSession(parsedSession)
            setUser(parsedUser)
            setLoading(false)
            return
          }
        }

        // Session expired or not found, get from Supabase
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)

          // Cache in localStorage
          localStorage.setItem('auth_session', JSON.stringify(currentSession))
          localStorage.setItem('user', JSON.stringify(currentSession.user))
        } else {
          // No session, clear localStorage
          localStorage.removeItem('auth_session')
          localStorage.removeItem('user')
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session) {
        localStorage.setItem('auth_session', JSON.stringify(session))
        localStorage.setItem('user', JSON.stringify(session.user))
      } else {
        localStorage.removeItem('auth_session')
        localStorage.removeItem('user')
        // Clear projects cache on logout
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('projects_')) {
            localStorage.removeItem(key)
          }
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}`,
      },
    })

    if (error) throw error

    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    // Cache in localStorage
    if (data.session) {
      localStorage.setItem('auth_session', JSON.stringify(data.session))
      localStorage.setItem('user', JSON.stringify(data.user))
    }

    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    // Clear localStorage
    localStorage.removeItem('auth_session')
    localStorage.removeItem('user')

    // Clear projects cache
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('projects_')) {
        localStorage.removeItem(key)
      }
    })

    setSession(null)
    setUser(null)
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
