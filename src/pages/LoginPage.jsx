import { useState } from 'react'
import './LoginPage.css'

const LOGIN_USERNAME = import.meta.env.VITE_LOGIN_USERNAME || 'abc'
const LOGIN_PASSWORD = import.meta.env.VITE_LOGIN_PASSWORD || '123'

export default function LoginPage({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!username || !password) {
      alert('Please fill in all fields')
      return
    }

    if (isSignup) {
      alert('Account created! Please login.')
      setIsSignup(false)
      setUsername('')
      setPassword('')
    } else {
      if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
        onLogin()
      } else {
        alert('Invalid credentials')
      }
    }
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>{isSignup ? 'Sign Up' : 'Login'}</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button type="submit" className="primary-btn">
            {isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <button
          className="switch-btn"
          onClick={() => {
            setIsSignup(!isSignup)
            setUsername('')
            setPassword('')
          }}
        >
          {isSignup
            ? 'Already have an account? Login'
            : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  )
}
