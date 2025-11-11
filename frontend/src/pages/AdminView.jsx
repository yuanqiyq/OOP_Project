import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { adminAPI, userAPI, clinicAPI, doctorAPI, reportAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import './AdminView.css'

export default function AdminView() {
  const { userProfile, signOut, setIgnoreAuthChanges, setOriginalSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [users, setUsers] = useState([])
  const [staff, setStaff] = useState([])
  const [patients, setPatients] = useState([])
  const [clinics, setClinics] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [toast, setToast] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [clinicSearch, setClinicSearch] = useState('')
  const [editingClinicId, setEditingClinicId] = useState(null)
  const [editingInterval, setEditingInterval] = useState('')
  const [clinicPage, setClinicPage] = useState(1)
  const [clinicsPerPage, setClinicsPerPage] = useState(50)
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [selectedClinicForDoctors, setSelectedClinicForDoctors] = useState(null)
  const [clinicDoctors, setClinicDoctors] = useState([])
  const [allDoctors, setAllDoctors] = useState([])
  const [newDoctorForm, setNewDoctorForm] = useState({ fname: '', lname: '', assignedClinic: null })
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStaff: 0,
    totalPatients: 0,
  })
  
  // Create forms state
  const [showCreateStaff, setShowCreateStaff] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [showCreatePatient, setShowCreatePatient] = useState(false)
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

  const [patientFormData, setPatientFormData] = useState({
    email: '',
    password: '',
    fname: '',
    lname: '',
    patientIc: '',
    dateOfBirth: '',
    gender: 'Male',
    emergencyContact: '',
    emergencyContactPhone: '',
    medicalHistory: '',
    allergies: '',
    bloodType: '',
  })

  // Report state
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    fetchAllData()
  }, [])

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

      // Small delay to ensure session is restored before proceeding
      await new Promise(resolve => setTimeout(resolve, 500))

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

  const handleCreatePatient = async (e) => {
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
        email: patientFormData.email,
        password: patientFormData.password,
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

      // Small delay to ensure session is restored before proceeding
      await new Promise(resolve => setTimeout(resolve, 500))

      await adminAPI.createPatient({
        authUuid: authData.user.id,
        email: patientFormData.email,
        fname: patientFormData.fname,
        lname: patientFormData.lname,
        role: 'PATIENT',
        patientIc: patientFormData.patientIc,
        dateOfBirth: patientFormData.dateOfBirth,
        gender: patientFormData.gender,
        emergencyContact: patientFormData.emergencyContact || null,
        emergencyContactPhone: patientFormData.emergencyContactPhone || null,
        medicalHistory: patientFormData.medicalHistory || null,
        allergies: patientFormData.allergies || null,
        bloodType: patientFormData.bloodType || null,
      })

      // Show toast notification
      setToast({
        message: `Successfully created PATIENT account for ${patientFormData.email}`,
        type: 'success'
      })
      
      setPatientFormData({
        email: '',
        password: '',
        fname: '',
        lname: '',
        patientIc: '',
        dateOfBirth: '',
        gender: 'Male',
        emergencyContact: '',
        emergencyContactPhone: '',
        medicalHistory: '',
        allergies: '',
        bloodType: '',
      })
      setShowCreatePatient(false)
      await fetchUsers()
      await fetchPatients()
    } catch (err) {
      setToast({
        message: err.message || 'Failed to create patient account',
        type: 'error'
      })
    } finally {
      // Re-enable auth state change handling
      setIgnoreAuthChanges(false)
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
      if (authUuid) {
        try {
          // Use Supabase Admin API to delete user
          const { supabaseAdmin } = await import('../lib/supabaseAdmin')
          
          if (!supabaseAdmin) {
            console.warn('Supabase Admin client not initialized. Service role key may be missing.')
            console.warn('User deleted from database but not from Supabase Auth.')
          } else {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUuid)
            
            if (deleteError) {
              console.warn('Failed to delete user from Supabase Auth:', deleteError)
              // Continue even if Supabase deletion fails - user is deleted from backend
            }
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

  const handleUpdateClinicInterval = async (clinicId) => {
    if (!editingInterval || isNaN(editingInterval) || parseInt(editingInterval) <= 0) {
      setToast({
        message: 'Please enter a valid interval (positive number)',
        type: 'error'
      })
      return
    }

    try {
      setLoading(true)
      await clinicAPI.update(clinicId, { apptIntervalMin: parseInt(editingInterval) })
      setToast({
        message: `Appointment interval updated to ${editingInterval} minutes`,
        type: 'success'
      })
      await fetchClinics()
      setEditingClinicId(null)
      setEditingInterval('')
    } catch (err) {
      setToast({
        message: err.message || 'Failed to update appointment interval',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const openDoctorModal = async (clinic) => {
    setSelectedClinicForDoctors(clinic)
    setShowDoctorModal(true)
    try {
      const [clinicDocs, allDocs] = await Promise.all([
        doctorAPI.getByClinic(clinic.id),
        doctorAPI.getAll()
      ])
      setClinicDoctors(clinicDocs || [])
      setAllDoctors(allDocs || [])
      setNewDoctorForm({ fname: '', lname: '', assignedClinic: clinic.id })
    } catch (err) {
      setToast({
        message: err.message || 'Failed to load doctors',
        type: 'error'
      })
    }
  }

  const handleAssignDoctor = async (doctorId, clinicId) => {
    try {
      setLoading(true)
      await doctorAPI.update(doctorId, { assignedClinic: clinicId })
      setToast({
        message: 'Doctor assigned successfully',
        type: 'success'
      })
      await openDoctorModal(selectedClinicForDoctors)
    } catch (err) {
      setToast({
        message: err.message || 'Failed to assign doctor',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnassignDoctor = async (doctorId) => {
    try {
      setLoading(true)
      await doctorAPI.update(doctorId, { assignedClinic: null })
      setToast({
        message: 'Doctor unassigned successfully',
        type: 'success'
      })
      await openDoctorModal(selectedClinicForDoctors)
    } catch (err) {
      setToast({
        message: err.message || 'Failed to unassign doctor',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDoctor = async (e) => {
    e.preventDefault()
    if (!newDoctorForm.fname || !newDoctorForm.lname) {
      setToast({
        message: 'Please fill in both first and last name',
        type: 'error'
      })
      return
    }

    try {
      setLoading(true)
      await doctorAPI.create(newDoctorForm)
      setToast({
        message: 'Doctor created and assigned successfully',
        type: 'success'
      })
      setNewDoctorForm({ fname: '', lname: '', assignedClinic: selectedClinicForDoctors.id })
      await openDoctorModal(selectedClinicForDoctors)
    } catch (err) {
      setToast({
        message: err.message || 'Failed to create doctor',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const getCurrentView = () => {
    if (location.pathname.includes('/users')) return 'users'
    if (location.pathname.includes('/clinics')) return 'clinics'
    if (location.pathname.includes('/reports')) return 'reports'
    if (location.pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true)
      setError('')
      setToast(null)

      const blob = await reportAPI.getSystemUsageReport(reportStartDate || null, reportEndDate || null)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename
      const startStr = reportStartDate ? reportStartDate.replace(/-/g, '') : 'start'
      const endStr = reportEndDate ? reportEndDate.replace(/-/g, '') : 'end'
      link.download = `SystemUsageReport_${startStr}_${endStr}.pdf`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setToast({
        message: 'Report generated and downloaded successfully',
        type: 'success'
      })
    } catch (err) {
      setToast({
        message: err.message || 'Failed to generate report',
        type: 'error'
      })
    } finally {
      setGeneratingReport(false)
    }
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
                      setShowCreatePatient(false)
                    }}
                    className="btn btn-primary"
                  >
                    {showCreateStaff ? 'Cancel' : '+ Staff'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateAdmin(!showCreateAdmin)
                      setShowCreateStaff(false)
                      setShowCreatePatient(false)
                    }}
                    className="btn btn-primary"
                  >
                    {showCreateAdmin ? 'Cancel' : '+ Admin'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreatePatient(!showCreatePatient)
                      setShowCreateStaff(false)
                      setShowCreateAdmin(false)
                    }}
                    className="btn btn-primary"
                  >
                    {showCreatePatient ? 'Cancel' : '+ Patient'}
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

              {/* Create Patient Form */}
              {showCreatePatient && (
                <div className="section-card">
                  <h2>Create New Patient Account</h2>
                  <p className="form-description">
                    Create a new patient account. Patients can book appointments and view their medical history.
                  </p>
                  <form onSubmit={handleCreatePatient} className="create-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="patient-fname">First Name</label>
                        <input
                          id="patient-fname"
                          type="text"
                          value={patientFormData.fname}
                          onChange={(e) =>
                            setPatientFormData({ ...patientFormData, fname: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="patient-lname">Last Name</label>
                        <input
                          id="patient-lname"
                          type="text"
                          value={patientFormData.lname}
                          onChange={(e) =>
                            setPatientFormData({ ...patientFormData, lname: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="patient-email">Email</label>
                      <input
                        id="patient-email"
                        type="email"
                        value={patientFormData.email}
                        onChange={(e) =>
                          setPatientFormData({ ...patientFormData, email: e.target.value })
                        }
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="patient-password">Password</label>
                      <input
                        id="patient-password"
                        type="password"
                        value={patientFormData.password}
                        onChange={(e) =>
                          setPatientFormData({ ...patientFormData, password: e.target.value })
                        }
                        required
                        disabled={loading}
                        minLength={6}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="patient-ic">Patient IC</label>
                        <input
                          id="patient-ic"
                          type="text"
                          value={patientFormData.patientIc}
                          onChange={(e) =>
                            setPatientFormData({ ...patientFormData, patientIc: e.target.value })
                          }
                          required
                          disabled={loading}
                          placeholder="e.g., 123456789012"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="patient-dob">Date of Birth</label>
                        <input
                          id="patient-dob"
                          type="date"
                          value={patientFormData.dateOfBirth}
                          onChange={(e) =>
                            setPatientFormData({ ...patientFormData, dateOfBirth: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="patient-gender">Gender</label>
                        <select
                          id="patient-gender"
                          value={patientFormData.gender}
                          onChange={(e) =>
                            setPatientFormData({ ...patientFormData, gender: e.target.value })
                          }
                          required
                          disabled={loading}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="patient-emergency-contact">Emergency Contact Name</label>
                        <input
                          id="patient-emergency-contact"
                          type="text"
                          value={patientFormData.emergencyContact}
                          onChange={(e) =>
                            setPatientFormData({ ...patientFormData, emergencyContact: e.target.value })
                          }
                          disabled={loading}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="patient-emergency-phone">Emergency Contact Phone</label>
                        <input
                          id="patient-emergency-phone"
                          type="tel"
                          value={patientFormData.emergencyContactPhone}
                          onChange={(e) =>
                            setPatientFormData({ ...patientFormData, emergencyContactPhone: e.target.value })
                          }
                          disabled={loading}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="patient-blood-type">Blood Type</label>
                        <select
                          id="patient-blood-type"
                          value={patientFormData.bloodType}
                          onChange={(e) =>
                            setPatientFormData({ ...patientFormData, bloodType: e.target.value })
                          }
                          disabled={loading}
                        >
                          <option value="">Select blood type (Optional)</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="patient-allergies">Allergies</label>
                      <textarea
                        id="patient-allergies"
                        value={patientFormData.allergies}
                        onChange={(e) =>
                          setPatientFormData({ ...patientFormData, allergies: e.target.value })
                        }
                        disabled={loading}
                        placeholder="List any known allergies (Optional)"
                        rows={2}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="patient-medical-history">Medical History</label>
                      <textarea
                        id="patient-medical-history"
                        value={patientFormData.medicalHistory}
                        onChange={(e) =>
                          setPatientFormData({ ...patientFormData, medicalHistory: e.target.value })
                        }
                        disabled={loading}
                        placeholder="Previous medical conditions, surgeries, etc. (Optional)"
                        rows={3}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Patient Account'}
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
                  <h2>All Users ({roleFilter ? users.filter(u => u.role === roleFilter).length : users.length})</h2>
                  <div className="filter-controls">
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value)
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
                        {(roleFilter ? users.filter(u => u.role === roleFilter) : users).map((user) => (
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

          {currentView === 'clinics' && (() => {
            // Filter clinics based on search
            const filteredClinics = clinicSearch ? clinics.filter(c => 
              c.name?.toLowerCase().includes(clinicSearch.toLowerCase()) ||
              c.address?.toLowerCase().includes(clinicSearch.toLowerCase()) ||
              c.region?.toLowerCase().includes(clinicSearch.toLowerCase()) ||
              c.area?.toLowerCase().includes(clinicSearch.toLowerCase()) ||
              String(c.id).includes(clinicSearch)
            ) : clinics

            // Calculate pagination
            const totalPages = Math.ceil(filteredClinics.length / clinicsPerPage)
            const startIndex = (clinicPage - 1) * clinicsPerPage
            const endIndex = startIndex + clinicsPerPage
            const paginatedClinics = filteredClinics.slice(startIndex, endIndex)

            return (
              <>
                <div className="page-header">
                  <h1>Clinic Management</h1>
                  <button onClick={fetchClinics} className="btn btn-secondary">
                    Refresh
                  </button>
                </div>

                <div className="section-card">
                  <div className="section-header">
                    <h2>All Clinics ({filteredClinics.length})</h2>
                    <div className="filter-controls">
                      <input
                        type="text"
                        placeholder="Search by name, address, region, area, or ID..."
                        value={clinicSearch}
                        onChange={(e) => {
                          setClinicSearch(e.target.value)
                          setClinicPage(1) // Reset to first page on search
                        }}
                        className="search-input"
                      />
                      <select
                        value={clinicsPerPage}
                        onChange={(e) => {
                          setClinicsPerPage(Number(e.target.value))
                          setClinicPage(1) // Reset to first page when changing page size
                        }}
                        className="select-input"
                        style={{ minWidth: '120px' }}
                      >
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                        <option value={200}>200 per page</option>
                      </select>
                    </div>
                  </div>
                  {loading ? (
                    <div className="loading">Loading...</div>
                  ) : (
                    <>
                      <div className="clinics-table-container">
                        <table className="users-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Name</th>
                              <th>Address</th>
                              <th>Region</th>
                              <th>Area</th>
                              <th>Appt Interval (min)</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedClinics.map((clinic) => (
                          <tr key={clinic.id}>
                            <td>{clinic.id}</td>
                            <td>{clinic.name || 'N/A'}</td>
                            <td>{clinic.address || 'N/A'}</td>
                            <td>{clinic.region || 'N/A'}</td>
                            <td>{clinic.area || 'N/A'}</td>
                            <td>
                              {editingClinicId === clinic.id ? (
                                <div className="inline-edit">
                                  <input
                                    type="number"
                                    min="1"
                                    value={editingInterval}
                                    onChange={(e) => setEditingInterval(e.target.value)}
                                    className="inline-input"
                                    placeholder={clinic.apptIntervalMin || '15'}
                                  />
                                  <button
                                    onClick={() => handleUpdateClinicInterval(clinic.id)}
                                    className="btn btn-success btn-sm"
                                    disabled={loading}
                                    title="Save"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingClinicId(null)
                                      setEditingInterval('')
                                    }}
                                    className="btn btn-secondary btn-sm"
                                    disabled={loading}
                                    title="Cancel"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-display">
                                  <span>{clinic.apptIntervalMin || 15} min</span>
                                  <button
                                    onClick={() => {
                                      setEditingClinicId(clinic.id)
                                      setEditingInterval(clinic.apptIntervalMin?.toString() || '15')
                                    }}
                                    className="btn btn-secondary btn-sm"
                                    title="Edit Interval"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() => openDoctorModal(clinic)}
                                className="btn btn-primary btn-sm"
                                title="Configure Doctors"
                              >
                                👨‍⚕️ Doctors
                              </button>
                            </td>
                          </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div className="pagination-controls">
                          <button
                            onClick={() => setClinicPage(prev => Math.max(1, prev - 1))}
                            disabled={clinicPage === 1}
                            className="btn btn-secondary btn-sm"
                          >
                            ← Previous
                          </button>
                          <span className="pagination-info">
                            Page {clinicPage} of {totalPages} 
                            ({startIndex + 1}-{Math.min(endIndex, filteredClinics.length)} of {filteredClinics.length})
                          </span>
                          <button
                            onClick={() => setClinicPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={clinicPage === totalPages}
                            className="btn btn-secondary btn-sm"
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )
          })()}

          {currentView === 'reports' && (
            <>
              <div className="page-header">
                <h1>System Usage Reports</h1>
                <p className="subtitle">Generate comprehensive system-wide usage reports</p>
              </div>

              <div className="section-card">
                <h2>System-Wide Usage Report</h2>
                <p className="form-description">
                  Generate a comprehensive PDF report with system-wide statistics including appointments, cancellations, 
                  patients seen, average waiting time, and no-show rates. Default period is from the start of the current month to today.
                </p>

                <div className="report-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="report-start-date">Start Date (Optional)</label>
                      <input
                        id="report-start-date"
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="form-input"
                        disabled={generatingReport}
                      />
                      <small className="form-hint">If empty, defaults to start of current month</small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="report-end-date">End Date (Optional)</label>
                      <input
                        id="report-end-date"
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="form-input"
                        max={new Date().toISOString().split('T')[0]}
                        disabled={generatingReport}
                      />
                      <small className="form-hint">If empty, defaults to today's date</small>
                    </div>
                  </div>

                  <div className="report-metrics-info">
                    <h3>Report Includes:</h3>
                    <ul className="metrics-list">
                      <li>📊 <strong>Total Appointments Booked</strong> - All appointments excluding cancelled ones</li>
                      <li>❌ <strong>Total Cancellations</strong> - All cancelled appointments</li>
                      <li>👥 <strong>Patients Seen</strong> - All queue logs with completed status</li>
                      <li>⏱️ <strong>Average Waiting Time</strong> - Mean time from appointment start to check-in</li>
                      <li>🚫 <strong>No-Show Rate</strong> - Ratio of appointments without queue logs</li>
                    </ul>
                  </div>

                  <div className="form-actions">
                    <button
                      onClick={handleGenerateReport}
                      className="btn btn-primary"
                      disabled={generatingReport}
                    >
                      {generatingReport ? 'Generating PDF...' : '📄 Generate & Download PDF Report'}
                    </button>
                  </div>
                </div>
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

      {/* Doctor Configuration Modal */}
      {showDoctorModal && selectedClinicForDoctors && (
        <div className="modal-overlay" onClick={() => setShowDoctorModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Configure Doctors - {selectedClinicForDoctors.name}</h2>
              <button
                onClick={() => setShowDoctorModal(false)}
                className="modal-close"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Assigned Doctors */}
              <div className="section-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Assigned Doctors ({clinicDoctors.length})</h3>
                {clinicDoctors.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>No doctors assigned to this clinic</div>
                ) : (
                  <div className="doctors-list">
                    {clinicDoctors.map((doctor) => (
                      <div key={doctor.id} className="doctor-item">
                        <div className="doctor-info">
                          <strong>{doctor.fname} {doctor.lname}</strong>
                          <span className="doctor-id">ID: {doctor.id}</span>
                          {doctor.shiftDays && doctor.shiftDays.length > 0 && (
                            <span className="shift-days">
                              Shift Days: {doctor.shiftDays.join(', ')}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnassignDoctor(doctor.id)}
                          className="btn btn-danger btn-sm"
                          disabled={loading}
                        >
                          Unassign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assign Existing Doctor */}
              <div className="section-card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Assign Existing Doctor</h3>
                {allDoctors.filter(d => !d.assignedClinic || d.assignedClinic !== selectedClinicForDoctors.id).length === 0 ? (
                  <div className="empty-state" style={{ padding: '1rem' }}>No unassigned doctors available</div>
                ) : (
                  <div className="doctors-list">
                    {allDoctors
                      .filter(d => !d.assignedClinic || d.assignedClinic !== selectedClinicForDoctors.id)
                      .map((doctor) => (
                        <div key={doctor.id} className="doctor-item">
                          <div className="doctor-info">
                            <strong>{doctor.fname} {doctor.lname}</strong>
                            <span className="doctor-id">ID: {doctor.id}</span>
                            {doctor.assignedClinic && (
                              <span className="assigned-to">Currently at Clinic {doctor.assignedClinic}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleAssignDoctor(doctor.id, selectedClinicForDoctors.id)}
                            className="btn btn-success btn-sm"
                            disabled={loading}
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Create New Doctor */}
              <div className="section-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Create New Doctor</h3>
                <form onSubmit={handleCreateDoctor} className="create-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="doctor-fname">First Name</label>
                      <input
                        id="doctor-fname"
                        type="text"
                        value={newDoctorForm.fname}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, fname: e.target.value })
                        }
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="doctor-lname">Last Name</label>
                      <input
                        id="doctor-lname"
                        type="text"
                        value={newDoctorForm.lname}
                        onChange={(e) =>
                          setNewDoctorForm({ ...newDoctorForm, lname: e.target.value })
                        }
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create & Assign Doctor'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
