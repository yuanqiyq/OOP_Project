import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { adminAPI, userAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import './AdminView.css'

export default function AdminView() {
  const { userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Create forms state
  const [showCreateStaff, setShowCreateStaff] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  
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
    clinicId: 969, // Admin still needs clinic for backend
  })

  useEffect(() => {
    fetchUsers()
    fetchStaff()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await userAPI.getAll()
      setUsers(data || [])
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
    } catch (err) {
      console.error('Failed to load staff', err)
    }
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: staffFormData.email,
        password: staffFormData.password,
        options: {
          emailRedirectTo: window.location.origin + '/auth',
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create user in Supabase Auth')
      }

      // Step 2: Create staff record in backend
      await adminAPI.createStaff({
        authUuid: authData.user.id,
        email: staffFormData.email,
        fname: staffFormData.fname,
        lname: staffFormData.lname,
        role: 'STAFF',
        clinicId: staffFormData.clinicId,
      })

      setSuccess(`Successfully created STAFF account for ${staffFormData.email}. User may need to verify their email.`)
      setStaffFormData({
        email: '',
        password: '',
        fname: '',
        lname: '',
        clinicId: 969,
      })
      setShowCreateStaff(false)
      await fetchUsers()
      await fetchStaff()
    } catch (err) {
      setError(err.message || 'Failed to create staff account')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminFormData.email,
        password: adminFormData.password,
        options: {
          emailRedirectTo: window.location.origin + '/auth',
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create user in Supabase Auth')
      }

      // Step 2: Create admin record in backend
      await adminAPI.createStaff({
        authUuid: authData.user.id,
        email: adminFormData.email,
        fname: adminFormData.fname,
        lname: adminFormData.lname,
        role: 'ADMIN',
        clinicId: adminFormData.clinicId,
      })

      setSuccess(`Successfully created ADMIN account for ${adminFormData.email}. User may need to verify their email.`)
      setAdminFormData({
        email: '',
        password: '',
        fname: '',
        lname: '',
        clinicId: 969,
      })
      setShowCreateAdmin(false)
      await fetchUsers()
      await fetchStaff()
    } catch (err) {
      setError(err.message || 'Failed to create admin account')
      console.error(err)
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
    } catch (err) {
      setError(err.message || 'Failed to send password reset email')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="admin-view">
      {/* Navbar */}
      <nav className="admin-navbar">
        <div className="navbar-brand">
          <h2>Admin Dashboard</h2>
        </div>
        <div className="navbar-actions">
          <div className="navbar-user">
            <span className="user-name">
              {userProfile?.fname} {userProfile?.lname}
            </span>
            <span className="user-role-badge">ADMIN</span>
          </div>
          <button onClick={handleSignOut} className="btn btn-navbar">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="admin-container">
        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={() => {
              setShowCreateStaff(!showCreateStaff)
              setShowCreateAdmin(false)
            }}
            className="btn btn-primary"
          >
            {showCreateStaff ? 'Cancel' : 'Create Staff Account'}
          </button>
          <button
            onClick={() => {
              setShowCreateAdmin(!showCreateAdmin)
              setShowCreateStaff(false)
            }}
            className="btn btn-primary"
          >
            {showCreateAdmin ? 'Cancel' : 'Create Admin Account'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Create Staff Form */}
        {showCreateStaff && (
          <section className="create-form-section">
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
                <label htmlFor="staff-clinicId">Clinic ID *</label>
                <input
                  id="staff-clinicId"
                  type="number"
                  value={staffFormData.clinicId}
                  onChange={(e) =>
                    setStaffFormData({ ...staffFormData, clinicId: Number(e.target.value) })
                  }
                  required
                  disabled={loading}
                  min="1"
                />
                <small className="form-hint">Staff must be assigned to a clinic</small>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Staff Account'}
              </button>
            </form>
          </section>
        )}

        {/* Create Admin Form */}
        {showCreateAdmin && (
          <section className="create-form-section">
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
                <label htmlFor="admin-clinicId">Clinic ID *</label>
                <input
                  id="admin-clinicId"
                  type="number"
                  value={adminFormData.clinicId}
                  onChange={(e) =>
                    setAdminFormData({ ...adminFormData, clinicId: Number(e.target.value) })
                  }
                  required
                  disabled={loading}
                  min="1"
                />
                <small className="form-hint">Default clinic assignment (required by backend)</small>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Admin Account'}
              </button>
            </form>
          </section>
        )}

        <div className="admin-content">
          <section className="users-section">
            <div className="section-header">
              <h2>All Users ({users.length})</h2>
              <button onClick={fetchUsers} className="btn btn-secondary">
                Refresh
              </button>
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
                          <button
                            onClick={() => resetPassword(user.email)}
                            className="btn btn-small btn-secondary"
                          >
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="staff-section">
            <div className="section-header">
              <h2>Staff & Admin Members ({staff.length})</h2>
              <button onClick={fetchStaff} className="btn btn-secondary">
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="staff-list">
                {staff.length === 0 ? (
                  <div className="empty-state">No staff members found</div>
                ) : (
                  staff.map((member) => (
                    <div key={member.userId} className="staff-card">
                      <div className="staff-info">
                        <h3>
                          {member.fname} {member.lname}
                        </h3>
                        <p>
                          <strong>Email:</strong> {member.email}
                        </p>
                        <p>
                          <strong>Role:</strong>{' '}
                          <span className={`role-badge role-${member.role?.toLowerCase()}`}>
                            {member.role}
                          </span>
                        </p>
                        <p>
                          <strong>Clinic:</strong> {member.clinicName || `ID: ${member.clinicId}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
