import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      if (isSignup) {
        await signUp(email, password)
        alert('Account created! Please check your email to verify, then login.')
        setIsSignup(false)
        setEmail('')
        setPassword('')
      } else {
        await signIn(email, password)
      }
    } catch (error) {
      console.error('Auth error:', error)
      alert(error.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Left Panel - Auth Form */}
      <div className="login-left">
        <div className="login-form-wrapper">
          <div className="login-brand">
            <div className="login-brand-video-wrapper">
              <video
                className="login-brand-video"
                src="/videos/idle.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>
            <h1 className="login-logo">PresentBuddy</h1>
            <p className="login-tagline">AI-Powered Presentations</p>
          </div>

          <div className="login-form">
            <h2>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Loading...' : isSignup ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <button
              className="login-switch-btn"
              onClick={() => {
                setIsSignup(!isSignup)
                setEmail('')
                setPassword('')
              }}
              disabled={loading}
            >
              {isSignup
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Branding */}
      <div className="login-right">
        <div className="login-dots-a" />
        <div className="login-dots-b" />

        <div className="login-video-overlay" />

        {/* Content */}
        <div className="login-hero">
          <h2 className="login-hero-title">Your AI Presentation Partner</h2>

          <p className="login-hero-description">
            PresentBuddy is an AI-powered companion that helps you create and deliver
            presentations and videos through voice-driven collaboration.
          </p>

          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div>
                <h4>Create Mode</h4>
                <p>Upload documents and plan with AI through natural conversation. Generate graphs, animations, and structured scripts automatically.</p>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <div>
                <h4>Present Mode</h4>
                <p>Deliver with real-time AI support. Your co-host listens for cues, displays visuals, and jumps in when you need help.</p>
              </div>
            </div>

            <div className="login-feature">
              <div className="login-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <div>
                <h4>Voice-Driven</h4>
                <p>Choose your support level — CoHost, When Stuck, or Moderator — and let AI adapt to your presenting style.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
