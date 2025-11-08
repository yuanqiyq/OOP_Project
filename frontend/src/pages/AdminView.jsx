import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { adminAPI, userAPI, queueAPI, appointmentAPI, clinicAPI, doctorAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import Toast from '../components/Toast'
import './AdminView.css'

export default function AdminView() {
  const { userProfile, signOut, setIgnoreAuthChanges, setOriginalSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [users, setUsers] = useState([])
  const [staff, setStaff] = useState([])
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [queue, setQueue] = useState(null)
  const [clinics, setClinics] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStaff: 0,
    totalPatients: 0,
    totalAppointments: 0,
  })
  
  // Create forms state
  const [showCreateStaff, setShowCreateStaff] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [selectedClinicId, setSelectedClinicId] = useState(969)
  const [testEndpoint, setTestEndpoint] = useState('')
  
  const [staffFormData, setStaffFormData] = useState({
    email: '',
    password: '',
    fname: '',
    lname: '',
    clinicId: 969,
  })

  const [adminFormData, setAdminFormData] = useState({
    email: '',
    password: '',
    fname: '',
    lname: '',
    clinicId: 969,
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    // Auto-refresh if on queue monitor
    if (location.pathname.includes('/queue') && selectedClinicId) {
      const interval = setInterval(() => {
        fetchQueueData(selectedClinicId)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [location, selectedClinicId])

  const fetchAllData = async () => {
    await Promise.all([
      fetchUsers(),
      fetchStaff(),
      fetchPatients(),
      fetchClinics(),
      fetchDoctors(),
    ])
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await userAPI.getAll()
      setUsers(data || [])
      setStats(prev => ({ ...prev, totalUsers: data?.length || 0 }))
      setError('')
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const data = await adminAPI.getStaff()
      setStaff(data || [])
      setStats(prev => ({ ...prev, totalStaff: data?.length || 0 }))
    } catch (err) {
      console.error('Failed to load staff', err)
    }
  }

  const fetchPatients = async () => {
    try {
      const data = await adminAPI.getPatients()
      setPatients(data || [])
      setStats(prev => ({ ...prev, totalPatients: data?.length || 0 }))
    } catch (err) {
      console.error('Failed to load patients', err)
    }
  }

  const fetchClinics = async () => {
    try {
      const data = await clinicAPI.getAll()
      setClinics(data || [])
      if (data?.length > 0 && !selectedClinicId) {
        setSelectedClinicId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load clinics', err)
    }
  }

  const fetchDoctors = async () => {
    try {
      const data = await doctorAPI.getAll()
      setDoctors(data || [])
    } catch (err) {
      console.error('Failed to load doctors', err)
    }
  }

  const fetchAppointments = async (clinicId = null) => {
    try {
      setLoading(true)
      let data
      if (clinicId) {
        data = await appointmentAPI.getByClinicId(clinicId)
      } else {
        data = await appointmentAPI.getAll()
      }
      setAppointments(data || [])
      setStats(prev => ({ ...prev, totalAppointments: data?.length || 0 }))
      setError('')
    } catch (err) {
      setError('Failed to load appointments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchQueueData = async (clinicId) => {
    try {
      const data = await queueAPI.getClinicQueue(clinicId)
      setQueue(data)
      setError('')
    } catch (err) {
      console.error('Failed to load queue', err)
    }
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setToast(null)
    setLoading(true)

    try {
      // Get current session to restore it after creating the new user
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !currentSession) {
        throw new Error('No active session. Please sign in again.')
      }

      const currentUserId = currentSession.user.id
      
      // Set flag to ignore auth state changes during user creation
      setOriginalSession(currentSession)
      setIgnoreAuthChanges(true)
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: staffFormData.email,
        password: staffFormData.password,
        options: {
          emailRedirectTo: window.location.origin + '/auth',
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user in Supabase Auth')

      // Immediately restore the original admin session
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      })

      await adminAPI.createStaff({
        authUuid: authData.user.id,
        email: staffFormData.email,
        fname: staffFormData.fname,
        lname: staffFormData.lname,
        role: 'STAFF',
        clinicId: staffFormData.clinicId,
      })

      // Show toast notification
      setToast({
        message: `Successfully created STAFF account for ${staffFormData.email}`,
        type: 'success'
      })
      
      setStaffFormData({ email: '', password: '', fname: '', lname: '', clinicId: 969 })
      setShowCreateStaff(false)
      await fetchUsers()
      await fetchStaff()
    } catch (err) {
      setToast({
        message: err.message || 'Failed to create staff account',
        type: 'error'
      })
    } finally {
      // Re-enable auth state change handling
      setIgnoreAuthChanges(false)
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminFormData.email,
        password: adminFormData.password,
        options: {
          emailRedirectTo: window.location.origin + '/auth',
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user in Supabase Auth')

      // For admin, we create a generic user record in the backend
      await userAPI.create({
        authUuid: authData.user.id,
        email: adminFormData.email,
        fname: adminFormData.fname,
        lname: adminFormData.lname,
        role: 'ADMIN',
      })

      setSuccess(`Successfully created ADMIN account for ${adminFormData.email}`)
      setAdminFormData({ email: '', password: '', fname: '', lname: '', clinicId: 969 })
      setShowCreateAdmin(false)
      await fetchUsers()
      await fetchStaff()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to create admin account')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth',
      })
      if (error) throw error
      setSuccess(`Password reset email sent to ${email}`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.message || 'Failed to send password reset email')
      setTimeout(() => setError(''), 5000)
    }
  }

  const deleteUser = async (userId, email, authUuid) => {
    if (!confirm(`Are you sure you want to delete user ${email}?`)) return
    
    try {
      setLoading(true)
      
      // Delete from backend first
      await userAPI.delete(userId)
      
      // Delete from Supabase Auth if authUuid is provided
      // Note: Supabase Admin API requires service role key, so we need a backend endpoint
      // For now, we'll create a backend endpoint to handle this
      if (authUuid) {
        try {
          // Call backend endpoint to delete from Supabase Auth
          const response = await fetch(`http://localhost:8080/api/admin/users/${authUuid}/auth`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          })
          
          if (!response.ok) {
            console.warn('Failed to delete user from Supabase Auth via backend')
            // Continue even if Supabase deletion fails - user is deleted from backend
          }
        } catch (supabaseError) {
          console.warn('Error deleting from Supabase Auth:', supabaseError)
          // Continue even if Supabase deletion fails - user is deleted from backend
        }
      }
      
      setToast({
        message: `User ${email} deleted successfully`,
        type: 'success'
      })
      
      await fetchUsers()
      await fetchStaff()
      await fetchPatients()
    } catch (err) {
      setToast({
        message: err.message || 'Failed to delete user',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const testBackendEndpoint = async () => {
    if (!testEndpoint) {
      setError('Please enter an endpoint')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`http://localhost:8080/api${testEndpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const data = await response.json().catch(() => null)
      
      if (response.ok) {
        setSuccess(`✅ Success: ${JSON.stringify(data, null, 2).substring(0, 200)}`)
      } else {
        setError(`❌ Error ${response.status}: ${JSON.stringify(data, null, 2).substring(0, 200)}`)
      }
    } catch (err) {
      setError(`Failed to test endpoint: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentView = () => {
    if (location.pathname.includes('/users')) return 'users'
    if (location.pathname.includes('/queue')) return 'queue'
    if (location.pathname.includes('/appointments')) return 'appointments'
    if (location.pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const currentView = getCurrentView()

  return (
    <div className="admin-view">
      <Navbar />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}
      <div className="admin-layout">
        <Sidebar />
        <div className="admin-main">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {currentView === 'dashboard' && (
            <>
              <div className="page-header">
                <div>
                  <h1>Admin Dashboard</h1>
                  <p className="subtitle">System Overview & Management</p>
                </div>
                <div className="header-actions">
                  <button
                    onClick={() => {
                      setShowCreateStaff(!showCreateStaff)
                      setShowCreateAdmin(false)
                    }}
                    className="btn btn-primary"
                  >
                    {showCreateStaff ? 'Cancel' : '+ Staff'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateAdmin(!showCreateAdmin)
                      setShowCreateStaff(false)
                    }}
                    className="btn btn-primary"
                  >
                    {showCreateAdmin ? 'Cancel' : '+ Admin'}
                  </button>
                  <button onClick={fetchAllData} className="btn btn-secondary">
                    🔄 Refresh All
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <h3>{stats.totalUsers}</h3>
                    <p>Total Users</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👨‍💼</div>
                  <div className="stat-content">
                    <h3>{stats.totalStaff}</h3>
                    <p>Staff & Admin</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🏥</div>
                  <div className="stat-content">
                    <h3>{stats.totalPatients}</h3>
                    <p>Patients</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <h3>{stats.totalAppointments}</h3>
                    <p>Appointments</p>
                  </div>
                </div>
              </div>

              {/* Create Staff Form */}
              {showCreateStaff && (
                <div className="section-card">
                  <h2>Create New Staff Account</h2>
                  <p className="form-description">
                    Create a new staff member account. Staff members are assigned to a specific clinic.
                  </p>
                  <form onSubmit={handleCreateStaff} className="create-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="staff-fname">First Name</label>
                        <input
                          id="staff-fname"
                          type="text"
                          value={staffFormData.fname}
                          onChange={(e) =>
                            setStaffFormData({ ...staffFormData, fname: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="staff-lname">Last Name</label>
                        <input
                          id="staff-lname"
                          type="text"
                          value={staffFormData.lname}
                          onChange={(e) =>
                            setStaffFormData({ ...staffFormData, lname: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="staff-email">Email</label>
                      <input
                        id="staff-email"
                        type="email"
                        value={staffFormData.email}
                        onChange={(e) =>
                          setStaffFormData({ ...staffFormData, email: e.target.value })
                        }
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="staff-password">Password</label>
                      <input
                        id="staff-password"
                        type="password"
                        value={staffFormData.password}
                        onChange={(e) =>
                          setStaffFormData({ ...staffFormData, password: e.target.value })
                        }
                        required
                        disabled={loading}
                        minLength={6}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="staff-clinicId">Clinic</label>
                      <select
                        id="staff-clinicId"
                        value={staffFormData.clinicId}
                        onChange={(e) =>
                          setStaffFormData({ ...staffFormData, clinicId: Number(e.target.value) })
                        }
                        required
                        disabled={loading}
                      >
                        {clinics.map(clinic => (
                          <option key={clinic.id} value={clinic.id}>
                            {clinic.name} (ID: {clinic.id})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Staff Account'}
                    </button>
                  </form>
                </div>
              )}

              {/* Create Admin Form */}
              {showCreateAdmin && (
                <div className="section-card">
                  <h2>Create New Admin Account</h2>
                  <p className="form-description">
                    Create a new administrator account. Admins have full system access.
                  </p>
                  <form onSubmit={handleCreateAdmin} className="create-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="admin-fname">First Name</label>
                        <input
                          id="admin-fname"
                          type="text"
                          value={adminFormData.fname}
                          onChange={(e) =>
                            setAdminFormData({ ...adminFormData, fname: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="admin-lname">Last Name</label>
                        <input
                          id="admin-lname"
                          type="text"
                          value={adminFormData.lname}
                          onChange={(e) =>
                            setAdminFormData({ ...adminFormData, lname: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="admin-email">Email</label>
                      <input
                        id="admin-email"
                        type="email"
                        value={adminFormData.email}
                        onChange={(e) =>
                          setAdminFormData({ ...adminFormData, email: e.target.value })
                        }
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="admin-password">Password</label>
                      <input
                        id="admin-password"
                        type="password"
                        value={adminFormData.password}
                        onChange={(e) =>
                          setAdminFormData({ ...adminFormData, password: e.target.value })
                        }
                        required
                        disabled={loading}
                        minLength={6}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="admin-clinicId">Clinic</label>
                      <select
                        id="admin-clinicId"
                        value={adminFormData.clinicId}
                        onChange={(e) =>
                          setAdminFormData({ ...adminFormData, clinicId: Number(e.target.value) })
                        }
                        required
                        disabled={loading}
                      >
                        {clinics.map(clinic => (
                          <option key={clinic.id} value={clinic.id}>
                            {clinic.name} (ID: {clinic.id})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Admin Account'}
                    </button>
                  </form>
                </div>
              )}

              {/* Quick Actions */}
              <div className="section-card">
                <h2>Quick Actions</h2>
                <div className="quick-actions-grid">
                  <button onClick={fetchUsers} className="action-card">
                    <span className="action-icon">👥</span>
                    <span className="action-label">Refresh Users</span>
                  </button>
                  <button onClick={fetchStaff} className="action-card">
                    <span className="action-icon">👨‍💼</span>
                    <span className="action-label">Refresh Staff</span>
                  </button>
                  <button onClick={fetchPatients} className="action-card">
                    <span className="action-icon">🏥</span>
                    <span className="action-label">Refresh Patients</span>
                  </button>
                  <button onClick={() => fetchAppointments()} className="action-card">
                    <span className="action-icon">📅</span>
                    <span className="action-label">View All Appointments</span>
                  </button>
                </div>
              </div>

              {/* Endpoint Testing */}
              <div className="section-card">
                <h2>Backend Endpoint Tester</h2>
                <p className="form-description">
                  Test any backend endpoint to verify it's working correctly
                </p>
                <div className="endpoint-tester">
                  <div className="endpoint-input-group">
                    <span className="endpoint-prefix">GET /api</span>
                    <input
                      type="text"
                      value={testEndpoint}
                      onChange={(e) => setTestEndpoint(e.target.value)}
                      placeholder="/users"
                      className="endpoint-input"
                    />
                    <button
                      onClick={testBackendEndpoint}
                      className="btn btn-primary"
                      disabled={loading || !testEndpoint}
                    >
                      Test
                    </button>
                  </div>
                  <div className="endpoint-examples">
                    <p className="examples-label">Quick Examples:</p>
                    <div className="examples-list">
                      <button
                        onClick={() => {
                          setTestEndpoint('/users')
                          testBackendEndpoint()
                        }}
                        className="example-btn"
                      >
                        /users
                      </button>
                      <button
                        onClick={() => {
                          setTestEndpoint('/admin/staff')
                          testBackendEndpoint()
                        }}
                        className="example-btn"
                      >
                        /admin/staff
                      </button>
                      <button
                        onClick={() => {
                          setTestEndpoint('/appointments')
                          testBackendEndpoint()
                        }}
                        className="example-btn"
                      >
                        /appointments
                      </button>
                      <button
                        onClick={() => {
                          setTestEndpoint('/clinics')
                          testBackendEndpoint()
                        }}
                        className="example-btn"
                      >
                        /clinics
                      </button>
                      <button
                        onClick={() => {
                          setTestEndpoint('/doctors')
                          testBackendEndpoint()
                        }}
                        className="example-btn"
                      >
                        /doctors
                      </button>
                      <button
                        onClick={() => {
                          setTestEndpoint(`/queue/clinic/${selectedClinicId}`)
                          testBackendEndpoint()
                        }}
                        className="example-btn"
                      >
                        /queue/clinic/{selectedClinicId}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentView === 'users' && (
            <>
              <div className="page-header">
                <h1>User Management</h1>
                <button onClick={fetchUsers} className="btn btn-secondary">
                  Refresh
                </button>
              </div>

              <div className="section-card">
                <div className="section-header">
                  <h2>All Users ({users.length})</h2>
                  <div className="filter-controls">
                    <select
                      onChange={(e) => {
                        // Filter logic can be added
                        fetchUsers()
                      }}
                      className="select-input"
                    >
                      <option value="">All Roles</option>
                      <option value="PATIENT">Patients</option>
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admins</option>
                    </select>
                  </div>
                </div>
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : (
                  <div className="users-table-container">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.userId}>
                            <td>{user.userId}</td>
                            <td>
                              {user.fname} {user.lname}
                            </td>
                            <td>{user.email}</td>
                            <td>
                              <span className={`role-badge role-${user.role?.toLowerCase()}`}>
                                {user.role || 'N/A'}
                              </span>
                            </td>
                            <td>
                              {user.createdAt
                                ? new Date(user.createdAt).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td>
                              <div className="action-buttons-small">
                                <button
                                  onClick={() => resetPassword(user.email)}
                                  className="btn btn-secondary btn-sm"
                                  title="Reset Password"
                                >
                                  🔑
                                </button>
                                <button
                                  onClick={() => deleteUser(user.userId, user.email, user.authUuid)}
                                  className="btn btn-danger btn-sm"
                                  title="Delete User"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="section-card">
                <div className="section-header">
                  <h2>Staff & Admin Members ({staff.length})</h2>
                  <button onClick={fetchStaff} className="btn btn-secondary">
                    Refresh
                  </button>
                </div>
                <div className="staff-grid">
                  {staff.map((member) => (
                    <div key={member.userId} className="staff-card">
                      <div className="staff-header">
                        <h3>
                          {member.fname} {member.lname}
                        </h3>
                        <span className={`role-badge role-${member.role?.toLowerCase()}`}>
                          {member.role}
                        </span>
                      </div>
                      <div className="staff-details">
                        <p><strong>Email:</strong> {member.email}</p>
                        <p><strong>Clinic:</strong> {member.clinicName || `ID: ${member.clinicId}`}</p>
                        <p><strong>User ID:</strong> {member.userId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {currentView === 'queue' && (
            <>
              <div className="page-header">
                <h1>Queue Monitor</h1>
                <div className="header-controls">
                  <div className="clinic-selector">
                    <label>Clinic:</label>
                    <select
                      value={selectedClinicId}
                      onChange={(e) => {
                        setSelectedClinicId(Number(e.target.value))
                        fetchQueueData(Number(e.target.value))
                      }}
                      className="select-input"
                    >
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name} (ID: {clinic.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => fetchQueueData(selectedClinicId)}
                    className="btn btn-secondary"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {queue && (
                <div className="section-card">
                  <div className="section-header">
                    <h2>Queue Status - {clinics.find(c => c.id === selectedClinicId)?.name || `Clinic ${selectedClinicId}`}</h2>
                    <span className="queue-status-badge">
                      {queue.totalInQueue || 0} in queue
                    </span>
                  </div>
                  {queue.queue && queue.queue.length > 0 ? (
                    <div className="queue-list-enhanced">
                      {queue.queue.map((entry, index) => (
                        <div key={entry.queueId} className={`queue-item-enhanced ${index === 0 ? 'next-up' : ''}`}>
                          <div className="queue-number">
                            <span className="queue-position-badge">{index + 1}</span>
                          </div>
                          <div className="queue-details-enhanced">
                            <div className="queue-header">
                              <h3>Appointment #{entry.appointmentId}</h3>
                              <span className={`priority-badge priority-${entry.priority}`}>
                                Priority {entry.priority}
                              </span>
                            </div>
                            <div className="queue-info-grid">
                              <div className="info-item">
                                <span className="info-label">Patient:</span>
                                <span className="info-value">{entry.patientName || 'N/A'}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Status:</span>
                                <span className="info-value">{entry.status}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Check-in:</span>
                                <span className="info-value">
                                  {new Date(entry.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">Queue is empty</div>
                  )}
                </div>
              )}
            </>
          )}

          {currentView === 'appointments' && (
            <>
              <div className="page-header">
                <h1>Appointment Management</h1>
                <div className="header-controls">
                  <div className="clinic-selector">
                    <label>Filter by Clinic:</label>
                    <select
                      onChange={(e) => {
                        const clinicId = e.target.value ? Number(e.target.value) : null
                        fetchAppointments(clinicId)
                      }}
                      className="select-input"
                    >
                      <option value="">All Clinics</option>
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => fetchAppointments()} className="btn btn-secondary">
                    Refresh
                  </button>
                </div>
              </div>

              <div className="section-card">
                <div className="section-header">
                  <h2>All Appointments ({appointments.length})</h2>
                </div>
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : appointments.length === 0 ? (
                  <div className="empty-state">No appointments found</div>
                ) : (
                  <div className="appointments-table-container">
                    <table className="appointments-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Patient ID</th>
                          <th>Clinic ID</th>
                          <th>Doctor ID</th>
                          <th>Date & Time</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((apt) => (
                          <tr key={apt.appointmentId}>
                            <td>#{apt.appointmentId}</td>
                            <td>{apt.patientId}</td>
                            <td>{apt.clinicId}</td>
                            <td>{apt.doctorId || 'N/A'}</td>
                            <td>{new Date(apt.dateTime).toLocaleString()}</td>
                            <td>
                              <span className={`status-badge status-${apt.apptStatus?.toLowerCase() || 'pending'}`}>
                                {apt.apptStatus || 'PENDING'}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-small">
                                <button
                                  onClick={async () => {
                                    try {
                                      await appointmentAPI.updateStatus(apt.appointmentId, 'COMPLETED')
                                      setSuccess('Appointment status updated')
                                      await fetchAppointments()
                                      setTimeout(() => setSuccess(''), 3000)
                                    } catch (err) {
                                      setError(err.message)
                                      setTimeout(() => setError(''), 5000)
                                    }
                                  }}
                                  className="btn btn-success btn-sm"
                                  disabled={apt.apptStatus === 'COMPLETED'}
                                  title="Mark Completed"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await appointmentAPI.delete(apt.appointmentId)
                                      setSuccess('Appointment deleted')
                                      await fetchAppointments()
                                      setTimeout(() => setSuccess(''), 3000)
                                    } catch (err) {
                                      setError(err.message)
                                      setTimeout(() => setError(''), 5000)
                                    }
                                  }}
                                  className="btn btn-danger btn-sm"
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {currentView === 'settings' && (
            <>
              <div className="page-header">
                <h1>Settings</h1>
              </div>
              <div className="section-card">
                <h2>Profile Information</h2>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input type="text" value={`${userProfile?.fname} ${userProfile?.lname}`} disabled />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={userProfile?.email || ''} disabled />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <input type="text" value={userProfile?.role || ''} disabled />
                  </div>
                </div>
              </div>
              <div className="section-card">
                <h2>System Information</h2>
                <div className="system-info">
                  <div className="info-row">
                    <span className="info-label">Total Users:</span>
                    <span className="info-value">{stats.totalUsers}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Total Staff:</span>
                    <span className="info-value">{stats.totalStaff}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Total Patients:</span>
                    <span className="info-value">{stats.totalPatients}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Total Appointments:</span>
                    <span className="info-value">{stats.totalAppointments}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Total Clinics:</span>
                    <span className="info-value">{clinics.length}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Total Doctors:</span>
                    <span className="info-value">{doctors.length}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
