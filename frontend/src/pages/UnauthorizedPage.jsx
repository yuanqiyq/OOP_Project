import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './UnauthorizedPage.css'

export default function UnauthorizedPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card">
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <button onClick={handleSignOut} className="btn btn-primary">
          Sign Out
        </button>
      </div>
    </div>
  )
}

