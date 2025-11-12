import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/logo.svg'
import './AuthPage.css'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fname, setFname] = useState('')
  const [lname, setLname] = useState('')
  const [patientIc, setPatientIc] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFname('')
    setLname('')
    setPatientIc('')
    setDateOfBirth('')
    setGender('')
    setError('')
  }

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
        if (!fname || !lname || !patientIc || !dateOfBirth || !gender) {
          throw new Error('All fields are required')
        }
        const { error } = await signUp(email, password, {
          fname,
          lname,
          role: 'PATIENT',
          patientIc,
          dateOfBirth,
          gender,
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
        <div className="auth-logo-container">
          <img src={logo} alt="MediQ Logo" className="auth-logo" />
        </div>
        <h1 className="auth-title">
          {isLogin ? 'Sign In' : 'Patient Sign Up'}
        </h1>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-row">
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
              </div>
              <div className="form-group">
                <label htmlFor="patientIc">IC Number</label>
                <input
                  id="patientIc"
                  type="text"
                  value={patientIc}
                  onChange={(e) => setPatientIc(e.target.value)}
                  required={!isLogin}
                  disabled={loading}
                  placeholder="e.g., 123456789012"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required={!isLogin}
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required={!isLogin}
                    disabled={loading}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
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
                onClick={() => {
                  resetForm()
                  setIsLogin(false)
                }}
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
                onClick={() => {
                  resetForm()
                  setIsLogin(true)
                }}
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

