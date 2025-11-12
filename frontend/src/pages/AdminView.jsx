import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { adminAPI, userAPI, clinicAPI, doctorAPI, reportAPI, appointmentAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
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
  const [expandedClinics, setExpandedClinics] = useState(new Set())
  const [clinicDoctorsMap, setClinicDoctorsMap] = useState({})
  const [editingOperatingHours, setEditingOperatingHours] = useState(null)
  const [operatingHoursForm, setOperatingHoursForm] = useState({})
  const [editingClinicDoctors, setEditingClinicDoctors] = useState(null)
  const [editingDoctorInClinic, setEditingDoctorInClinic] = useState(null)
  const [editingDoctorShifts, setEditingDoctorShifts] = useState([])
  const [assigningDoctor, setAssigningDoctor] = useState(null)
  const [assigningDoctorShifts, setAssigningDoctorShifts] = useState([])
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false)
  const [doctorToUnassign, setDoctorToUnassign] = useState(null)
  const [clinicToUnassignFrom, setClinicToUnassignFrom] = useState(null)
  const [showEditDoctorUnassignConfirm, setShowEditDoctorUnassignConfirm] = useState(false)
  // Doctor management state for doctors view
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false)
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState(null)
  const [newDoctor, setNewDoctor] = useState({ fname: '', lname: '', assignedClinic: null, shiftDays: [] })
  const [filledDays, setFilledDays] = useState(new Set())
  const [selectedClinicFilter, setSelectedClinicFilter] = useState(null)
  const [clinicFilterSearch, setClinicFilterSearch] = useState('')
  const [showClinicFilterDropdown, setShowClinicFilterDropdown] = useState(false)
  const [doctorNameSearch, setDoctorNameSearch] = useState('')
  const [showDoctorSearchDropdown, setShowDoctorSearchDropdown] = useState(false)
  const [doctorPage, setDoctorPage] = useState(1)
  const [doctorsPerPage] = useState(20)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStaff: 0,
    totalPatients: 0,
  })
  const [appointments, setAppointments] = useState([])
  const [dashboardStats, setDashboardStats] = useState({
    totalAppointments: 0,
    scheduledAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalClinics: 0,
    totalDoctors: 0,
    appointmentsByStatus: {},
    appointmentsByClinic: {},
    appointmentsOverTime: [],
    userGrowth: [],
  })
  
  // User management state
  const [expandedUsers, setExpandedUsers] = useState(new Set())
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingUserData, setEditingUserData] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  
  // Create forms state
  const [showCreateStaff, setShowCreateStaff] = useState(false)
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)
  const [showCreatePatient, setShowCreatePatient] = useState(false)
  const [selectedClinicId, setSelectedClinicId] = useState(969)
  
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

  useEffect(() => {
    if (appointments.length > 0 || users.length > 0) {
      calculateDashboardStats(appointments)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, users, clinics, doctors])

  // Handle clicks outside expanded rows to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the users table container
      const usersTableContainer = document.querySelector('.users-table-container')
      const sectionCard = document.querySelector('.section-card')
      
      // Don't close if clicking inside the table or section card
      if (usersTableContainer && usersTableContainer.contains(event.target)) {
        return
      }
      
      // Don't close if clicking on modals
      if (event.target.closest('.modal-overlay') || event.target.closest('.modal-content')) {
        return
      }
      
      // Close all expanded rows if clicking outside
      if (expandedUsers.size > 0) {
        setExpandedUsers(new Set())
        // Also close editing if open
        if (editingUserId) {
          setEditingUserId(null)
          setEditingUserData(null)
        }
      }
    }

    if (expandedUsers.size > 0) {
      // Use a small delay to avoid closing immediately when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [expandedUsers, editingUserId])

  const fetchAllData = async () => {
    await Promise.all([
      fetchUsers(),
      fetchStaff(),
      fetchPatients(),
      fetchClinics(),
      fetchDoctors(),
      fetchAppointments(),
    ])
  }

  const fetchAppointments = async () => {
    try {
      const data = await appointmentAPI.getAll()
      setAppointments(data || [])
      calculateDashboardStats(data || [])
    } catch (err) {
      console.error('Failed to load appointments', err)
    }
  }

  const calculateDashboardStats = (appts) => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Status breakdown
    const statusCounts = {}
    appts.forEach(apt => {
      const status = apt.apptStatus || 'UNKNOWN'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    // Clinic breakdown
    const clinicCounts = {}
    appts.forEach(apt => {
      const clinicId = apt.clinicId
      if (clinicId) {
        clinicCounts[clinicId] = (clinicCounts[clinicId] || 0) + 1
      }
    })

    // Appointments over time (last 30 days)
    const timeSeries = {}
    appts.forEach(apt => {
      if (apt.dateTime) {
        const date = new Date(apt.dateTime)
        if (date >= thirtyDaysAgo) {
          const dateKey = date.toISOString().split('T')[0]
          timeSeries[dateKey] = (timeSeries[dateKey] || 0) + 1
        }
      }
    })
    const appointmentsOverTime = Object.keys(timeSeries)
      .sort()
      .map(date => ({ date, count: timeSeries[date] }))

    // User growth over time
    const userGrowth = {}
    users.forEach(user => {
      if (user.createdAt) {
        const date = new Date(user.createdAt)
        if (date >= thirtyDaysAgo) {
          const dateKey = date.toISOString().split('T')[0]
          userGrowth[dateKey] = (userGrowth[dateKey] || 0) + 1
        }
      }
    })
    const userGrowthData = Object.keys(userGrowth)
      .sort()
      .map(date => ({ date, count: userGrowth[date] }))

    setDashboardStats({
      totalAppointments: appts.length,
      scheduledAppointments: statusCounts.SCHEDULED || 0,
      completedAppointments: statusCounts.COMPLETED || 0,
      cancelledAppointments: statusCounts.CANCELLED || 0,
      totalClinics: clinics.length,
      totalDoctors: doctors.length,
      appointmentsByStatus: statusCounts,
      appointmentsByClinic: clinicCounts,
      appointmentsOverTime,
      userGrowth: userGrowthData,
    })
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


  const handleDeleteClick = (userId, email, authUuid) => {
    setUserToDelete({ userId, email, authUuid })
    setShowDeleteConfirm(true)
  }

  const deleteUser = async () => {
    if (!userToDelete) return
    
    const { userId, email, authUuid } = userToDelete
    
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
      
      // Close confirmation modal
      setShowDeleteConfirm(false)
      setUserToDelete(null)
      
      // Remove from expanded if it was expanded
      const newExpanded = new Set(expandedUsers)
      newExpanded.delete(userId)
      setExpandedUsers(newExpanded)
      
      // Clear editing if it was being edited
      if (editingUserId === userId) {
        setEditingUserId(null)
        setEditingUserData(null)
      }
      
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

  const toggleUserExpand = (userId) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
      // Also close editing if it was open
      if (editingUserId === userId) {
        setEditingUserId(null)
        setEditingUserData(null)
      }
    } else {
      newExpanded.add(userId)
    }
    setExpandedUsers(newExpanded)
  }

  const handleEditClick = (e, user) => {
    e.stopPropagation()
    const patient = patients.find(p => p.userId === user.userId)
    const staffMember = staff.find(s => s.userId === user.userId)
    
    setEditingUserId(user.userId)
    const editData = {
      fname: user.fname || '',
      lname: user.lname || '',
      email: user.email || '',
      role: user.role || '',
    }
    
    if (user.role === 'PATIENT' && patient) {
      editData.patientData = {
        patientIc: patient.patientIc || '',
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
        gender: patient.gender || 'Male',
        emergencyContact: patient.emergencyContact || '',
        emergencyContactPhone: patient.emergencyContactPhone || '',
        medicalHistory: patient.medicalHistory || '',
        allergies: patient.allergies || '',
        bloodType: patient.bloodType || '',
      }
    }
    
    if (user.role === 'STAFF' && staffMember) {
      editData.staffData = {
        clinicId: staffMember.clinicId || null,
      }
    }
    
    setEditingUserData(editData)
    // Ensure row is expanded
    const newExpanded = new Set(expandedUsers)
    newExpanded.add(user.userId)
    setExpandedUsers(newExpanded)
  }

  const handleSaveEdit = async () => {
    if (!editingUserId || !editingUserData) return

    try {
      setLoading(true)
      
      // Update user in backend
      await userAPI.update(editingUserId, {
        fname: editingUserData.fname,
        lname: editingUserData.lname,
        email: editingUserData.email,
      })

      // If it's a patient, also update patient details
      if (editingUserData.role === 'PATIENT' && editingUserData.patientData) {
        // Find the patient to get the correct patient ID
        const patient = patients.find(p => p.userId === editingUserId)
        if (!patient) {
          throw new Error('Patient not found')
        }
        
        // Helper function to convert empty strings to null
        const toNullIfEmpty = (value) => (value === '' || value === null || value === undefined) ? null : value
        
        // Convert empty strings to null and format dateOfBirth properly
        const patientUpdateData = {
          patientIc: toNullIfEmpty(editingUserData.patientData.patientIc),
          dateOfBirth: toNullIfEmpty(editingUserData.patientData.dateOfBirth),
          gender: toNullIfEmpty(editingUserData.patientData.gender),
          emergencyContact: toNullIfEmpty(editingUserData.patientData.emergencyContact),
          emergencyContactPhone: toNullIfEmpty(editingUserData.patientData.emergencyContactPhone),
          medicalHistory: toNullIfEmpty(editingUserData.patientData.medicalHistory),
          allergies: toNullIfEmpty(editingUserData.patientData.allergies),
          bloodType: toNullIfEmpty(editingUserData.patientData.bloodType),
        }
        
        // Use patient's ID (which should be the same as userId for Patient entity)
        // Patient extends User, so the primary key is userId
        const patientId = patient.userId || patient.id || editingUserId
        await adminAPI.updatePatient(patientId, patientUpdateData)
      }
      
      // If it's a staff, also update staff details
      if (editingUserData.role === 'STAFF' && editingUserData.staffData) {
        await adminAPI.updateStaff(editingUserId, editingUserData.staffData)
      }

      setToast({
        message: 'User updated successfully',
        type: 'success'
      })

      setEditingUserId(null)
      setEditingUserData(null)
      
      await fetchUsers()
      await fetchStaff()
      await fetchPatients()
    } catch (err) {
      setToast({
        message: err.message || 'Failed to update user',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    const currentEditingUserId = editingUserId
    setEditingUserId(null)
    setEditingUserData(null)
    // Close the expanded row
    if (currentEditingUserId) {
      const newExpanded = new Set(expandedUsers)
      newExpanded.delete(currentEditingUserId)
      setExpandedUsers(newExpanded)
    }
  }

  const handleResetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth',
      })
      if (error) throw error
      setToast({
        message: `Password reset email sent to ${email}`,
        type: 'success'
      })
    } catch (err) {
      setToast({
        message: err.message || 'Failed to send password reset email',
        type: 'error'
      })
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

  const toggleClinicExpansion = async (clinicId) => {
    const newExpanded = new Set(expandedClinics)
    if (newExpanded.has(clinicId)) {
      newExpanded.delete(clinicId)
    } else {
      newExpanded.add(clinicId)
      // Fetch doctors for this clinic if not already loaded
      if (!clinicDoctorsMap[clinicId]) {
        try {
          const doctors = await doctorAPI.getByClinic(clinicId)
          setClinicDoctorsMap(prev => ({ ...prev, [clinicId]: doctors || [] }))
        } catch (err) {
          console.error('Failed to load doctors for clinic', err)
          setClinicDoctorsMap(prev => ({ ...prev, [clinicId]: [] }))
        }
      }
    }
    setExpandedClinics(newExpanded)
  }

  const formatOperatingHours = (clinic) => {
    if (!clinic) return null

    const formatTime = (timeStr) => {
      if (!timeStr) return null
      const time = timeStr.split(':')
      if (time.length < 2) return null
      const hours = parseInt(time[0], 10)
      const minutes = time[1] || '00'
      if (isNaN(hours)) return null
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
      return `${displayHours}:${minutes} ${period}`
    }

    const hours = []

    // Monday-Friday
    if (clinic.monFriAmStart || clinic.monFriPmStart) {
      const monFriHours = []
      if (clinic.monFriAmStart && clinic.monFriAmEnd) {
        monFriHours.push(`${formatTime(clinic.monFriAmStart)} - ${formatTime(clinic.monFriAmEnd)}`)
      }
      if (clinic.monFriPmStart && clinic.monFriPmEnd) {
        monFriHours.push(`${formatTime(clinic.monFriPmStart)} - ${formatTime(clinic.monFriPmEnd)}`)
      }
      if (monFriHours.length > 0) {
        hours.push({ day: 'Mon - Fri', times: monFriHours.join(', ') })
      }
    }

    // Saturday
    if (clinic.satAmStart && clinic.satAmEnd) {
      hours.push({ day: 'Saturday', times: `${formatTime(clinic.satAmStart)} - ${formatTime(clinic.satAmEnd)}` })
    }

    // Sunday
    if (clinic.sunAmStart && clinic.sunAmEnd) {
      hours.push({ day: 'Sunday', times: `${formatTime(clinic.sunAmStart)} - ${formatTime(clinic.sunAmEnd)}` })
    }

    // Public Holiday
    if (clinic.phAmStart && clinic.phAmEnd) {
      hours.push({ day: 'Public Holiday', times: `${formatTime(clinic.phAmStart)} - ${formatTime(clinic.phAmEnd)}` })
    }

    return hours.length > 0 ? hours : null
  }

  const handleEditOperatingHours = (clinic) => {
    setEditingOperatingHours(clinic.id)
    // Convert time strings to HH:mm format for time inputs
    const formatTimeForInput = (timeStr) => {
      if (!timeStr) return ''
      // If already in HH:mm format, return as is
      if (typeof timeStr === 'string' && timeStr.length === 5 && timeStr.includes(':')) {
        return timeStr.substring(0, 5) // Ensure it's exactly HH:mm
      }
      // If in HH:mm:ss format, extract HH:mm
      if (typeof timeStr === 'string' && timeStr.includes(':')) {
        const parts = timeStr.split(':')
        return `${parts[0]}:${parts[1]}`
      }
      return ''
    }
    
    setOperatingHoursForm({
      monFriAmStart: formatTimeForInput(clinic.monFriAmStart),
      monFriAmEnd: formatTimeForInput(clinic.monFriAmEnd),
      monFriPmStart: formatTimeForInput(clinic.monFriPmStart),
      monFriPmEnd: formatTimeForInput(clinic.monFriPmEnd),
      satAmStart: formatTimeForInput(clinic.satAmStart),
      satAmEnd: formatTimeForInput(clinic.satAmEnd),
      sunAmStart: formatTimeForInput(clinic.sunAmStart),
      sunAmEnd: formatTimeForInput(clinic.sunAmEnd),
      phAmStart: formatTimeForInput(clinic.phAmStart),
      phAmEnd: formatTimeForInput(clinic.phAmEnd),
    })
  }

  const handleSaveOperatingHours = async (clinicId) => {
    try {
      setLoading(true)
      // Convert time strings to proper format (HH:mm)
      const updateData = {}
      Object.keys(operatingHoursForm).forEach(key => {
        if (operatingHoursForm[key]) {
          // Ensure time is in HH:mm format
          let time = operatingHoursForm[key]
          if (time.length === 5 && time.includes(':')) {
            updateData[key] = time
          }
        } else {
          updateData[key] = null
        }
      })
      
      await clinicAPI.update(clinicId, updateData)
      setToast({
        message: 'Operating hours updated successfully',
        type: 'success'
      })
      await fetchClinics()
      setEditingOperatingHours(null)
      setOperatingHoursForm({})
    } catch (err) {
      setToast({
        message: err.message || 'Failed to update operating hours',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnassignDoctorFromClinic = async () => {
    if (!doctorToUnassign || !clinicToUnassignFrom) return
    
    try {
      setLoading(true)
      await doctorAPI.update(doctorToUnassign.id, { assignedClinic: null })
      setToast({
        message: `Dr. ${doctorToUnassign.fname} ${doctorToUnassign.lname} unassigned successfully`,
        type: 'success'
      })
      // Refresh clinic doctors
      const doctors = await doctorAPI.getByClinic(clinicToUnassignFrom)
      setClinicDoctorsMap(prev => ({ ...prev, [clinicToUnassignFrom]: doctors || [] }))
      // Refresh main doctors list
      await fetchDoctors()
      // Reset any editing states
      setEditingDoctorInClinic(null)
      setEditingDoctorShifts([])
      // Close confirmation modal
      setShowUnassignConfirm(false)
      setDoctorToUnassign(null)
      setClinicToUnassignFrom(null)
    } catch (err) {
      setToast({
        message: err.message || 'Failed to unassign doctor',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const openUnassignConfirm = (doctor, clinicId) => {
    setDoctorToUnassign(doctor)
    setClinicToUnassignFrom(clinicId)
    setShowUnassignConfirm(true)
  }

  const handleEditDoctorShiftsInClinic = (doctor, clinicId) => {
    const shiftDaysArray = Array.isArray(doctor.shiftDays) ? doctor.shiftDays : (doctor.shiftDays ? [doctor.shiftDays] : [])
    setEditingDoctorInClinic(doctor.id)
    setEditingDoctorShifts([...shiftDaysArray])
    setEditingClinicDoctors(clinicId)
  }

  const handleSaveDoctorShiftsInClinic = async (doctorId, clinicId) => {
    try {
      setLoading(true)
      await doctorAPI.update(doctorId, {
        shiftDays: editingDoctorShifts.length > 0 ? editingDoctorShifts.sort() : null
      })
      setToast({
        message: 'Doctor shifts updated successfully',
        type: 'success'
      })
      // Refresh clinic doctors
      const doctors = await doctorAPI.getByClinic(clinicId)
      setClinicDoctorsMap(prev => ({ ...prev, [clinicId]: doctors || [] }))
      await fetchDoctors() // Also refresh main doctors list
      setEditingDoctorInClinic(null)
      setEditingDoctorShifts([])
      setEditingClinicDoctors(null)
    } catch (err) {
      setToast({
        message: err.message || 'Failed to update doctor shifts',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssignDoctorToClinic = async (doctorId, clinicId) => {
    try {
      setLoading(true)
      await doctorAPI.update(doctorId, {
        assignedClinic: clinicId,
        shiftDays: assigningDoctorShifts.length > 0 ? assigningDoctorShifts.sort() : null
      })
      setToast({
        message: 'Doctor assigned successfully',
        type: 'success'
      })
      // Refresh clinic doctors
      const doctors = await doctorAPI.getByClinic(clinicId)
      setClinicDoctorsMap(prev => ({ ...prev, [clinicId]: doctors || [] }))
      await fetchDoctors() // Also refresh main doctors list
      setAssigningDoctor(null)
      setAssigningDoctorShifts([])
    } catch (err) {
      setToast({
        message: err.message || 'Failed to assign doctor',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleDayForDoctorInClinic = (day, isAssigning = false) => {
    if (isAssigning) {
      setAssigningDoctorShifts(prev => {
        if (prev.includes(day)) {
          return prev.filter(d => d !== day)
        } else {
          return [...prev, day].sort()
        }
      })
    } else {
      setEditingDoctorShifts(prev => {
        if (prev.includes(day)) {
          return prev.filter(d => d !== day)
        } else {
          return [...prev, day].sort()
        }
      })
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

  // Helper functions for doctor management
  const getDayLabel = (day) => {
    const labels = { 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 7: 'S' }
    return labels[day] || day
  }

  const getDayFullName = (day) => {
    const names = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' }
    return names[day] || `Day ${day}`
  }

  // Fetch doctors for doctors view (filtered by clinic if selected)
  const fetchDoctorsForView = async () => {
    try {
      setLoading(true)
      let data
      if (selectedClinicFilter) {
        data = await doctorAPI.getByClinic(selectedClinicFilter)
      } else {
        data = await doctorAPI.getAll()
      }
      setDoctors(data || [])
      // Calculate filled days (excluding the doctor being edited)
      const filled = new Set()
      data?.forEach(doctor => {
        if (doctor.shiftDays && doctor.shiftDays.length > 0 && (!editingDoctor || doctor.id !== editingDoctor.id)) {
          // Only count filled days for doctors in the same clinic
          if (!selectedClinicFilter || doctor.assignedClinic === selectedClinicFilter) {
            doctor.shiftDays.forEach(day => filled.add(day))
          }
        }
      })
      setFilledDays(filled)
    } catch (err) {
      console.error('Failed to fetch doctors', err)
      setToast({
        message: err.message || 'Failed to fetch doctors',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle day toggle for shift days
  const handleDayToggle = (day, isEditMode = false) => {
    if (filledDays.has(day)) return // Don't allow selecting filled days
    
    if (isEditMode && editingDoctor) {
      setEditingDoctor(prev => {
        const shiftDays = prev.shiftDays.includes(day)
          ? prev.shiftDays.filter(d => d !== day)
          : [...prev.shiftDays, day].sort()
        return { ...prev, shiftDays }
      })
    } else {
      setNewDoctor(prev => {
        const shiftDays = prev.shiftDays.includes(day)
          ? prev.shiftDays.filter(d => d !== day)
          : [...prev.shiftDays, day].sort()
        return { ...prev, shiftDays }
      })
    }
  }

  // Handle edit doctor
  const handleEditDoctor = (doctor) => {
    // Ensure shiftDays is always an array
    const shiftDaysArray = Array.isArray(doctor.shiftDays) ? doctor.shiftDays : (doctor.shiftDays ? [doctor.shiftDays] : [])
    setEditingDoctor({ ...doctor, shiftDays: shiftDaysArray })
    setShowEditDoctorModal(true)
    // Recalculate filled days excluding this doctor
    const filled = new Set()
    doctors.forEach(d => {
      if (d.shiftDays && d.id !== doctor.id) {
        // Only count filled days for doctors in the same clinic as the doctor being edited
        const doctorClinic = doctor.assignedClinic
        if (!doctorClinic || d.assignedClinic === doctorClinic) {
          const days = Array.isArray(d.shiftDays) ? d.shiftDays : (d.shiftDays ? [d.shiftDays] : [])
          days.forEach(day => filled.add(day))
        }
      }
    })
    setFilledDays(filled)
  }

  // Create doctor
  const createDoctor = async () => {
    if (!newDoctor.fname || !newDoctor.lname) {
      setToast({
        message: 'First name and last name are required',
        type: 'error'
      })
      return
    }

    if (!newDoctor.assignedClinic) {
      setToast({
        message: 'Please select a clinic',
        type: 'error'
      })
      return
    }

    try {
      setLoading(true)
      await doctorAPI.create({
        fname: newDoctor.fname,
        lname: newDoctor.lname,
        assignedClinic: newDoctor.assignedClinic,
        shiftDays: newDoctor.shiftDays.length > 0 ? newDoctor.shiftDays : null
      })
      setToast({
        message: 'Doctor created successfully!',
        type: 'success'
      })
      setShowAddDoctorModal(false)
      setNewDoctor({ fname: '', lname: '', assignedClinic: null, shiftDays: [] })
      await fetchDoctorsForView()
      await fetchDoctors() // Also refresh the main doctors list
    } catch (err) {
      setToast({
        message: err.message || 'Failed to create doctor',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Update doctor
  const updateDoctor = async () => {
    if (!editingDoctor || !editingDoctor.fname || !editingDoctor.lname) {
      setToast({
        message: 'First name and last name are required',
        type: 'error'
      })
      return
    }

    try {
      setLoading(true)
      await doctorAPI.update(editingDoctor.id, {
        fname: editingDoctor.fname,
        lname: editingDoctor.lname,
        assignedClinic: editingDoctor.assignedClinic,
        shiftDays: editingDoctor.shiftDays.length > 0 ? editingDoctor.shiftDays : null
      })
      setToast({
        message: 'Doctor updated successfully!',
        type: 'success'
      })
      setShowEditDoctorModal(false)
      setEditingDoctor(null)
      await fetchDoctorsForView()
      await fetchDoctors() // Also refresh the main doctors list
    } catch (err) {
      setToast({
        message: err.message || 'Failed to update doctor',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  // Effect to fetch doctors when clinic filter changes or when entering doctors view
  useEffect(() => {
    if (location.pathname.includes('/doctors')) {
      fetchDoctorsForView()
      setDoctorPage(1) // Reset to first page when filter changes
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClinicFilter, location.pathname])

  // Close clinic filter and doctor search dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      const isInsideDropdown = target.closest('.searchable-dropdown') !== null || 
                               target.closest('.dropdown-menu') !== null ||
                               target.closest('.dropdown-item') !== null ||
                               target.closest('.clear-filter-btn') !== null ||
                               target.closest('.doctor-search-wrapper') !== null
      
      if (!isInsideDropdown) {
        setShowClinicFilterDropdown(false)
        setShowDoctorSearchDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside, true)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [])

  // Filter clinics based on search text
  const getFilteredClinicsForFilter = () => {
    if (!clinicFilterSearch) return clinics
    return clinics.filter(clinic =>
      clinic.name?.toLowerCase().includes(clinicFilterSearch.toLowerCase())
    )
  }

  // Filter doctors by name for search suggestions
  const getFilteredDoctorsForSearch = () => {
    if (!doctorNameSearch) return []
    const searchLower = doctorNameSearch.toLowerCase()
    return doctors.filter(doctor => {
      const fullName = `Dr. ${doctor.fname} ${doctor.lname}`.toLowerCase()
      const firstName = doctor.fname?.toLowerCase() || ''
      const lastName = doctor.lname?.toLowerCase() || ''
      return fullName.includes(searchLower) || 
             firstName.includes(searchLower) || 
             lastName.includes(searchLower)
    }).slice(0, 10) // Limit to 10 suggestions
  }

  // Filter doctors based on name search
  const getFilteredDoctors = () => {
    let filtered = doctors
    if (doctorNameSearch) {
      const searchLower = doctorNameSearch.toLowerCase()
      filtered = filtered.filter(doctor => {
        const fullName = `Dr. ${doctor.fname} ${doctor.lname}`.toLowerCase()
        const firstName = doctor.fname?.toLowerCase() || ''
        const lastName = doctor.lname?.toLowerCase() || ''
        return fullName.includes(searchLower) || 
               firstName.includes(searchLower) || 
               lastName.includes(searchLower)
      })
    }
    return filtered
  }

  // Update clinic filter search when selected clinic changes
  useEffect(() => {
    if (selectedClinicFilter) {
      const clinic = clinics.find(c => c.id === selectedClinicFilter)
      if (clinic) {
        setClinicFilterSearch(clinic.name)
      }
    } else {
      setClinicFilterSearch('')
    }
  }, [selectedClinicFilter, clinics])

  const getCurrentView = () => {
    if (location.pathname.includes('/users')) return 'users'
    if (location.pathname.includes('/clinics')) return 'clinics'
    if (location.pathname.includes('/doctors')) return 'doctors'
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
                <h1>Admin Dashboard</h1>
              </div>

              {/* Charts Grid */}
              <div className="charts-grid">
                {/* Appointments by Status Chart */}
                <div className="section-card chart-card">
                  <h2>Appointments by Status</h2>
                  <div className="chart-container">
                    {Object.keys(dashboardStats.appointmentsByStatus).length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(dashboardStats.appointmentsByStatus).map(([status, count]) => ({
                              name: status,
                              value: count,
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {Object.keys(dashboardStats.appointmentsByStatus).map((status, index) => {
                              const colors = ['#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFD93D']
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid rgba(78, 205, 196, 0.2)',
                              borderRadius: '8px',
                              padding: '8px 12px'
                            }}
                            formatter={(value, name) => [value, name]}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => `${value}: ${dashboardStats.appointmentsByStatus[value] || 0}`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data">No appointment data available</div>
                    )}
                  </div>
                </div>

                {/* Appointments Over Time Chart */}
                <div className="section-card chart-card">
                  <h2>Appointments Over Time (Last 30 Days)</h2>
                  <div className="chart-container">
                    {dashboardStats.appointmentsOverTime.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart
                            data={dashboardStats.appointmentsOverTime.map(d => ({
                              date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              appointments: d.count,
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#666"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              stroke="#666"
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid rgba(78, 205, 196, 0.2)',
                                borderRadius: '8px',
                                padding: '8px 12px'
                              }}
                              animationDuration={200}
                            />
                            <Area
                              type="monotone"
                              dataKey="appointments"
                              stroke="#4ECDC4"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorAppointments)"
                              animationBegin={0}
                              animationDuration={1000}
                              animationEasing="ease-out"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                        <div className="chart-stats">
                          <div className="chart-stat-item">
                            <span className="stat-label">Total (30 days):</span>
                            <span className="stat-value">{dashboardStats.appointmentsOverTime.reduce((sum, d) => sum + d.count, 0)}</span>
                          </div>
                          <div className="chart-stat-item">
                            <span className="stat-label">Average per day:</span>
                            <span className="stat-value">{(dashboardStats.appointmentsOverTime.reduce((sum, d) => sum + d.count, 0) / dashboardStats.appointmentsOverTime.length).toFixed(1)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="no-data">No data available for the last 30 days</div>
                    )}
                  </div>
                </div>

                {/* Appointments by Clinic Chart */}
                <div className="section-card chart-card">
                  <h2>Appointments by Clinic</h2>
                  <div className="chart-container">
                    {Object.keys(dashboardStats.appointmentsByClinic).length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={Object.entries(dashboardStats.appointmentsByClinic)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([clinicId, count]) => {
                              const clinic = clinics.find(c => c.id === Number(clinicId))
                              return {
                                name: clinic ? clinic.name : `Clinic ${clinicId}`,
                                appointments: count,
                              }
                            })}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            stroke="#666"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis 
                            stroke="#666"
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid rgba(78, 205, 196, 0.2)',
                              borderRadius: '8px',
                              padding: '8px 12px'
                            }}
                            animationDuration={200}
                          />
                          <Bar
                            dataKey="appointments"
                            fill="#4ECDC4"
                            radius={[8, 8, 0, 0]}
                            animationBegin={0}
                            animationDuration={1000}
                            animationEasing="ease-out"
                          >
                            {Object.entries(dashboardStats.appointmentsByClinic)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 10)
                              .map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#4ECDC4" />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data">No appointment data by clinic</div>
                    )}
                  </div>
                </div>

                {/* User Roles Distribution Chart */}
                <div className="section-card chart-card">
                  <h2>User Roles Distribution</h2>
                  <div className="chart-container">
                    {stats.totalUsers > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Patients', value: users.filter(u => u.role === 'PATIENT').length },
                              { name: 'Staff', value: users.filter(u => u.role === 'STAFF').length },
                              { name: 'Admins', value: users.filter(u => u.role === 'ADMIN').length },
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            <Cell fill="#4ECDC4" />
                            <Cell fill="#95E1D3" />
                            <Cell fill="#F38181" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid rgba(78, 205, 196, 0.2)',
                              borderRadius: '8px',
                              padding: '8px 12px'
                            }}
                            formatter={(value, name) => [value, name]}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => {
                              const roleCounts = {
                                'Patients': users.filter(u => u.role === 'PATIENT').length,
                                'Staff': users.filter(u => u.role === 'STAFF').length,
                                'Admins': users.filter(u => u.role === 'ADMIN').length,
                              }
                              return `${value}: ${roleCounts[value] || 0}`
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data">No user data available</div>
                    )}
                  </div>
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
                    <h3>{dashboardStats.totalAppointments}</h3>
                    <p>Total Appointments</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🏢</div>
                  <div className="stat-content">
                    <h3>{dashboardStats.totalClinics}</h3>
                    <p>Clinics</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <h3>{dashboardStats.scheduledAppointments}</h3>
                    <p>Scheduled</p>
                  </div>
                </div>
              </div>

            </>
          )}

          {currentView === 'users' && (
            <>
              <div className="page-header">
                <h1>User Management</h1>
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

              <div className="section-card">
                <div className="section-header">
                  <h2>All Users ({roleFilter ? users.filter(u => u.role === roleFilter).length : users.length})</h2>
                  <div className="filter-controls">
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value)
                      }}
                      className="select-input styled-filter"
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
                        {(roleFilter ? users.filter(u => u.role === roleFilter) : users).map((user) => {
                          const isExpanded = expandedUsers.has(user.userId)
                          const isEditing = editingUserId === user.userId
                          const patient = patients.find(p => p.userId === user.userId)
                          const staffMember = staff.find(s => s.userId === user.userId)
                          
                          return (
                            <React.Fragment key={user.userId}>
                              <tr 
                                className={`user-row ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => toggleUserExpand(user.userId)}
                                style={{ cursor: 'pointer' }}
                              >
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
                                <td onClick={(e) => e.stopPropagation()}>
                                  <div className="action-buttons-small">
                                    <button
                                      onClick={(e) => handleEditClick(e, user)}
                                      className="btn btn-edit btn-sm"
                                      title="Edit User"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteClick(user.userId, user.email, user.authUuid)
                                      }}
                                      className="btn btn-delete btn-sm"
                                      title="Delete User"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="user-expanded-row">
                                  <td colSpan="6" className="user-expanded-content">
                                    {isEditing ? (
                                      <div className="user-edit-form">
                                        <h3>Edit User Details</h3>
                                        
                                        {/* Basic Information Section */}
                                        <div className="form-section">
                                          <h4>Basic Information</h4>
                                          <div className="form-row">
                                            <div className="form-group">
                                              <label>First Name</label>
                                              <input
                                                type="text"
                                                value={editingUserData?.fname || ''}
                                                onChange={(e) => setEditingUserData({ ...editingUserData, fname: e.target.value })}
                                                className="form-input"
                                              />
                                            </div>
                                            <div className="form-group">
                                              <label>Last Name</label>
                                              <input
                                                type="text"
                                                value={editingUserData?.lname || ''}
                                                onChange={(e) => setEditingUserData({ ...editingUserData, lname: e.target.value })}
                                                className="form-input"
                                              />
                                            </div>
                                          </div>
                                          <div className="form-group">
                                            <label>Email</label>
                                            <input
                                              type="email"
                                              value={editingUserData?.email || ''}
                                              onChange={(e) => setEditingUserData({ ...editingUserData, email: e.target.value })}
                                              className="form-input"
                                            />
                                          </div>
                                          {user.role === 'PATIENT' && patient && (
                                            <div className="form-row">
                                              <div className="form-group">
                                                <label>Patient IC</label>
                                                <input
                                                  type="text"
                                                  value={editingUserData?.patientData?.patientIc || patient.patientIc || ''}
                                                  onChange={(e) => setEditingUserData({ 
                                                    ...editingUserData, 
                                                    patientData: { ...editingUserData?.patientData, patientIc: e.target.value }
                                                  })}
                                                  className="form-input"
                                                />
                                              </div>
                                              <div className="form-group">
                                                <label>Date of Birth</label>
                                                <input
                                                  type="date"
                                                  value={editingUserData?.patientData?.dateOfBirth || (patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '') || ''}
                                                  onChange={(e) => setEditingUserData({ 
                                                    ...editingUserData, 
                                                    patientData: { ...editingUserData?.patientData, dateOfBirth: e.target.value }
                                                  })}
                                                  className="form-input"
                                                />
                                              </div>
                                              <div className="form-group">
                                                <label>Gender</label>
                                                <select
                                                  value={editingUserData?.patientData?.gender || patient.gender || 'Male'}
                                                  onChange={(e) => setEditingUserData({ 
                                                    ...editingUserData, 
                                                    patientData: { ...editingUserData?.patientData, gender: e.target.value }
                                                  })}
                                                  className="form-input"
                                                >
                                                  <option value="Male">Male</option>
                                                  <option value="Female">Female</option>
                                                  <option value="Other">Other</option>
                                                </select>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {user.role === 'PATIENT' && patient && (
                                          <>

                                            {/* Emergency Contact Section */}
                                            <div className="form-section">
                                              <h4>Emergency Contact</h4>
                                              <div className="form-row">
                                                <div className="form-group">
                                                  <label>Emergency Contact Name</label>
                                                  <input
                                                    type="text"
                                                    value={editingUserData?.patientData?.emergencyContact || patient.emergencyContact || ''}
                                                    onChange={(e) => setEditingUserData({ 
                                                      ...editingUserData, 
                                                      patientData: { ...editingUserData?.patientData, emergencyContact: e.target.value }
                                                    })}
                                                    className="form-input"
                                                    placeholder="Contact name"
                                                  />
                                                </div>
                                                <div className="form-group">
                                                  <label>Emergency Contact Phone</label>
                                                  <input
                                                    type="tel"
                                                    value={editingUserData?.patientData?.emergencyContactPhone || patient.emergencyContactPhone || ''}
                                                    onChange={(e) => setEditingUserData({ 
                                                      ...editingUserData, 
                                                      patientData: { ...editingUserData?.patientData, emergencyContactPhone: e.target.value }
                                                    })}
                                                    className="form-input"
                                                    placeholder="Phone number"
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            {/* Medical Information Section */}
                                            <div className="form-section">
                                              <h4>Medical Information</h4>
                                              <div className="form-group">
                                                <label>Blood Type</label>
                                                <select
                                                  value={editingUserData?.patientData?.bloodType || patient.bloodType || ''}
                                                  onChange={(e) => setEditingUserData({ 
                                                    ...editingUserData, 
                                                    patientData: { ...editingUserData?.patientData, bloodType: e.target.value }
                                                  })}
                                                  className="form-input form-select-styled"
                                                >
                                                  <option value="">Select Blood Type</option>
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
                                              <div className="form-group">
                                                <label>Allergies</label>
                                                <textarea
                                                  value={editingUserData?.patientData?.allergies || patient.allergies || ''}
                                                  onChange={(e) => setEditingUserData({ 
                                                    ...editingUserData, 
                                                    patientData: { ...editingUserData?.patientData, allergies: e.target.value }
                                                  })}
                                                  className="form-input form-textarea"
                                                  placeholder="List any allergies..."
                                                  rows="3"
                                                />
                                              </div>
                                              <div className="form-group">
                                                <label>Medical History</label>
                                                <textarea
                                                  value={editingUserData?.patientData?.medicalHistory || patient.medicalHistory || ''}
                                                  onChange={(e) => setEditingUserData({ 
                                                    ...editingUserData, 
                                                    patientData: { ...editingUserData?.patientData, medicalHistory: e.target.value }
                                                  })}
                                                  className="form-input form-textarea"
                                                  placeholder="Enter medical history..."
                                                  rows="4"
                                                />
                                              </div>
                                            </div>
                                          </>
                                        )}
                                        
                                        {user.role === 'STAFF' && staffMember && (
                                          <div className="form-section">
                                            <h4>Staff Information</h4>
                                            <div className="form-group">
                                              <label>Assigned Clinic</label>
                                              <select
                                                value={editingUserData?.staffData?.clinicId || staffMember.clinicId || ''}
                                                onChange={(e) => setEditingUserData({ 
                                                  ...editingUserData, 
                                                  staffData: { ...editingUserData?.staffData, clinicId: parseInt(e.target.value) }
                                                })}
                                                className="form-input"
                                              >
                                                {clinics.map(clinic => (
                                                  <option key={clinic.id} value={clinic.id}>
                                                    {clinic.name}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                          </div>
                                        )}
                                        
                                        <div className="form-actions">
                                          <button onClick={handleResetPassword.bind(null, user.email)} className="btn btn-secondary">
                                            Reset Password
                                          </button>
                                          <button onClick={handleSaveEdit} className="btn btn-primary">
                                            Save Changes
                                          </button>
                                          <button onClick={handleCancelEdit} className="btn btn-secondary">
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="user-details-view">
                                        <div className="user-details-section">
                                          <h3>Account Information</h3>
                                          <div className="detail-grid">
                                            <div className="detail-item">
                                              <span className="detail-label">Email:</span>
                                              <span className="detail-value">{user.email}</span>
                                            </div>
                                            <div className="detail-item">
                                              <span className="detail-label">Password:</span>
                                              <span className="detail-value">••••••••</span>
                                            </div>
                                            <div className="detail-item">
                                              <span className="detail-label">User ID:</span>
                                              <span className="detail-value">{user.userId}</span>
                                            </div>
                                            <div className="detail-item">
                                              <span className="detail-label">Created:</span>
                                              <span className="detail-value">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        {user.role === 'PATIENT' && patient && (
                                          <div className="user-details-section">
                                            <h3>Patient Details</h3>
                                            <div className="detail-grid">
                                              <div className="detail-item">
                                                <span className="detail-label">Patient IC:</span>
                                                <span className="detail-value">{patient.patientIc || 'N/A'}</span>
                                              </div>
                                              <div className="detail-item">
                                                <span className="detail-label">Date of Birth:</span>
                                                <span className="detail-value">
                                                  {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}
                                                </span>
                                              </div>
                                              <div className="detail-item">
                                                <span className="detail-label">Gender:</span>
                                                <span className="detail-value">{patient.gender || 'N/A'}</span>
                                              </div>
                                              <div className="detail-item">
                                                <span className="detail-label">Blood Type:</span>
                                                <span className="detail-value">{patient.bloodType || 'N/A'}</span>
                                              </div>
                                              <div className="detail-item">
                                                <span className="detail-label">Emergency Contact:</span>
                                                <span className="detail-value">{patient.emergencyContact || 'N/A'}</span>
                                              </div>
                                              <div className="detail-item">
                                                <span className="detail-label">Emergency Phone:</span>
                                                <span className="detail-value">{patient.emergencyContactPhone || 'N/A'}</span>
                                              </div>
                                              {patient.medicalHistory && (
                                                <div className="detail-item full-width">
                                                  <span className="detail-label">Medical History:</span>
                                                  <span className="detail-value">{patient.medicalHistory}</span>
                                                </div>
                                              )}
                                              {patient.allergies && (
                                                <div className="detail-item full-width">
                                                  <span className="detail-label">Allergies:</span>
                                                  <span className="detail-value">{patient.allergies}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {user.role === 'STAFF' && staffMember && (
                                          <div className="user-details-section">
                                            <h3>Staff Details</h3>
                                            <div className="detail-grid">
                                              <div className="detail-item">
                                                <span className="detail-label">Assigned Clinic:</span>
                                                <span className="detail-value">
                                                  {staffMember.clinicName || (staffMember.clinicId ? `Clinic ID: ${staffMember.clinicId}` : 'N/A')}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {user.role === 'ADMIN' && (
                                          <div className="user-details-section">
                                            <h3>Admin Account</h3>
                                            <p>This is an administrator account with full system access.</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && userToDelete && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                  <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>Confirm Deletion</h2>
                      <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
                    </div>
                    <div className="modal-body">
                      <p className="confirm-message">
                        Are you sure you want to delete user <strong>{userToDelete.email}</strong>?
                      </p>
                      <p className="confirm-warning">
                        This action cannot be undone. The user will be permanently removed from the system.
                      </p>
                      <div className="modal-actions">
                        <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">
                          Cancel
                        </button>
                        <button onClick={deleteUser} className="btn btn-danger">
                          Delete User
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                        className="search-input clinic-search-input"
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
                      <div className="clinics-cards-container">
                        {paginatedClinics.map((clinic) => {
                          const isExpanded = expandedClinics.has(clinic.id)
                          const clinicDoctorsList = clinicDoctorsMap[clinic.id] || []
                          const operatingHours = formatOperatingHours(clinic)
                          const isEditingHours = editingOperatingHours === clinic.id

                          return (
                            <div key={clinic.id} className={`clinic-card ${isExpanded ? 'expanded' : ''}`}>
                              <div 
                                className="clinic-card-header"
                                onClick={() => toggleClinicExpansion(clinic.id)}
                              >
                                <div className="clinic-card-main-info">
                                  <div className="clinic-card-id">#{clinic.id}</div>
                                  <div className="clinic-card-name">{clinic.name || 'N/A'}</div>
                                  <div className="clinic-card-location">
                                    {clinic.address || 'N/A'} • {clinic.region || 'N/A'} • {clinic.area || 'N/A'}
                                  </div>
                                </div>
                                <div className="clinic-card-expand-icon">
                                  {isExpanded ? '▼' : '▶'}
                                </div>
                              </div>
                              
                              {isExpanded && (
                                <div className="clinic-card-expanded-content">
                                  {/* Doctors Section */}
                                  <div className="clinic-detail-section">
                                    <div className="clinic-detail-header">
                                      <h3>Doctors ({clinicDoctorsList.length})</h3>
                                      {editingClinicDoctors === clinic.id ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingClinicDoctors(null)
                                            setEditingDoctorInClinic(null)
                                            setAssigningDoctor(null)
                                            setEditingDoctorShifts([])
                                            setAssigningDoctorShifts([])
                                          }}
                                          className="btn btn-secondary btn-sm"
                                        >
                                          ✕ Cancel
                                        </button>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingClinicDoctors(clinic.id)
                                            // Fetch unassigned doctors
                                            fetchDoctors()
                                          }}
                                          className="btn btn-secondary btn-sm"
                                        >
                                          ✏️ Edit
                                        </button>
                                      )}
                                    </div>
                                    {editingClinicDoctors === clinic.id ? (
                                      <div className="clinic-doctors-edit">
                                        {/* Assigned Doctors */}
                                        <div className="assigned-doctors-section">
                                          <h4>Assigned Doctors</h4>
                                          {clinicDoctorsList.length === 0 ? (
                                            <p className="clinic-detail-empty">No doctors assigned</p>
                                          ) : (
                                            <div className="clinic-doctors-list">
                                              {clinicDoctorsList.map((doctor) => {
                                                const doctorShiftDays = Array.isArray(doctor.shiftDays) ? doctor.shiftDays : (doctor.shiftDays ? [doctor.shiftDays] : [])
                                                const isEditingShifts = editingDoctorInClinic === doctor.id
                                                
                                                return (
                                                  <div key={doctor.id} className="clinic-doctor-item-edit">
                                                    <div className="doctor-item-header">
                                                      <span className="doctor-name">Dr. {doctor.fname} {doctor.lname}</span>
                                                      {!isEditingShifts ? (
                                                        <>
                                                          {doctorShiftDays.length > 0 && (
                                                            <div className="shift-days-display">
                                                              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                                                <span
                                                                  key={day}
                                                                  className={`shift-day-badge ${doctorShiftDays.includes(day) ? 'active' : 'inactive'}`}
                                                                  title={getDayFullName(day)}
                                                                >
                                                                  {getDayLabel(day)}
                                                                </span>
                                                              ))}
                                                            </div>
                                                          )}
                                                          <div className="doctor-item-actions">
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleEditDoctorShiftsInClinic(doctor, clinic.id)
                                                              }}
                                                              className="btn btn-secondary btn-sm"
                                                              disabled={loading}
                                                            >
                                                              Edit Shifts
                                                            </button>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                openUnassignConfirm(doctor, clinic.id)
                                                              }}
                                                              className="btn btn-danger btn-sm"
                                                              disabled={loading}
                                                            >
                                                              Unassign
                                                            </button>
                                                          </div>
                                                        </>
                                                      ) : (
                                                        <div className="doctor-shifts-edit-container">
                                                          <div className="shift-days-selector">
                                                            {[1, 2, 3, 4, 5, 6, 7].map(day => {
                                                              const isSelected = editingDoctorShifts.includes(day)
                                                              // Check if this day is already taken by another doctor in the same clinic
                                                              const isFilled = clinicDoctorsList.some(d => {
                                                                if (d.id === doctor.id) return false
                                                                const dShiftDays = Array.isArray(d.shiftDays) ? d.shiftDays : (d.shiftDays ? [d.shiftDays] : [])
                                                                return dShiftDays.includes(day)
                                                              })
                                                              return (
                                                                <button
                                                                  key={day}
                                                                  type="button"
                                                                  className={`shift-day-button ${isSelected ? 'selected' : ''} ${isFilled ? 'filled' : ''}`}
                                                                  onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    if (!isFilled) {
                                                                      toggleDayForDoctorInClinic(day, false)
                                                                    }
                                                                  }}
                                                                  disabled={isFilled}
                                                                  title={isFilled ? `${getDayFullName(day)} is already assigned to another doctor` : getDayFullName(day)}
                                                                >
                                                                  <span className="day-label">{getDayLabel(day)}</span>
                                                                  <span className="day-full">{getDayFullName(day)}</span>
                                                                </button>
                                                              )
                                                            })}
                                                          </div>
                                                          <div className="doctor-shift-actions">
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleSaveDoctorShiftsInClinic(doctor.id, clinic.id)
                                                              }}
                                                              className="btn btn-success btn-sm"
                                                              disabled={loading}
                                                            >
                                                              ✓ Save
                                                            </button>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                setEditingDoctorInClinic(null)
                                                                setEditingDoctorShifts([])
                                                              }}
                                                              className="btn btn-secondary btn-sm"
                                                              disabled={loading}
                                                            >
                                                              ✕ Cancel
                                                            </button>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>

                                        {/* Unassigned Doctors */}
                                        <div className="unassigned-doctors-section">
                                          <h4>Assign Doctor</h4>
                                          {doctors.filter(d => !d.assignedClinic).length === 0 ? (
                                            <p className="clinic-detail-empty">No unassigned doctors available</p>
                                          ) : (
                                            <div className="clinic-doctors-list">
                                              {doctors
                                                .filter(d => !d.assignedClinic)
                                                .map((doctor) => {
                                                  const isAssigning = assigningDoctor === doctor.id
                                                  
                                                  return (
                                                    <div key={doctor.id} className="clinic-doctor-item-edit">
                                                      <div className="doctor-item-header">
                                                        <span className="doctor-name">Dr. {doctor.fname} {doctor.lname}</span>
                                                        {!isAssigning ? (
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation()
                                                              setAssigningDoctor(doctor.id)
                                                              setAssigningDoctorShifts([])
                                                            }}
                                                            className="btn btn-success btn-sm"
                                                            disabled={loading}
                                                          >
                                                            Assign
                                                          </button>
                                                        ) : (
                                                          <div className="doctor-shifts-edit-container">
                                                            <div className="shift-days-selector">
                                                              {[1, 2, 3, 4, 5, 6, 7].map(day => {
                                                                const isSelected = assigningDoctorShifts.includes(day)
                                                                // Check if this day is already taken by another doctor in the same clinic
                                                                const isFilled = clinicDoctorsList.some(d => {
                                                                  const dShiftDays = Array.isArray(d.shiftDays) ? d.shiftDays : (d.shiftDays ? [d.shiftDays] : [])
                                                                  return dShiftDays.includes(day)
                                                                })
                                                                return (
                                                                  <button
                                                                    key={day}
                                                                    type="button"
                                                                    className={`shift-day-button ${isSelected ? 'selected' : ''} ${isFilled ? 'filled' : ''}`}
                                                                    onClick={(e) => {
                                                                      e.stopPropagation()
                                                                      if (!isFilled) {
                                                                        toggleDayForDoctorInClinic(day, true)
                                                                      }
                                                                    }}
                                                                    disabled={isFilled}
                                                                    title={isFilled ? `${getDayFullName(day)} is already assigned to another doctor` : getDayFullName(day)}
                                                                  >
                                                                    <span className="day-label">{getDayLabel(day)}</span>
                                                                    <span className="day-full">{getDayFullName(day)}</span>
                                                                  </button>
                                                                )
                                                              })}
                                                            </div>
                                                            <div className="doctor-shift-actions">
                                                              <button
                                                                onClick={(e) => {
                                                                  e.stopPropagation()
                                                                  handleAssignDoctorToClinic(doctor.id, clinic.id)
                                                                }}
                                                                className="btn btn-success btn-sm"
                                                                disabled={loading}
                                                              >
                                                                ✓ Assign
                                                              </button>
                                                              <button
                                                                onClick={(e) => {
                                                                  e.stopPropagation()
                                                                  setAssigningDoctor(null)
                                                                  setAssigningDoctorShifts([])
                                                                }}
                                                                className="btn btn-secondary btn-sm"
                                                                disabled={loading}
                                                              >
                                                                ✕ Cancel
                                                              </button>
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  )
                                                })}
                                            </div>
                                          )}
                                        </div>

                                        <div className="clinic-doctors-edit-actions">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setEditingClinicDoctors(null)
                                              setEditingDoctorInClinic(null)
                                              setAssigningDoctor(null)
                                              setEditingDoctorShifts([])
                                              setAssigningDoctorShifts([])
                                            }}
                                            className="btn btn-secondary"
                                          >
                                            Done
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        {clinicDoctorsList.length === 0 ? (
                                          <p className="clinic-detail-empty">No doctors assigned</p>
                                        ) : (
                                          <div className="clinic-doctors-list">
                                            {clinicDoctorsList.map((doctor) => {
                                              const doctorShiftDays = Array.isArray(doctor.shiftDays) ? doctor.shiftDays : (doctor.shiftDays ? [doctor.shiftDays] : [])
                                              return (
                                                <div key={doctor.id} className="clinic-doctor-item">
                                                  <span className="doctor-name">Dr. {doctor.fname} {doctor.lname}</span>
                                                  {doctorShiftDays.length > 0 && (
                                                    <div className="shift-days-display">
                                                      {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                                        <span
                                                          key={day}
                                                          className={`shift-day-badge ${doctorShiftDays.includes(day) ? 'active' : 'inactive'}`}
                                                          title={getDayFullName(day)}
                                                        >
                                                          {getDayLabel(day)}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  {/* Operating Hours Section */}
                                  <div className="clinic-detail-section">
                                    <div className="clinic-detail-header">
                                      <h3>Operating Hours</h3>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEditOperatingHours(clinic)
                                        }}
                                        className="btn btn-secondary btn-sm"
                                        disabled={isEditingHours}
                                      >
                                        ✏️ Edit
                                      </button>
                                    </div>
                                    {isEditingHours ? (
                                      <div className="operating-hours-edit-form">
                                        <div className="hours-form-row">
                                          <div className="hours-form-group">
                                            <label>Mon-Fri AM Start</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.monFriAmStart || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, monFriAmStart: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                          <div className="hours-form-group">
                                            <label>Mon-Fri AM End</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.monFriAmEnd || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, monFriAmEnd: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                        </div>
                                        <div className="hours-form-row">
                                          <div className="hours-form-group">
                                            <label>Mon-Fri PM Start</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.monFriPmStart || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, monFriPmStart: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                          <div className="hours-form-group">
                                            <label>Mon-Fri PM End</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.monFriPmEnd || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, monFriPmEnd: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                        </div>
                                        <div className="hours-form-row">
                                          <div className="hours-form-group">
                                            <label>Saturday Start</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.satAmStart || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, satAmStart: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                          <div className="hours-form-group">
                                            <label>Saturday End</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.satAmEnd || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, satAmEnd: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                        </div>
                                        <div className="hours-form-row">
                                          <div className="hours-form-group">
                                            <label>Sunday Start</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.sunAmStart || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, sunAmStart: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                          <div className="hours-form-group">
                                            <label>Sunday End</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.sunAmEnd || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, sunAmEnd: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                        </div>
                                        <div className="hours-form-row">
                                          <div className="hours-form-group">
                                            <label>Public Holiday Start</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.phAmStart || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, phAmStart: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                          <div className="hours-form-group">
                                            <label>Public Holiday End</label>
                                            <input
                                              type="time"
                                              value={operatingHoursForm.phAmEnd || ''}
                                              onChange={(e) => setOperatingHoursForm({ ...operatingHoursForm, phAmEnd: e.target.value })}
                                              className="time-input"
                                            />
                                          </div>
                                        </div>
                                        <div className="hours-form-actions">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSaveOperatingHours(clinic.id)
                                            }}
                                            className="btn btn-success btn-sm"
                                            disabled={loading}
                                          >
                                            ✓ Save
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setEditingOperatingHours(null)
                                              setOperatingHoursForm({})
                                            }}
                                            className="btn btn-secondary btn-sm"
                                            disabled={loading}
                                          >
                                            ✕ Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      operatingHours && operatingHours.length > 0 ? (
                                        <div className="operating-hours-display">
                                          {operatingHours.map((schedule, idx) => (
                                            <div key={idx} className="hours-item">
                                              <span className="hours-day">{schedule.day}:</span>
                                              <span className="hours-time">{schedule.times}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="clinic-detail-empty">No operating hours set</p>
                                      )
                                    )}
                                  </div>

                                  {/* Appointment Interval Section */}
                                  <div className="clinic-detail-section">
                                    <div className="clinic-detail-header">
                                      <h3>Appointment Interval</h3>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingClinicId(clinic.id)
                                          setEditingInterval(clinic.apptIntervalMin?.toString() || '15')
                                        }}
                                        className="btn btn-secondary btn-sm"
                                        disabled={editingClinicId === clinic.id}
                                      >
                                        ✏️ Edit
                                      </button>
                                    </div>
                                    {editingClinicId === clinic.id ? (
                                      <div className="interval-edit-form">
                                        <input
                                          type="number"
                                          min="1"
                                          value={editingInterval}
                                          onChange={(e) => setEditingInterval(e.target.value)}
                                          className="interval-input"
                                          placeholder={clinic.apptIntervalMin || '15'}
                                        />
                                        <span className="interval-unit">minutes</span>
                                        <div className="interval-actions">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleUpdateClinicInterval(clinic.id)
                                            }}
                                            className="btn btn-success btn-sm"
                                            disabled={loading}
                                          >
                                            ✓ Save
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setEditingClinicId(null)
                                              setEditingInterval('')
                                            }}
                                            className="btn btn-secondary btn-sm"
                                            disabled={loading}
                                          >
                                            ✕ Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="clinic-detail-value">{clinic.apptIntervalMin || 15} minutes</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
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

          {currentView === 'doctors' && (() => {
            // Filter doctors by name search
            const filteredDoctors = getFilteredDoctors()
            // Get unassigned doctors (not filtered by name search, but filtered by clinic filter)
            const unassignedDoctors = doctors.filter(d => !d.assignedClinic)
            // Calculate pagination
            const totalPages = Math.ceil(filteredDoctors.length / doctorsPerPage)
            const startIndex = (doctorPage - 1) * doctorsPerPage
            const endIndex = startIndex + doctorsPerPage
            const paginatedDoctors = filteredDoctors.slice(startIndex, endIndex)

            return (
            <>
              <div className="page-header">
                <h1>Doctors</h1>
                <div className="header-controls">
                  <div className="doctor-search-wrapper">
                    <label htmlFor="doctor-name-search">Search by Name</label>
                    <div className="searchable-dropdown">
                      <input
                        id="doctor-name-search"
                        type="text"
                        placeholder="Search doctors by name..."
                        value={doctorNameSearch}
                        onChange={(e) => {
                          setDoctorNameSearch(e.target.value)
                          setShowDoctorSearchDropdown(true)
                          setDoctorPage(1)
                        }}
                        onFocus={() => setShowDoctorSearchDropdown(true)}
                        onClick={(e) => e.stopPropagation()}
                        className="input-sm doctor-search-input"
                      />
                      {showDoctorSearchDropdown && doctorNameSearch && (
                        <div className="dropdown-menu doctor-search-dropdown" onClick={(e) => e.stopPropagation()}>
                          {getFilteredDoctorsForSearch().map((doctor) => (
                            <div
                              key={doctor.id}
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDoctorNameSearch(`Dr. ${doctor.fname} ${doctor.lname}`)
                                setShowDoctorSearchDropdown(false)
                                setDoctorPage(1)
                              }}
                            >
                              <span className="doctor-suggestion-name">Dr. {doctor.fname} {doctor.lname}</span>
                              {doctor.assignedClinic && (
                                <span className="doctor-suggestion-clinic">
                                  {clinics.find(c => c.id === doctor.assignedClinic)?.name || `Clinic ${doctor.assignedClinic}`}
                                </span>
                              )}
                            </div>
                          ))}
                          {getFilteredDoctorsForSearch().length === 0 && (
                            <div className="dropdown-item" style={{ color: '#999', cursor: 'default' }}>
                              No doctors found
                            </div>
                          )}
                        </div>
                      )}
                      {doctorNameSearch && (
                        <button
                          className="clear-filter-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDoctorNameSearch('')
                            setShowDoctorSearchDropdown(false)
                            setDoctorPage(1)
                          }}
                          type="button"
                          aria-label="Clear doctor search"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="clinic-filter-wrapper">
                    <label htmlFor="clinic-filter">Filter by Clinic</label>
                    <div className="searchable-dropdown">
                      <input
                        id="clinic-filter"
                        type="text"
                        placeholder="Search clinics"
                        value={clinicFilterSearch}
                        onChange={(e) => {
                          setClinicFilterSearch(e.target.value)
                          setShowClinicFilterDropdown(true)
                          // Clear filter if search is empty
                          if (!e.target.value) {
                            setSelectedClinicFilter(null)
                          }
                        }}
                        onFocus={() => setShowClinicFilterDropdown(true)}
                        onClick={(e) => e.stopPropagation()}
                        className="input-sm"
                      />
                      {showClinicFilterDropdown && (
                        <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                          {!clinicFilterSearch && (
                            <div
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedClinicFilter(null)
                                setClinicFilterSearch('')
                                setShowClinicFilterDropdown(false)
                                setDoctorPage(1)
                              }}
                            >
                              All Clinics
                            </div>
                          )}
                          {getFilteredClinicsForFilter().map((clinic) => (
                            <div
                              key={clinic.id}
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedClinicFilter(clinic.id)
                                setClinicFilterSearch(clinic.name)
                                setShowClinicFilterDropdown(false)
                                setDoctorPage(1)
                              }}
                            >
                              {clinic.name}
                            </div>
                          ))}
                          {clinicFilterSearch && getFilteredClinicsForFilter().length === 0 && (
                            <div className="dropdown-item" style={{ color: '#999', cursor: 'default' }}>
                              No clinics found
                            </div>
                          )}
                        </div>
                      )}
                      {selectedClinicFilter && (
                        <button
                          className="clear-filter-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedClinicFilter(null)
                            setClinicFilterSearch('')
                            setShowClinicFilterDropdown(false)
                            setDoctorPage(1)
                          }}
                          type="button"
                          aria-label="Clear clinic filter"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={() => {
                    // Recalculate filled days when opening add modal
                    const filled = new Set()
                    doctors.forEach(doctor => {
                      if (doctor.shiftDays && doctor.shiftDays.length > 0) {
                        // Only count filled days for doctors in the same clinic
                        if (!selectedClinicFilter || doctor.assignedClinic === selectedClinicFilter) {
                          const days = Array.isArray(doctor.shiftDays) ? doctor.shiftDays : (doctor.shiftDays ? [doctor.shiftDays] : [])
                          days.forEach(day => filled.add(day))
                        }
                      }
                    })
                    setFilledDays(filled)
                    setNewDoctor({ fname: '', lname: '', assignedClinic: selectedClinicFilter || null, shiftDays: [] })
                    setShowAddDoctorModal(true)
                  }} className="btn btn-primary">
                    + Add Doctor
                  </button>
                </div>
              </div>

              {/* Unassigned Doctors Section */}
              {unassignedDoctors.length > 0 && !selectedClinicFilter && (
                <div className="section-card unassigned-doctors-section">
                  <div className="section-header">
                    <h2>Unassigned Doctors ({unassignedDoctors.length})</h2>
                  </div>
                  <div className="doctors-grid compact-grid">
                    {unassignedDoctors.slice(0, 6).map((doctor) => (
                      <div key={doctor.id} className="doctor-card unassigned-doctor-card">
                        <div className="doctor-header">
                          <h3>Dr. {doctor.fname} {doctor.lname}</h3>
                          <span className="doctor-id">ID: {doctor.id}</span>
                        </div>
                        <div className="doctor-details">
                          <div className="detail-item">
                            <span className="detail-label">Clinic:</span>
                            <span className="detail-value">Unassigned</span>
                          </div>
                        </div>
                        <div className="doctor-actions">
                          <button
                            onClick={() => {
                              setEditingDoctor({ ...doctor, shiftDays: Array.isArray(doctor.shiftDays) ? doctor.shiftDays : (doctor.shiftDays ? [doctor.shiftDays] : []) })
                              // Calculate filled days for all clinics (since doctor is unassigned)
                              const filled = new Set()
                              doctors.forEach(d => {
                                if (d.shiftDays && d.shiftDays.length > 0 && d.assignedClinic) {
                                  const days = Array.isArray(d.shiftDays) ? d.shiftDays : (d.shiftDays ? [d.shiftDays] : [])
                                  days.forEach(day => filled.add(day))
                                }
                              })
                              setFilledDays(filled)
                              setShowEditDoctorModal(true)
                            }}
                            className="btn btn-primary btn-sm"
                            disabled={loading}
                          >
                            Assign to Clinic
                          </button>
                        </div>
                      </div>
                    ))}
                    {unassignedDoctors.length > 6 && (
                      <div className="view-more-hint">
                        <p>+ {unassignedDoctors.length - 6} more unassigned doctor{unassignedDoctors.length - 6 !== 1 ? 's' : ''}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="section-card">
                <div className="section-header">
                  <h2>
                    {selectedClinicFilter 
                      ? `Doctors at ${clinics.find(c => c.id === selectedClinicFilter)?.name || 'Selected Clinic'}${doctorNameSearch ? ` - "${doctorNameSearch}"` : ''} (${filteredDoctors.length})`
                      : `All Doctors${doctorNameSearch ? ` - "${doctorNameSearch}"` : ''} (${filteredDoctors.length})`}
                  </h2>
                </div>
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="empty-state">
                    <p>
                      {doctorNameSearch 
                        ? `No doctors found matching "${doctorNameSearch}"`
                        : selectedClinicFilter 
                          ? 'No doctors found for the selected clinic'
                          : 'No doctors found'}
                    </p>
                    <button onClick={() => {
                      setFilledDays(new Set())
                      setNewDoctor({ fname: '', lname: '', assignedClinic: selectedClinicFilter || null, shiftDays: [] })
                      setShowAddDoctorModal(true)
                    }} className="btn btn-primary">
                      Add First Doctor
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="doctors-grid">
                      {paginatedDoctors.map((doctor) => {
                        const doctorShiftDays = Array.isArray(doctor.shiftDays) ? doctor.shiftDays : (doctor.shiftDays ? [doctor.shiftDays] : [])
                        return (
                          <div key={doctor.id} className="doctor-card">
                            <div className="doctor-header">
                              <h3>Dr. {doctor.fname} {doctor.lname}</h3>
                              <span className="doctor-id">ID: {doctor.id}</span>
                            </div>
                            <div className="doctor-details">
                              <div className="detail-item">
                                <span className="detail-label">Clinic:</span>
                                <span className="detail-value">
                                  {doctor.assignedClinic 
                                    ? clinics.find(c => c.id === doctor.assignedClinic)?.name || `Clinic ID: ${doctor.assignedClinic}`
                                    : 'Unassigned'}
                                </span>
                              </div>
                              {doctorShiftDays.length > 0 ? (
                                <div className="doctor-shifts">
                                  <span className="detail-label">Shift Days:</span>
                                  <div className="shift-days-display">
                                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                      <span
                                        key={day}
                                        className={`shift-day-badge ${doctorShiftDays.includes(day) ? 'active' : 'inactive'}`}
                                        title={getDayFullName(day)}
                                      >
                                        {getDayLabel(day)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="no-shifts">No shift days assigned</p>
                              )}
                            </div>
                            <div className="doctor-actions">
                              <button
                                onClick={() => handleEditDoctor(doctor)}
                                className="btn btn-secondary btn-sm"
                                disabled={loading}
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {totalPages > 1 && (
                      <div className="pagination-controls">
                        <button
                          onClick={() => setDoctorPage(prev => Math.max(1, prev - 1))}
                          disabled={doctorPage === 1}
                          className="btn btn-secondary btn-sm"
                        >
                          ← Previous
                        </button>
                        <span className="pagination-info">
                          Page {doctorPage} of {totalPages} 
                          ({startIndex + 1}-{Math.min(endIndex, doctors.length)} of {doctors.length})
                        </span>
                        <button
                          onClick={() => setDoctorPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={doctorPage === totalPages}
                          className="btn btn-secondary btn-sm"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Edit Doctor Modal */}
              {showEditDoctorModal && editingDoctor && (
                <div className="modal-overlay" onClick={() => {
                  setShowEditDoctorModal(false)
                  setEditingDoctor(null)
                }}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>Edit Doctor</h2>
                      <button className="modal-close" onClick={() => {
                        setShowEditDoctorModal(false)
                        setEditingDoctor(null)
                      }}>×</button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          value={editingDoctor.fname}
                          onChange={(e) => setEditingDoctor({ ...editingDoctor, fname: e.target.value })}
                          className="input-sm"
                          placeholder="Enter first name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          value={editingDoctor.lname}
                          onChange={(e) => setEditingDoctor({ ...editingDoctor, lname: e.target.value })}
                          className="input-sm"
                          placeholder="Enter last name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Clinic *</label>
                        <select
                          value={editingDoctor.assignedClinic || ''}
                          onChange={(e) => {
                            const newClinicId = e.target.value ? parseInt(e.target.value) : null
                            setEditingDoctor({ ...editingDoctor, assignedClinic: newClinicId })
                            // Recalculate filled days for the selected clinic
                            if (newClinicId) {
                              const filled = new Set()
                              doctors.forEach(d => {
                                if (d.shiftDays && d.id !== editingDoctor.id && d.assignedClinic === newClinicId) {
                                  const days = Array.isArray(d.shiftDays) ? d.shiftDays : (d.shiftDays ? [d.shiftDays] : [])
                                  days.forEach(day => filled.add(day))
                                }
                              })
                              setFilledDays(filled)
                            } else {
                              setFilledDays(new Set())
                            }
                          }}
                          className="input-sm"
                        >
                          <option value="">Unassigned</option>
                          {clinics.map(clinic => (
                            <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Shift Days</label>
                        <p className="form-hint">Select the days this doctor will work. Greyed out days are already assigned to other doctors in the same clinic. Leave empty if no shifts assigned.</p>
                        <div className="shift-days-selector">
                          {[1, 2, 3, 4, 5, 6, 7].map(day => {
                            const isFilled = filledDays.has(day)
                            const shiftDaysArray = Array.isArray(editingDoctor.shiftDays) ? editingDoctor.shiftDays : (editingDoctor.shiftDays ? [editingDoctor.shiftDays] : [])
                            const isSelected = shiftDaysArray.includes(day)
                            return (
                              <button
                                key={day}
                                type="button"
                                className={`shift-day-button ${isSelected ? 'selected' : ''} ${isFilled ? 'filled' : ''}`}
                                onClick={() => handleDayToggle(day, true)}
                                disabled={isFilled}
                                title={isFilled ? `${getDayFullName(day)} is already assigned` : `${getDayFullName(day)} - Click to toggle`}
                              >
                                <span className="day-label">{getDayLabel(day)}</span>
                                <span className="day-full">{getDayFullName(day)}</span>
                              </button>
                            )
                          })}
                        </div>
                        {editingDoctor.shiftDays && editingDoctor.shiftDays.length > 0 && (
                          <div className="selected-days-info">
                            <p>Selected: {Array.isArray(editingDoctor.shiftDays) ? editingDoctor.shiftDays.map(d => getDayFullName(d)).join(', ') : getDayFullName(editingDoctor.shiftDays)}</p>
                          </div>
                        )}
                      </div>
                      <div className="modal-actions">
                        {editingDoctor.assignedClinic && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditDoctorUnassignConfirm(true)
                            }}
                            className="btn btn-danger"
                            disabled={loading}
                          >
                            Unassign from Clinic
                          </button>
                        )}
                        <button
                          onClick={updateDoctor}
                          className="btn btn-primary"
                          disabled={loading || !editingDoctor.fname || !editingDoctor.lname}
                        >
                          {loading ? 'Updating...' : 'Update Doctor'}
                        </button>
                        <button
                          onClick={() => {
                            setShowEditDoctorModal(false)
                            setEditingDoctor(null)
                          }}
                          className="btn btn-secondary"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Doctor Modal */}
              {showAddDoctorModal && (
                <div className="modal-overlay" onClick={() => setShowAddDoctorModal(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>Add New Doctor</h2>
                      <button className="modal-close" onClick={() => setShowAddDoctorModal(false)}>×</button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          value={newDoctor.fname}
                          onChange={(e) => setNewDoctor({ ...newDoctor, fname: e.target.value })}
                          className="input-sm"
                          placeholder="Enter first name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          value={newDoctor.lname}
                          onChange={(e) => setNewDoctor({ ...newDoctor, lname: e.target.value })}
                          className="input-sm"
                          placeholder="Enter last name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Clinic *</label>
                        <select
                          value={newDoctor.assignedClinic || ''}
                          onChange={(e) => {
                            const clinicId = e.target.value ? parseInt(e.target.value) : null
                            setNewDoctor({ ...newDoctor, assignedClinic: clinicId })
                            // Recalculate filled days for the selected clinic
                            if (clinicId) {
                              const filled = new Set()
                              doctors.forEach(doctor => {
                                if (doctor.shiftDays && doctor.assignedClinic === clinicId) {
                                  doctor.shiftDays.forEach(day => filled.add(day))
                                }
                              })
                              setFilledDays(filled)
                            } else {
                              setFilledDays(new Set())
                            }
                          }}
                          className="input-sm"
                        >
                          <option value="">Select a clinic</option>
                          {clinics.map(clinic => (
                            <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Shift Days</label>
                        <p className="form-hint">Select the days this doctor will work. Greyed out days are already assigned to other doctors in the same clinic. Leave empty if no shifts assigned.</p>
                        <div className="shift-days-selector">
                          {[1, 2, 3, 4, 5, 6, 7].map(day => {
                            const isFilled = filledDays.has(day)
                            const isSelected = newDoctor.shiftDays.includes(day)
                            return (
                              <button
                                key={day}
                                type="button"
                                className={`shift-day-button ${isSelected ? 'selected' : ''} ${isFilled ? 'filled' : ''}`}
                                onClick={() => handleDayToggle(day)}
                                disabled={isFilled || !newDoctor.assignedClinic}
                                title={!newDoctor.assignedClinic ? 'Please select a clinic first' : isFilled ? `${getDayFullName(day)} is already assigned` : `${getDayFullName(day)} - Click to toggle`}
                              >
                                <span className="day-label">{getDayLabel(day)}</span>
                                <span className="day-full">{getDayFullName(day)}</span>
                              </button>
                            )
                          })}
                        </div>
                        {newDoctor.shiftDays.length > 0 && (
                          <div className="selected-days-info">
                            <p>Selected: {newDoctor.shiftDays.map(d => getDayFullName(d)).join(', ')}</p>
                          </div>
                        )}
                      </div>
                      <div className="modal-actions">
                        <button
                          onClick={createDoctor}
                          className="btn btn-primary"
                          disabled={loading || !newDoctor.fname || !newDoctor.lname || !newDoctor.assignedClinic}
                        >
                          {loading ? 'Creating...' : 'Create Doctor'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddDoctorModal(false)
                            setNewDoctor({ fname: '', lname: '', assignedClinic: null, shiftDays: [] })
                          }}
                          className="btn btn-secondary"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

      {/* Unassign Confirmation Modal (from clinic card) */}
      {showUnassignConfirm && doctorToUnassign && (
        <div className="modal-overlay" onClick={() => {
          setShowUnassignConfirm(false)
          setDoctorToUnassign(null)
          setClinicToUnassignFrom(null)
        }}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Unassign</h2>
              <button
                onClick={() => {
                  setShowUnassignConfirm(false)
                  setDoctorToUnassign(null)
                  setClinicToUnassignFrom(null)
                }}
                className="modal-close"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="confirm-message">
                Are you sure you want to unassign <strong>Dr. {doctorToUnassign.fname} {doctorToUnassign.lname}</strong> from this clinic?
              </p>
              <p className="confirm-warning">
                This will remove the doctor from the clinic. You can reassign them later if needed.
              </p>
              <div className="modal-actions">
                <button
                  onClick={handleUnassignDoctorFromClinic}
                  className="btn btn-danger"
                  disabled={loading}
                >
                  {loading ? 'Unassigning...' : 'Unassign'}
                </button>
                <button
                  onClick={() => {
                    setShowUnassignConfirm(false)
                    setDoctorToUnassign(null)
                    setClinicToUnassignFrom(null)
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Confirmation Modal (from edit doctor modal) */}
      {showEditDoctorUnassignConfirm && editingDoctor && editingDoctor.assignedClinic && (
        <div className="modal-overlay" onClick={() => {
          setShowEditDoctorUnassignConfirm(false)
        }}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Unassign</h2>
              <button
                onClick={() => {
                  setShowEditDoctorUnassignConfirm(false)
                }}
                className="modal-close"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="confirm-message">
                Are you sure you want to unassign <strong>Dr. {editingDoctor.fname} {editingDoctor.lname}</strong> from {clinics.find(c => c.id === editingDoctor.assignedClinic)?.name || 'the clinic'}?
              </p>
              <p className="confirm-warning">
                This will remove the doctor from the clinic and clear their shift days. You can reassign them later if needed.
              </p>
              <div className="modal-actions">
                <button
                  onClick={async () => {
                    try {
                      setLoading(true)
                      await doctorAPI.update(editingDoctor.id, { assignedClinic: null })
                      setToast({
                        message: 'Doctor unassigned successfully',
                        type: 'success'
                      })
                      setShowEditDoctorUnassignConfirm(false)
                      setShowEditDoctorModal(false)
                      setEditingDoctor(null)
                      await fetchDoctorsForView()
                      await fetchDoctors()
                    } catch (err) {
                      setToast({
                        message: err.message || 'Failed to unassign doctor',
                        type: 'error'
                      })
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="btn btn-danger"
                  disabled={loading}
                >
                  {loading ? 'Unassigning...' : 'Unassign'}
                </button>
                <button
                  onClick={() => {
                    setShowEditDoctorUnassignConfirm(false)
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
