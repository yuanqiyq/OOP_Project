import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { queueAPI, appointmentAPI, clinicAPI, adminAPI, doctorAPI } from '../lib/api'
import Navbar from '../components/Navbar'
import { useLocation } from 'react-router-dom'
import './StaffView.css'

export default function StaffView() {
  const { userProfile } = useAuth()
  const location = useLocation()
  const [clinicId, setClinicId] = useState(null)
  const [clinicName, setClinicName] = useState('')
  const [queue, setQueue] = useState([])
  const [currentServing, setCurrentServing] = useState(null)
  const [missed, setMissed] = useState([])
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [queueHistory, setQueueHistory] = useState(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null)
  
  // Treatment summary modal state
  const [showTreatmentModal, setShowTreatmentModal] = useState(false)
  const [selectedAppointmentForTreatment, setSelectedAppointmentForTreatment] = useState(null)
  const [selectedQueueIdForTreatment, setSelectedQueueIdForTreatment] = useState(null)
  const [treatmentSummaryText, setTreatmentSummaryText] = useState('')
  
  // Priority selection modal state for check-in
  const [showPriorityModal, setShowPriorityModal] = useState(false)
  const [selectedAppointmentForCheckIn, setSelectedAppointmentForCheckIn] = useState(null)
  const [checkInPriority, setCheckInPriority] = useState(1)
  
  // Doctor management state
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false)
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState(null)
  const [newDoctor, setNewDoctor] = useState({ fname: '', lname: '', shiftDays: [] })
  const [filledDays, setFilledDays] = useState(new Set())
  
  // Appointments tab state
  const [appointmentsTab, setAppointmentsTab] = useState('upcoming') // 'upcoming', 'history', 'cancelled'
  
  // Medical history modal state
  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState(false)
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState(null)
  const [patientAppointmentsHistory, setPatientAppointmentsHistory] = useState([])
  
  // Treatment summary modal state
  const [showTreatmentSummaryModal, setShowTreatmentSummaryModal] = useState(false)
  const [selectedAppointmentForSummary, setSelectedAppointmentForSummary] = useState(null)

  useEffect(() => {
    if (userProfile?.email) {
      fetchStaffClinic()
    }
  }, [userProfile])

  useEffect(() => {
    if (clinicId) {
      fetchQueue(true) // Show errors on initial load
      fetchCurrentlyServing()
      fetchMissed()
      fetchAppointments()
      fetchDoctors()
      fetchPatients()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  useEffect(() => {
    if (autoRefresh && clinicId && location.pathname.includes('/staff') && !location.pathname.includes('/settings')) {
      const interval = setInterval(() => {
        fetchQueue(false) // Don't show errors for auto-refresh
        fetchCurrentlyServing()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, clinicId, location])

  const fetchStaffClinic = async () => {
    try {
      const staff = await adminAPI.getStaffByEmail(userProfile.email)
      if (staff?.clinic?.id) {
        setClinicId(staff.clinic.id)
        setClinicName(staff.clinic.name || '')
      } else if (staff?.clinicId) {
        setClinicId(staff.clinicId)
        setClinicName(staff.clinicName || '')
      }
    } catch (err) {
      console.error('Failed to fetch staff clinic', err)
    }
  }

  const fetchDoctors = async () => {
    if (!clinicId) return
    try {
      const data = await doctorAPI.getByClinic(clinicId)
      setDoctors(data || [])
      // Calculate filled days (excluding the doctor being edited)
      const filled = new Set()
      data?.forEach(doctor => {
        if (doctor.shiftDays && doctor.shiftDays.length > 0 && (!editingDoctor || doctor.id !== editingDoctor.id)) {
          doctor.shiftDays.forEach(day => filled.add(day))
        }
      })
      setFilledDays(filled)
    } catch (err) {
      console.error('Failed to fetch doctors', err)
    }
  }

  const fetchQueue = async (showError = false) => {
    try {
      const data = await queueAPI.getClinicQueue(clinicId)
      setQueue(data.queue || [])
      if (showError) {
        setError('')
      }
    } catch (err) {
      console.error('Failed to load queue:', err)
      // Only show error if explicitly requested (user-initiated refresh)
      if (showError) {
        setError('Failed to load queue')
        setTimeout(() => setError(''), 5000)
      }
    }
  }

  const fetchCurrentlyServing = async () => {
    try {
      const data = await queueAPI.getCurrentlyServing(clinicId)
      setCurrentServing(data)
    } catch (err) {
      console.error('Failed to fetch currently serving:', err)
      // Don't show error for auto-refresh failures, just log them
    }
  }

  const fetchMissed = async () => {
    try {
      const data = await queueAPI.getMissed(clinicId)
      setMissed(data.missedPatients || [])
    } catch (err) {
      console.error('Failed to fetch missed patients', err)
    }
  }

  const fetchPatients = async () => {
    try {
      const data = await adminAPI.getPatients()
      setPatients(data || [])
    } catch (err) {
      console.error('Failed to fetch patients', err)
    }
  }

  const fetchAppointments = async () => {
    try {
      const data = await appointmentAPI.getByClinicId(clinicId)
      setAppointments(data || [])
    } catch (err) {
      console.error('Failed to fetch appointments', err)
    }
  }

  const fetchQueueHistory = async (appointmentId) => {
    try {
      setLoading(true)
      const data = await queueAPI.getAppointmentHistory(appointmentId)
      setQueueHistory(data)
      setSelectedAppointmentId(appointmentId)
      setError('')
    } catch (err) {
      setError('Failed to load queue history')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateQueueStatus = async (queueId, status) => {
    try {
      setLoading(true)
      await queueAPI.updateStatus(queueId, status)
      setError('')
      setSuccess(`Queue entry marked as ${status}`)
      setTimeout(() => setSuccess(''), 3000)
      await fetchQueue(false)
      await fetchCurrentlyServing()
      await fetchMissed()
    } catch (err) {
      setError(err.message || 'Failed to update queue status')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const openTreatmentModal = (appointmentId, queueId) => {
    setSelectedAppointmentForTreatment(appointmentId)
    setSelectedQueueIdForTreatment(queueId)
    setTreatmentSummaryText('')
    setShowTreatmentModal(true)
  }

  const completeAppointmentWithTreatment = async () => {
    if (!selectedAppointmentForTreatment) return

    try {
      setLoading(true)
      
      // Prepare update payload
      // Try both formats - Jackson should handle either with @JsonCreator
      const updatePayload = {
        apptStatus: 'COMPLETED'  // Using enum name format
      }
      
      // Only include treatmentSummary if it's not empty
      const trimmedSummary = treatmentSummaryText.trim()
      if (trimmedSummary) {
        updatePayload.treatmentSummary = trimmedSummary
      }
      
      // Update appointment with treatment summary and mark as COMPLETED
      await appointmentAPI.update(selectedAppointmentForTreatment, updatePayload)
      
      // Mark queue entry as DONE (finds active queue entry by appointmentId)
      // This will remove the patient from the queue regardless of their current status (IN_QUEUE or CALLED)
      try {
        await queueAPI.markAppointmentDone(selectedAppointmentForTreatment)
      } catch (err) {
        // Log but don't fail - appointment might not be in queue
        console.warn('Could not update queue status:', err)
      }
      
      // Close modal and reset state first
      setShowTreatmentModal(false)
      setSelectedAppointmentForTreatment(null)
      setSelectedQueueIdForTreatment(null)
      setTreatmentSummaryText('')
      
      // Show success toast
      setError('')
      setSuccess('Appointment done!')
      setTimeout(() => setSuccess(''), 3000)
      
      // Refresh data to remove from queue and update display
      await fetchQueue(false)
      await fetchCurrentlyServing()
      await fetchMissed()
      await fetchAppointments()
    } catch (err) {
      console.error('Error completing appointment:', err)
      setError(err.message || 'Failed to complete appointment')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const requeuePatient = async (appointmentId, priority = 1) => {
    try {
      setLoading(true)
      await queueAPI.requeue(appointmentId, priority)
      setError('')
      setSuccess('Patient re-queued successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchQueue(false)
      await fetchMissed()
    } catch (err) {
      setError(err.message || 'Failed to requeue patient')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      setLoading(true)
      await appointmentAPI.updateStatus(appointmentId, status)
      setError('')
      setSuccess(`Appointment status updated to ${status}`)
      setTimeout(() => setSuccess(''), 3000)
      await fetchAppointments()
    } catch (err) {
      setError(err.message || 'Failed to update appointment status')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Cancel appointment (bypasses 24h restriction for staff)
  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return
    }
    
    try {
      setLoading(true)
      await appointmentAPI.updateStatus(appointmentId, 'CANCELLED')
      setError('')
      setSuccess('Appointment cancelled successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchAppointments()
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Get upcoming appointments (future appointments that are not cancelled or completed)
  const getUpcomingAppointments = () => {
    const now = new Date()
    return appointments.filter(apt => {
      // First check status - cancelled and completed should never be in upcoming
      const status = apt.apptStatus?.toUpperCase() || ''
      if (status === 'CANCELLED' || status === 'COMPLETED') {
        return false
      }
      // Then check if it's a future appointment
      const aptDate = new Date(apt.dateTime)
      return aptDate > now
    })
  }

  // Get completed appointments (all appointments with COMPLETED status, regardless of date)
  const getHistoryAppointments = () => {
    return appointments.filter(apt => {
      const status = apt.apptStatus?.toUpperCase() || ''
      return status === 'COMPLETED'
    })
  }

  // Get cancelled appointments (all appointments with CANCELLED status, regardless of date)
  const getCancelledAppointments = () => {
    return appointments.filter(apt => {
      const status = apt.apptStatus?.toUpperCase() || ''
      return status === 'CANCELLED'
    })
  }

  // Open medical history modal for a patient
  const openMedicalHistoryModal = async (patientId) => {
    try {
      setLoading(true)
      setSelectedPatientForHistory(patientId)
      const history = await appointmentAPI.getByPatientId(patientId)
      // Sort by date descending (most recent first)
      const sortedHistory = (history || []).sort((a, b) => {
        return new Date(b.dateTime) - new Date(a.dateTime)
      })
      setPatientAppointmentsHistory(sortedHistory)
      setShowMedicalHistoryModal(true)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load medical history')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Format date and time helper
  const formatDateTime = (dateTime) => {
    let formattedDate, formattedTime
    if (typeof dateTime === 'string') {
      const dateMatch = dateTime.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
      if (dateMatch) {
        const [, year, month, day, hour, minute] = dateMatch
        const monthNum = parseInt(month, 10)
        const dayNum = parseInt(day, 10)
        const hourNum = parseInt(hour, 10)
        const minuteNum = parseInt(minute, 10)
        
        formattedDate = `${monthNum}/${dayNum}/${year}`
        const period = hourNum >= 12 ? 'PM' : 'AM'
        const displayHours = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum
        formattedTime = `${displayHours}:${minuteNum.toString().padStart(2, '0')} ${period}`
      } else {
        const dateTimeObj = new Date(dateTime)
        formattedDate = dateTimeObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric' 
        })
        const hours = dateTimeObj.getHours()
        const minutes = dateTimeObj.getMinutes()
        const period = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
        formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
      }
    } else {
      const dateTimeObj = new Date(dateTime)
      formattedDate = dateTimeObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'numeric', 
        day: 'numeric' 
      })
      const hours = dateTimeObj.getHours()
      const minutes = dateTimeObj.getMinutes()
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
      formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    }
    return { formattedDate, formattedTime }
  }

  const openCheckInModal = (appointmentId) => {
    setSelectedAppointmentForCheckIn(appointmentId)
    setCheckInPriority(1) // Default to normal priority
    setShowPriorityModal(true)
  }

  const checkInPatient = async () => {
    if (!selectedAppointmentForCheckIn) return
    
    try {
      setLoading(true)
      await queueAPI.checkIn(selectedAppointmentForCheckIn, checkInPriority)
      
      // Close modal and reset state
      setShowPriorityModal(false)
      setSelectedAppointmentForCheckIn(null)
      setCheckInPriority(1)
      
      setError('')
      setSuccess('Patient checked in to queue successfully!')
      setTimeout(() => setSuccess(''), 3000)
      await fetchQueue(false)
      await fetchAppointments()
    } catch (err) {
      setError(err.message || 'Failed to check in patient')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const callNextPatient = async () => {
    if (!clinicId) return
    
    try {
      setLoading(true)
      await queueAPI.callNext(clinicId)
      setError('')
      setSuccess('Next patient called successfully!')
      setTimeout(() => setSuccess(''), 3000)
      await fetchQueue(false)
      await fetchCurrentlyServing()
    } catch (err) {
      setError(err.message || 'Failed to call next patient')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const callPatientByAppointmentId = async (appointmentId) => {
    try {
      setLoading(true)
      await queueAPI.callByAppointmentId(appointmentId)
      setError('')
      setSuccess('Patient called successfully!')
      setTimeout(() => setSuccess(''), 3000)
      await fetchQueue(false)
      await fetchCurrentlyServing()
    } catch (err) {
      setError(err.message || 'Failed to call patient')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

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

  const handleEditDoctor = (doctor) => {
    setEditingDoctor({ ...doctor })
    setShowEditDoctorModal(true)
    // Recalculate filled days excluding this doctor
    const filled = new Set()
    doctors.forEach(d => {
      if (d.shiftDays && d.id !== doctor.id) {
        d.shiftDays.forEach(day => filled.add(day))
      }
    })
    setFilledDays(filled)
  }

  const createDoctor = async () => {
    if (!newDoctor.fname || !newDoctor.lname) {
      setError('First name and last name are required')
      return
    }

    try {
      setLoading(true)
      await doctorAPI.create({
        fname: newDoctor.fname,
        lname: newDoctor.lname,
        assignedClinic: clinicId,
        shiftDays: newDoctor.shiftDays.length > 0 ? newDoctor.shiftDays : null
      })
      setError('')
      setSuccess('Doctor created successfully!')
      setTimeout(() => setSuccess(''), 3000)
      setShowAddDoctorModal(false)
      setNewDoctor({ fname: '', lname: '', shiftDays: [] })
      await fetchDoctors()
    } catch (err) {
      setError(err.message || 'Failed to create doctor')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const updateDoctor = async () => {
    if (!editingDoctor || !editingDoctor.fname || !editingDoctor.lname) {
      setError('First name and last name are required')
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
      setError('')
      setSuccess('Doctor updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
      setShowEditDoctorModal(false)
      setEditingDoctor(null)
      await fetchDoctors()
    } catch (err) {
      setError(err.message || 'Failed to update doctor')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentView = () => {
    if (location.pathname.includes('/appointments')) return 'appointments'
    if (location.pathname.includes('/doctors')) return 'doctors'
    if (location.pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const getDayLabel = (day) => {
    const labels = { 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 7: 'S' }
    return labels[day] || day
  }

  const getDayFullName = (day) => {
    const names = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' }
    return names[day] || `Day ${day}`
  }

  const currentView = getCurrentView()

  return (
    <div className="staff-view">
      <Navbar />
      <div className="staff-layout">
        <div className="staff-main">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {currentView === 'dashboard' && (
            <>
              <div className="page-header">
                <div>
                  <h1>Queue Management</h1>
                  <p className="subtitle">
                    {clinicName || `Clinic ID: ${clinicId}`}
                  </p>
                </div>
                <div className="header-controls">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    <span>Auto Refresh</span>
                  </label>
                  <button onClick={() => fetchQueue(true)} className="btn btn-secondary">
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Currently Serving */}
              <div className="section-card serving-card-large">
                <h2>Currently Serving</h2>
                {currentServing?.status === 'QUEUE_EMPTY' ? (
                  <div className="empty-state-large">
                    <div className="empty-icon">📭</div>
                    <p>No patient currently being served</p>
                    {queue.length > 0 && (
                      <button
                        onClick={callNextPatient}
                        className="btn btn-primary btn-large"
                        disabled={loading}
                        style={{ marginTop: '1rem' }}
                      >
                        📞 Call Next Patient
                      </button>
                    )}
                  </div>
                ) : currentServing?.appointmentId ? (
                  <div className="serving-display">
                    <div className="serving-badge">
                      <span className="serving-label">NOW SERVING</span>
                      <span className="serving-id">#{currentServing.appointmentId}</span>
                    </div>
                    <div className="serving-actions">
                      <button
                        onClick={() => openTreatmentModal(currentServing.appointmentId, currentServing.queueId)}
                        className="btn btn-success btn-large"
                        disabled={loading}
                      >
                        ✓ Mark as Done
                      </button>
                      {queue.length > 0 && (
                        <button
                          onClick={callNextPatient}
                          className="btn btn-primary btn-large"
                          disabled={loading}
                          style={{ marginLeft: '0.5rem' }}
                        >
                          📞 Call Next
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="loading">Loading...</div>
                )}
              </div>

              {/* Queue List */}
              <div className="section-card">
                <div className="section-header">
                  <h2>Queue ({queue.length})</h2>
                  <span className="queue-status-badge">
                    {queue.length > 0 ? `${queue.length} waiting` : 'Empty'}
                  </span>
                </div>
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : queue.length === 0 ? (
                  <div className="empty-state">Queue is empty</div>
                ) : (
                  <div className="queue-list-enhanced">
                    {queue.map((entry, index) => (
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
                            <div className="info-item">
                              <span className="info-label">Queue ID:</span>
                              <span className="info-value">{entry.queueId}</span>
                            </div>
                          </div>
                        </div>
                        <div className="queue-actions-enhanced">
                          <button
                            onClick={() => callPatientByAppointmentId(entry.appointmentId)}
                            className="btn btn-primary"
                            disabled={loading}
                            title="Call this patient now"
                          >
                            📞 Call
                          </button>
                          {index === 0 && (
                            <button
                              onClick={() => openTreatmentModal(entry.appointmentId, entry.queueId)}
                              className="btn btn-success"
                              disabled={loading}
                            >
                              ✓ Done
                            </button>
                          )}
                          <button
                            onClick={() => updateQueueStatus(entry.queueId, 'MISSED')}
                            className="btn btn-warning"
                            disabled={loading}
                          >
                            ⚠ Missed
                          </button>
                          <button
                            onClick={() => fetchQueueHistory(entry.appointmentId)}
                            className="btn btn-outline"
                            disabled={loading}
                          >
                            📋 History
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Missed Patients */}
              {missed.length > 0 && (
                <div className="section-card missed-card">
                  <div className="section-header">
                    <h2>Missed Patients ({missed.length})</h2>
                  </div>
                  <div className="missed-list-enhanced">
                    {missed.map((entry) => (
                      <div key={entry.queueId} className="missed-item-enhanced">
                        <div className="missed-info">
                          <h3>Appointment #{entry.appointmentId}</h3>
                          <p>Status: {entry.status}</p>
                          <p>Missed at: {new Date(entry.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="missed-actions">
                          <button
                            onClick={() => requeuePatient(entry.appointmentId, 1)}
                            className="btn btn-primary"
                            disabled={loading}
                          >
                            ↻ Re-queue (Normal)
                          </button>
                          <button
                            onClick={() => requeuePatient(entry.appointmentId, 2)}
                            className="btn btn-success"
                            disabled={loading}
                          >
                            ↻ Re-queue (Priority)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Treatment Summary Modal */}
              {showTreatmentModal && selectedAppointmentForTreatment && (
                <div className="modal-overlay" onClick={() => {
                  if (!loading) {
                    setShowTreatmentModal(false)
                    setSelectedAppointmentForTreatment(null)
                    setSelectedQueueIdForTreatment(null)
                    setTreatmentSummaryText('')
                  }
                }}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>Complete Appointment #{selectedAppointmentForTreatment}</h2>
                      <button
                        onClick={() => {
                          if (!loading) {
                            setShowTreatmentModal(false)
                            setSelectedAppointmentForTreatment(null)
                            setSelectedQueueIdForTreatment(null)
                            setTreatmentSummaryText('')
                          }
                        }}
                        className="btn-close"
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label>Treatment Summary</label>
                        <textarea
                          value={treatmentSummaryText}
                          onChange={(e) => setTreatmentSummaryText(e.target.value)}
                          className="input-sm"
                          placeholder="Enter a short treatment summary (optional)"
                          rows={6}
                          disabled={loading}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '2px solid rgba(78, 205, 196, 0.2)',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            minHeight: '120px'
                          }}
                        />
                        <p className="form-hint" style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                          Write a brief summary of the treatment provided. This will be saved with the appointment record.
                        </p>
                      </div>
                      <div className="modal-actions">
                        <button
                          onClick={completeAppointmentWithTreatment}
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading ? 'Completing...' : '✓ Complete Appointment'}
                        </button>
                        <button
                          onClick={() => {
                            if (!loading) {
                              setShowTreatmentModal(false)
                              setSelectedAppointmentForTreatment(null)
                              setSelectedQueueIdForTreatment(null)
                              setTreatmentSummaryText('')
                            }
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

              {/* Priority Selection Modal for Check-In */}
              {showPriorityModal && selectedAppointmentForCheckIn && (
                <div className="modal-overlay" onClick={() => {
                  if (!loading) {
                    setShowPriorityModal(false)
                    setSelectedAppointmentForCheckIn(null)
                    setCheckInPriority(1)
                  }
                }}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>Check In Patient - Appointment #{selectedAppointmentForCheckIn}</h2>
                      <button
                        onClick={() => {
                          if (!loading) {
                            setShowPriorityModal(false)
                            setSelectedAppointmentForCheckIn(null)
                            setCheckInPriority(1)
                          }
                        }}
                        className="btn-close"
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label>Priority Level</label>
                        <select
                          value={checkInPriority}
                          onChange={(e) => setCheckInPriority(parseInt(e.target.value))}
                          className="select-input"
                          disabled={loading}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '2px solid rgba(78, 205, 196, 0.2)',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontFamily: 'inherit'
                          }}
                        >
                          <option value={1}>Normal Priority</option>
                          <option value={2}>High Priority</option>
                        </select>
                        <p className="form-hint" style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                          High priority patients will be placed ahead of normal priority patients in the queue.
                        </p>
                      </div>
                      <div className="modal-actions">
                        <button
                          onClick={checkInPatient}
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading ? 'Checking In...' : '✓ Check In'}
                        </button>
                        <button
                          onClick={() => {
                            if (!loading) {
                              setShowPriorityModal(false)
                              setSelectedAppointmentForCheckIn(null)
                              setCheckInPriority(1)
                            }
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

              {/* Queue History Modal */}
              {queueHistory && selectedAppointmentId && (
                <div className="modal-overlay" onClick={() => setQueueHistory(null)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>Queue History - Appointment #{selectedAppointmentId}</h2>
                      <button
                        onClick={() => setQueueHistory(null)}
                        className="btn-close"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="modal-body">
                      {queueHistory.history?.length > 0 ? (
                        <div className="history-list">
                          {queueHistory.history.map((entry) => (
                            <div key={entry.queueId} className="history-item">
                              <div className="history-status">
                                <span className={`status-badge status-${entry.status?.toLowerCase()}`}>
                                  {entry.status}
                                </span>
                              </div>
                              <div className="history-details">
                                <p><strong>Queue ID:</strong> {entry.queueId}</p>
                                <p><strong>Priority:</strong> {entry.priority}</p>
                                <p><strong>Created:</strong> {new Date(entry.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No history available</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {currentView === 'appointments' && (
            <>
              <div className="page-header">
                <h1>Appointments</h1>
                <div className="header-controls">
                  <p className="subtitle">{clinicName || `Clinic ID: ${clinicId}`}</p>
                  <button onClick={fetchAppointments} className="btn btn-secondary">
                    Refresh
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="appointments-tabs">
                <button
                  className={`tab-button ${appointmentsTab === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setAppointmentsTab('upcoming')}
                >
                  Upcoming ({getUpcomingAppointments().length})
                </button>
                <button
                  className={`tab-button ${appointmentsTab === 'history' ? 'active' : ''}`}
                  onClick={() => setAppointmentsTab('history')}
                >
                  History ({getHistoryAppointments().length})
                </button>
                <button
                  className={`tab-button ${appointmentsTab === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setAppointmentsTab('cancelled')}
                >
                  Cancelled ({getCancelledAppointments().length})
                </button>
              </div>

              {/* Upcoming Appointments Tab */}
              {appointmentsTab === 'upcoming' && (
                <div className="section-card">
                  <div className="section-header">
                    <h2>Upcoming Appointments ({getUpcomingAppointments().length})</h2>
                  </div>
                  {loading ? (
                    <div className="loading">Loading...</div>
                  ) : getUpcomingAppointments().length === 0 ? (
                    <div className="empty-state">No upcoming appointments found</div>
                  ) : (
                    <div className="appointments-table-container">
                      <table className="appointments-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Patient Name</th>
                            <th>Doctor Name</th>
                            <th>Date & Time</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getUpcomingAppointments().map((apt) => {
                            const patient = patients.find(p => p.patientId === apt.patientId || p.userId === apt.patientId)
                            const patientName = patient ? `${patient.fname || ''} ${patient.lname || ''}`.trim() : `Patient #${apt.patientId}`
                            
                            const doctor = doctors.find(d => d.id === apt.doctorId)
                            const doctorName = doctor ? `Dr. ${doctor.fname || ''} ${doctor.lname || ''}`.trim() : (apt.doctorId ? `Doctor #${apt.doctorId}` : 'N/A')
                            
                            const { formattedDate, formattedTime } = formatDateTime(apt.dateTime)
                            
                            return (
                              <tr key={apt.appointmentId}>
                                <td>#{apt.appointmentId}</td>
                                <td>{patientName}</td>
                                <td>{doctorName}</td>
                                <td>{formattedDate}, {formattedTime}</td>
                                <td>
                                  <span className={`status-badge status-${apt.apptStatus?.toLowerCase() || 'pending'}`}>
                                    {apt.apptStatus || 'PENDING'}
                                  </span>
                                </td>
                                <td>
                                  <div className="action-buttons-small">
                                    <button
                                      onClick={() => cancelAppointment(apt.appointmentId)}
                                      className="btn btn-warning btn-sm"
                                      disabled={loading || apt.apptStatus === 'CANCELLED'}
                                      title="Cancel appointment"
                                    >
                                      ✕ Cancel
                                    </button>
                                    <button
                                      onClick={() => openMedicalHistoryModal(apt.patientId)}
                                      className="btn btn-outline btn-sm"
                                      disabled={loading}
                                      title="View patient medical history"
                                    >
                                      📋 Medical History
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* History Tab (Completed Appointments) */}
              {appointmentsTab === 'history' && (
                <div className="section-card">
                  <div className="section-header">
                    <h2>Appointment History ({getHistoryAppointments().length})</h2>
                  </div>
                  {loading ? (
                    <div className="loading">Loading...</div>
                  ) : getHistoryAppointments().length === 0 ? (
                    <div className="empty-state">No completed appointments found</div>
                  ) : (
                    <div className="appointments-table-container">
                      <table className="appointments-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Patient Name</th>
                            <th>Doctor Name</th>
                            <th>Date & Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getHistoryAppointments().map((apt) => {
                            const patient = patients.find(p => p.patientId === apt.patientId || p.userId === apt.patientId)
                            const patientName = patient ? `${patient.fname || ''} ${patient.lname || ''}`.trim() : `Patient #${apt.patientId}`
                            
                            const doctor = doctors.find(d => d.id === apt.doctorId)
                            const doctorName = doctor ? `Dr. ${doctor.fname || ''} ${doctor.lname || ''}`.trim() : (apt.doctorId ? `Doctor #${apt.doctorId}` : 'N/A')
                            
                            const { formattedDate, formattedTime } = formatDateTime(apt.dateTime)
                            
                            return (
                              <tr 
                                key={apt.appointmentId}
                                className="appointment-row-clickable"
                                onClick={() => {
                                  setSelectedAppointmentForSummary(apt)
                                  setShowTreatmentSummaryModal(true)
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <td>#{apt.appointmentId}</td>
                                <td>{patientName}</td>
                                <td>{doctorName}</td>
                                <td>{formattedDate}, {formattedTime}</td>
                                <td>
                                  <span className={`status-badge status-${apt.apptStatus?.toLowerCase() || 'pending'}`}>
                                    {apt.apptStatus || 'PENDING'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Cancelled Appointments Tab */}
              {appointmentsTab === 'cancelled' && (
                <div className="section-card">
                  <div className="section-header">
                    <h2>Cancelled Appointments ({getCancelledAppointments().length})</h2>
                  </div>
                  {loading ? (
                    <div className="loading">Loading...</div>
                  ) : getCancelledAppointments().length === 0 ? (
                    <div className="empty-state">No cancelled appointments found</div>
                  ) : (
                    <div className="appointments-table-container">
                      <table className="appointments-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Patient Name</th>
                            <th>Doctor Name</th>
                            <th>Date & Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getCancelledAppointments().map((apt) => {
                            const patient = patients.find(p => p.patientId === apt.patientId || p.userId === apt.patientId)
                            const patientName = patient ? `${patient.fname || ''} ${patient.lname || ''}`.trim() : `Patient #${apt.patientId}`
                            
                            const doctor = doctors.find(d => d.id === apt.doctorId)
                            const doctorName = doctor ? `Dr. ${doctor.fname || ''} ${doctor.lname || ''}`.trim() : (apt.doctorId ? `Doctor #${apt.doctorId}` : 'N/A')
                            
                            const { formattedDate, formattedTime } = formatDateTime(apt.dateTime)
                            
                            return (
                              <tr key={apt.appointmentId}>
                                <td>#{apt.appointmentId}</td>
                                <td>{patientName}</td>
                                <td>{doctorName}</td>
                                <td>{formattedDate}, {formattedTime}</td>
                                <td>
                                  <span className={`status-badge status-${apt.apptStatus?.toLowerCase() || 'pending'}`}>
                                    {apt.apptStatus || 'PENDING'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Medical History Modal */}
              {showMedicalHistoryModal && selectedPatientForHistory && (() => {
                const patient = patients.find(p => p.patientId === selectedPatientForHistory || p.userId === selectedPatientForHistory)
                const patientName = patient ? `${patient.fname || ''} ${patient.lname || ''}`.trim() : `Patient #${selectedPatientForHistory}`
                
                return (
                  <div className="modal-overlay" onClick={() => {
                    if (!loading) {
                      setShowMedicalHistoryModal(false)
                      setSelectedPatientForHistory(null)
                      setPatientAppointmentsHistory([])
                    }
                  }}>
                    <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <div>
                          <h2>Medical History</h2>
                          <p className="subtitle" style={{ marginTop: '0.5rem', marginBottom: 0 }}>{patientName}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (!loading) {
                              setShowMedicalHistoryModal(false)
                              setSelectedPatientForHistory(null)
                              setPatientAppointmentsHistory([])
                            }
                          }}
                          className="btn-close"
                          disabled={loading}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="modal-body">
                      {loading ? (
                        <div className="loading">Loading medical history...</div>
                      ) : patientAppointmentsHistory.length === 0 ? (
                        <div className="empty-state">No appointment history found for this patient</div>
                      ) : (
                        <div className="medical-history-list">
                          {patientAppointmentsHistory.map((apt) => {
                            const doctor = doctors.find(d => d.id === apt.doctorId)
                            const doctorName = doctor ? `Dr. ${doctor.fname || ''} ${doctor.lname || ''}`.trim() : (apt.doctorId ? `Doctor #${apt.doctorId}` : 'N/A')
                            const { formattedDate, formattedTime } = formatDateTime(apt.dateTime)
                            
                            return (
                              <div key={apt.appointmentId} className="medical-history-item">
                                <div className="medical-history-header">
                                  <div>
                                    <h3>Appointment #{apt.appointmentId}</h3>
                                    <p className="medical-history-date">{formattedDate}, {formattedTime}</p>
                                    <p className="medical-history-doctor">Doctor: {doctorName}</p>
                                  </div>
                                  <span className={`status-badge status-${apt.apptStatus?.toLowerCase() || 'pending'}`}>
                                    {apt.apptStatus || 'PENDING'}
                                  </span>
                                </div>
                                {apt.treatmentSummary && (
                                  <div className="treatment-summary-section">
                                    <h4>Treatment Summary</h4>
                                    <div className="treatment-summary-content">
                                      {apt.treatmentSummary}
                                    </div>
                                  </div>
                                )}
                                {!apt.treatmentSummary && apt.apptStatus === 'COMPLETED' && (
                                  <div className="treatment-summary-section">
                                    <p className="no-treatment-summary">No treatment summary available for this appointment.</p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Treatment Summary Modal */}
              {showTreatmentSummaryModal && selectedAppointmentForSummary && (() => {
                const patient = patients.find(p => p.patientId === selectedAppointmentForSummary.patientId || p.userId === selectedAppointmentForSummary.patientId)
                const patientName = patient ? `${patient.fname || ''} ${patient.lname || ''}`.trim() : `Patient #${selectedAppointmentForSummary.patientId}`
                
                const doctor = doctors.find(d => d.id === selectedAppointmentForSummary.doctorId)
                const doctorName = doctor ? `Dr. ${doctor.fname || ''} ${doctor.lname || ''}`.trim() : (selectedAppointmentForSummary.doctorId ? `Doctor #${selectedAppointmentForSummary.doctorId}` : 'N/A')
                const { formattedDate, formattedTime } = formatDateTime(selectedAppointmentForSummary.dateTime)
                
                return (
                  <div className="modal-overlay" onClick={() => {
                    setShowTreatmentSummaryModal(false)
                    setSelectedAppointmentForSummary(null)
                  }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <div>
                          <h2>Treatment Summary</h2>
                          <p className="subtitle" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                            Appointment #{selectedAppointmentForSummary.appointmentId}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowTreatmentSummaryModal(false)
                            setSelectedAppointmentForSummary(null)
                          }}
                          className="btn-close"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="modal-body">
                        <div className="treatment-summary-details">
                          <div className="summary-info-item">
                            <span className="summary-label">Patient:</span>
                            <span className="summary-value">{patientName}</span>
                          </div>
                          <div className="summary-info-item">
                            <span className="summary-label">Doctor:</span>
                            <span className="summary-value">{doctorName}</span>
                          </div>
                          <div className="summary-info-item">
                            <span className="summary-label">Date & Time:</span>
                            <span className="summary-value">{formattedDate}, {formattedTime}</span>
                          </div>
                          <div className="summary-info-item">
                            <span className="summary-label">Status:</span>
                            <span className={`status-badge status-${selectedAppointmentForSummary.apptStatus?.toLowerCase() || 'pending'}`}>
                              {selectedAppointmentForSummary.apptStatus || 'PENDING'}
                            </span>
                          </div>
                        </div>
                        
                        {selectedAppointmentForSummary.treatmentSummary ? (
                          <div className="treatment-summary-section" style={{ marginTop: '1.5rem' }}>
                            <h4>Treatment Summary</h4>
                            <div className="treatment-summary-content">
                              {selectedAppointmentForSummary.treatmentSummary}
                            </div>
                          </div>
                        ) : (
                          <div className="treatment-summary-section" style={{ marginTop: '1.5rem' }}>
                            <p className="no-treatment-summary">No treatment summary available for this appointment.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </>
          )}

          {currentView === 'doctors' && (
            <>
              <div className="page-header">
                <h1>Doctors</h1>
                <div className="header-controls">
                  <p className="subtitle">{clinicName || `Clinic ID: ${clinicId}`}</p>
                  <button onClick={() => {
                    // Recalculate filled days when opening add modal
                    const filled = new Set()
                    doctors.forEach(doctor => {
                      if (doctor.shiftDays && doctor.shiftDays.length > 0) {
                        doctor.shiftDays.forEach(day => filled.add(day))
                      }
                    })
                    setFilledDays(filled)
                    setShowAddDoctorModal(true)
                  }} className="btn btn-primary">
                    + Add Doctor
                  </button>
                  <button onClick={fetchDoctors} className="btn btn-secondary">
                    Refresh
                  </button>
                </div>
              </div>

              <div className="section-card">
                <div className="section-header">
                  <h2>Clinic Doctors ({doctors.length})</h2>
                </div>
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : doctors.length === 0 ? (
                  <div className="empty-state">
                    <p>No doctors found for this clinic</p>
                    <button onClick={() => {
                      // No doctors exist, so no days are filled
                      setFilledDays(new Set())
                      setShowAddDoctorModal(true)
                    }} className="btn btn-primary">
                      Add First Doctor
                    </button>
                  </div>
                ) : (
                  <div className="doctors-grid">
                    {doctors.map((doctor) => (
                      <div key={doctor.id} className="doctor-card">
                        <div className="doctor-header">
                          <h3>Dr. {doctor.fname} {doctor.lname}</h3>
                          <span className="doctor-id">ID: {doctor.id}</span>
                        </div>
                        <div className="doctor-details">
                          <div className="detail-item">
                            <span className="detail-label">Clinic ID:</span>
                            <span className="detail-value">{doctor.assignedClinic}</span>
                          </div>
                          {doctor.shiftDays && doctor.shiftDays.length > 0 ? (
                            <div className="doctor-shifts">
                              <span className="detail-label">Shift Days:</span>
                              <div className="shift-days-display">
                                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                  <span
                                    key={day}
                                    className={`shift-day-badge ${doctor.shiftDays.includes(day) ? 'active' : 'inactive'}`}
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
                    ))}
                  </div>
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
                        <label>Shift Days</label>
                        <p className="form-hint">Select the days this doctor will work. Greyed out days are already assigned to other doctors. Leave empty if no shifts assigned.</p>
                        <div className="shift-days-selector">
                          {[1, 2, 3, 4, 5, 6, 7].map(day => {
                            const isFilled = filledDays.has(day)
                            const isSelected = editingDoctor.shiftDays.includes(day)
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
                        {editingDoctor.shiftDays.length > 0 && (
                          <div className="selected-days-info">
                            <p>Selected: {editingDoctor.shiftDays.map(d => getDayFullName(d)).join(', ')}</p>
                          </div>
                        )}
                      </div>
                      <div className="modal-actions">
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
                        <label>Shift Days</label>
                        <p className="form-hint">Select the days this doctor will work. Greyed out days are already assigned to other doctors. Leave empty if no shifts assigned.</p>
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
                                disabled={isFilled}
                                title={isFilled ? `${getDayFullName(day)} is already assigned` : `${getDayFullName(day)} - Click to toggle`}
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
                          disabled={loading || !newDoctor.fname || !newDoctor.lname}
                        >
                          {loading ? 'Creating...' : 'Create Doctor'}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddDoctorModal(false)
                            setNewDoctor({ fname: '', lname: '', shiftDays: [] })
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
                  <div className="form-group">
                    <label>Clinic Assignment</label>
                    <input
                      type="text"
                      value={clinicName || `Clinic ID: ${clinicId}`}
                      disabled
                      className="select-input"
                    />
                  </div>
                </div>
              </div>
              <div className="section-card">
                <h2>Queue Settings</h2>
                <div className="settings-form">
                  <label className="toggle-switch-large">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    <span>Auto-refresh queue every 5 seconds</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
