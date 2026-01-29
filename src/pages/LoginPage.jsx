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
        // Auth context will handle the redirect
      }
    } catch (error) {
      console.error('Auth error:', error)
      alert(error.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>{isSignup ? 'Sign Up' : 'Login'}</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <button
          className="switch-btn"
          onClick={() => {
            setIsSignup(!isSignup)
            setEmail('')
            setPassword('')
          }}
          disabled={loading}
        >
          {isSignup
            ? 'Already have an account? Login'
            : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  )
}
