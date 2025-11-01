import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Navbar.css'

export default function Navbar({ currentPage = 'dashboard' }) {
  const { userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const getRoleBadgeColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'admin'
      case 'STAFF':
        return 'staff'
      case 'PATIENT':
        return 'patient'
      default:
        return 'default'
    }
  }

  const role = userProfile?.role || 'USER'

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-icon">🏥</div>
          <span className="brand-text">Queue Management</span>
        </div>
        
        <div className="navbar-user-section">
          <div 
            className="navbar-user"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              {userProfile?.fname?.[0] || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">
                {userProfile?.fname} {userProfile?.lname}
              </span>
              <span className={`role-badge role-${getRoleBadgeColor(role)}`}>
                {role}
              </span>
            </div>
            <svg className="dropdown-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {showUserMenu && (
            <div className="user-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-label">Signed in as</div>
                <div className="dropdown-email">{userProfile?.email}</div>
              </div>
              <div className="dropdown-divider"></div>
              <button 
                onClick={handleSignOut} 
                className="dropdown-item"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M12.75 6L15.75 9L12.75 12M15 9H6.75M11.25 4.5C11.25 4.30109 11.171 4.11032 11.0303 3.96967C10.8897 3.82902 10.6989 3.75 10.5 3.75H4.5C4.30109 3.75 4.11032 3.82902 3.96967 3.96967C3.82902 4.11032 3.75 4.30109 3.75 4.5V13.5C3.75 13.6989 3.82902 13.8897 3.96967 14.0303C4.11032 14.171 4.30109 14.25 4.5 14.25H10.5C10.6989 14.25 10.8897 14.171 11.0303 14.0303C11.171 13.8897 11.25 13.6989 11.25 13.5V4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
