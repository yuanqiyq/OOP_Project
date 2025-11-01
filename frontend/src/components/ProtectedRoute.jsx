import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

