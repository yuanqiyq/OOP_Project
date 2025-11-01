import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './AuthPage.css'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fname, setFname] = useState('')
  const [lname, setLname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        // Sign up - only for patients
        if (!fname || !lname) {
          throw new Error('First name and last name are required')
        }
        const { error } = await signUp(email, password, {
          fname,
          lname,
          role: 'PATIENT',
        })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">
          {isLogin ? 'Sign In' : 'Patient Sign Up'}
        </h1>
        <p className="auth-subtitle">
          {isLogin
            ? 'Welcome back! Please sign in to continue.'
            : 'Create a patient account to access the appointment queue system.'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="fname">First Name</label>
                <input
                  id="fname"
                  type="text"
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  required={!isLogin}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lname">Last Name</label>
                <input
                  id="lname"
                  type="text"
                  value={lname}
                  onChange={(e) => setLname(e.target.value)}
                  required={!isLogin}
                  disabled={loading}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="auth-link"
              >
                Sign up as a patient
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="auth-link"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {!isLogin && (
          <p className="auth-note">
            Note: Staff and Admin accounts can only be created by administrators.
          </p>
        )}
      </div>
    </div>
  )
}

