import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import PatientView from './pages/PatientView'
import StaffView from './pages/StaffView'
import AdminView from './pages/AdminView'
import UnauthorizedPage from './pages/UnauthorizedPage'
import LoadingSpinner from './components/LoadingSpinner'
import './App.css'

function AppRoutes() {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    )
  }

  // Determine the correct route based on user role
  const getDefaultRoute = () => {
    if (!userProfile) return '/auth'
    
    switch (userProfile.role) {
      case 'ADMIN':
        return '/admin'
      case 'STAFF':
        return '/staff'
      case 'PATIENT':
        return '/patient'
      default:
        return '/auth'
    }
  }

  return (
    <Routes>
      <Route path="/auth" element={<Navigate to={getDefaultRoute()} replace />} />
      
      <Route
        path="/patient/*"
        element={
          <ProtectedRoute allowedRoles={['PATIENT']}>
            <PatientView />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/staff/*"
        element={
          <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
            <StaffView />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminView />
          </ProtectedRoute>
        }
      />
      
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
