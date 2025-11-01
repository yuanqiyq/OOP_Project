import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Sidebar.css'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userProfile } = useAuth()
  const role = userProfile?.role?.toUpperCase()

  const patientMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/patient' },
    { id: 'appointments', label: 'My Appointments', icon: '📅', path: '/patient/appointments' },
    { id: 'queue', label: 'Queue Status', icon: '⏳', path: '/patient/queue' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/patient/settings' },
  ]

  const staffMenu = [
    { id: 'dashboard', label: 'Queue Management', icon: '📊', path: '/staff' },
    { id: 'appointments', label: 'Appointments', icon: '📅', path: '/staff/appointments' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/staff/settings' },
  ]

  const adminMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin' },
    { id: 'users', label: 'Users', icon: '👥', path: '/admin/users' },
    { id: 'queue', label: 'Queue Monitor', icon: '⏳', path: '/admin/queue' },
    { id: 'appointments', label: 'Appointments', icon: '📅', path: '/admin/appointments' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/admin/settings' },
  ]

  const getMenu = () => {
    switch (role) {
      case 'PATIENT':
        return patientMenu
      case 'STAFF':
        return staffMenu
      case 'ADMIN':
        return adminMenu
      default:
        return []
    }
  }

  const menu = getMenu()
  const currentPath = location.pathname

  const handleNavigation = (path) => {
    navigate(path)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {menu.map((item) => {
          const isActive = currentPath === item.path || 
            (item.id === 'dashboard' && (currentPath === '/patient' || currentPath === '/staff' || currentPath === '/admin' || 
             currentPath.startsWith('/patient/') && !currentPath.includes('/appointments') && !currentPath.includes('/queue') && !currentPath.includes('/settings') ||
             currentPath.startsWith('/staff/') && !currentPath.includes('/appointments') && !currentPath.includes('/settings') ||
             currentPath.startsWith('/admin/') && !currentPath.includes('/users') && !currentPath.includes('/queue') && !currentPath.includes('/appointments') && !currentPath.includes('/settings'))) ||
            (item.path !== '/patient' && item.path !== '/staff' && item.path !== '/admin' && currentPath.startsWith(item.path))
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

