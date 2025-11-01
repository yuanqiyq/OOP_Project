import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { appointmentAPI, queueAPI, adminAPI } from '../lib/api'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useLocation } from 'react-router-dom'
import './PatientView.css'

export default function PatientView() {
  const { userProfile } = useAuth()
  const location = useLocation()
  const [appointments, setAppointments] = useState([])
  const [queuePosition, setQueuePosition] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0 })
  const [clinicId, setClinicId] = useState(null)

  useEffect(() => {
    if (userProfile?.userId) {
      fetchAppointments()
    }
  }, [userProfile])

  useEffect(() => {
    // Auto-refresh queue position if selected
    if (selectedAppointment && location.pathname.includes('/queue')) {
      const interval = setInterval(() => {
        checkQueuePosition(selectedAppointment)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [selectedAppointment, location])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const data = await appointmentAPI.getByPatientId(userProfile.userId)
      setAppointments(data || [])
      
      // Calculate stats
      const now = new Date()
      const upcoming = data?.filter(apt => new Date(apt.dateTime) > now) || []
      const completed = data?.filter(apt => apt.apptStatus === 'COMPLETED') || []
      
      setStats({
        total: data?.length || 0,
        upcoming: upcoming.length,
        completed: completed.length
      })
      
      // Get clinic ID from first appointment
      if (data?.length > 0 && data[0].clinicId) {
        setClinicId(data[0].clinicId)
      }
      
      setError('')
    } catch (err) {
      setError('Failed to load appointments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const checkQueuePosition = async (appointmentId) => {
    try {
      const position = await queueAPI.getQueuePosition(appointmentId)
      setQueuePosition(position)
      setSelectedAppointment(appointmentId)
      setError('')
    } catch (err) {
      if (err.message.includes('404') || err.message.includes('Not Found')) {
        setQueuePosition(null)
      } else {
        setError('Failed to get queue position')
      }
      console.error(err)
    }
  }

  const checkIn = async (appointmentId, priority = 1) => {
    try {
      setLoading(true)
      await queueAPI.checkIn(appointmentId, priority)
      setError('')
      setSuccess('Successfully checked in to queue!')
      await checkQueuePosition(appointmentId)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to check in')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const createTestAppointment = async () => {
    try {
      setLoading(true)
      if (!clinicId) {
        setError('Please select a clinic ID first')
        return
      }
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      
      const newAppointment = await appointmentAPI.create({
        patientId: userProfile.userId,
        clinicId: clinicId,
        doctorId: 1,
        dateTime: tomorrow.toISOString(),
        apptStatus: 'SCHEDULED'
      })
      
      setSuccess('Test appointment created successfully!')
      await fetchAppointments()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to create appointment')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentView = () => {
    if (location.pathname.includes('/appointments')) return 'appointments'
    if (location.pathname.includes('/queue')) return 'queue'
    if (location.pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const currentView = getCurrentView()

  return (
    <div className="patient-view">
      <Navbar />
      <div className="patient-layout">
        <Sidebar />
        <div className="patient-main">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {currentView === 'dashboard' && (
            <>
              <div className="page-header">
                <h1>Dashboard</h1>
                <p className="subtitle">Welcome back, {userProfile?.fname}!</p>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <h3>{stats.total}</h3>
                    <p>Total Appointments</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⏰</div>
                  <div className="stat-content">
                    <h3>{stats.upcoming}</h3>
                    <p>Upcoming</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <h3>{stats.completed}</h3>
                    <p>Completed</p>
                  </div>
                </div>
              </div>

              {queuePosition && selectedAppointment && (
                <div className="queue-status-card">
                  <h2>Current Queue Status</h2>
                  <div className="queue-status-content">
                    <div className="queue-position-large">
                      <span className="position-number">{queuePosition.position || 'N/A'}</span>
                      <span className="position-label">Your Position</span>
                    </div>
                    <div className="queue-details">
                      <p><strong>Total in Queue:</strong> {queuePosition.totalInQueue || 'N/A'}</p>
                      <p><strong>Status:</strong> {queuePosition.status || 'N/A'}</p>
                      <p><strong>Appointment ID:</strong> {selectedAppointment}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="section-card">
                <div className="section-header">
                  <h2>Recent Appointments</h2>
                  <button onClick={fetchAppointments} className="btn btn-secondary btn-sm">
                    Refresh
                  </button>
                </div>
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : appointments.length === 0 ? (
                  <div className="empty-state">
                    <p>No appointments found</p>
                    <button onClick={createTestAppointment} className="btn btn-primary">
                      Create Test Appointment
                    </button>
                  </div>
                ) : (
                  <div className="appointments-grid">
                    {appointments.slice(0, 3).map((apt) => (
                      <div key={apt.appointmentId} className="appointment-card">
                        <div className="appointment-header">
                          <span className="appointment-id">#{apt.appointmentId}</span>
                          <span className={`status-badge status-${apt.apptStatus?.toLowerCase() || 'pending'}`}>
                            {apt.apptStatus || 'PENDING'}
                          </span>
                        </div>
                        <div className="appointment-body">
                          <p className="appointment-date">
                            📅 {new Date(apt.dateTime).toLocaleDateString()}
                          </p>
                          <p className="appointment-time">
                            🕐 {new Date(apt.dateTime).toLocaleTimeString()}
                          </p>
                          <p className="appointment-clinic">🏥 Clinic ID: {apt.clinicId}</p>
                        </div>
                        <div className="appointment-actions">
                          <button
                            onClick={() => checkIn(apt.appointmentId)}
                            className="btn btn-primary btn-sm"
                            disabled={loading}
                          >
                            Check In
                          </button>
                          <button
                            onClick={() => checkQueuePosition(apt.appointmentId)}
                            className="btn btn-secondary btn-sm"
                            disabled={loading}
                          >
                            Check Queue
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {currentView === 'appointments' && (
            <>
              <div className="page-header">
                <h1>My Appointments</h1>
                <div className="header-actions">
                  <input
                    type="number"
                    placeholder="Clinic ID"
                    value={clinicId || ''}
                    onChange={(e) => setClinicId(Number(e.target.value))}
                    className="input-sm"
                  />
                  <button onClick={createTestAppointment} className="btn btn-primary">
                    Create Test Appointment
                  </button>
                  <button onClick={fetchAppointments} className="btn btn-secondary">
                    Refresh
                  </button>
                </div>
              </div>

              <div className="section-card">
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : appointments.length === 0 ? (
                  <div className="empty-state">
                    <p>No appointments found</p>
                  </div>
                ) : (
                  <div className="appointments-list">
                    {appointments.map((apt) => (
                      <div key={apt.appointmentId} className="appointment-card-large">
                        <div className="appointment-main">
                          <div className="appointment-header">
                            <h3>Appointment #{apt.appointmentId}</h3>
                            <span className={`status-badge status-${apt.apptStatus?.toLowerCase() || 'pending'}`}>
                              {apt.apptStatus || 'PENDING'}
                            </span>
                          </div>
                          <div className="appointment-details">
                            <div className="detail-item">
                              <span className="detail-label">Date & Time:</span>
                              <span className="detail-value">
                                {new Date(apt.dateTime).toLocaleString()}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Clinic ID:</span>
                              <span className="detail-value">{apt.clinicId}</span>
                            </div>
                            {apt.doctorId && (
                              <div className="detail-item">
                                <span className="detail-label">Doctor ID:</span>
                                <span className="detail-value">{apt.doctorId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="appointment-actions-vertical">
                          <button
                            onClick={() => checkIn(apt.appointmentId)}
                            className="btn btn-primary"
                            disabled={loading || apt.apptStatus === 'COMPLETED'}
                          >
                            Check In to Queue
                          </button>
                          <button
                            onClick={() => checkQueuePosition(apt.appointmentId)}
                            className="btn btn-secondary"
                            disabled={loading}
                          >
                            Check Queue Position
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAppointment(apt.appointmentId)
                              checkQueuePosition(apt.appointmentId)
                            }}
                            className="btn btn-outline"
                            disabled={loading}
                          >
                            View Queue Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {currentView === 'queue' && (
            <>
              <div className="page-header">
                <h1>Queue Status</h1>
                <button onClick={fetchAppointments} className="btn btn-secondary">
                  Refresh
                </button>
              </div>

              {selectedAppointment ? (
                <div className="section-card">
                  {queuePosition ? (
                    <>
                      <div className="queue-display-large">
                        <div className="queue-position-circle">
                          <span className="position-big">{queuePosition.position || 'N/A'}</span>
                          <span className="position-text">Position in Queue</span>
                        </div>
                        <div className="queue-stats">
                          <div className="queue-stat-item">
                            <span className="stat-label">Total in Queue</span>
                            <span className="stat-value">{queuePosition.totalInQueue || 'N/A'}</span>
                          </div>
                          <div className="queue-stat-item">
                            <span className="stat-label">Status</span>
                            <span className="stat-value">{queuePosition.status || 'N/A'}</span>
                          </div>
                          <div className="queue-stat-item">
                            <span className="stat-label">Appointment ID</span>
                            <span className="stat-value">{selectedAppointment}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAppointment(null)
                          setQueuePosition(null)
                        }}
                        className="btn btn-secondary"
                      >
                        Check Another Appointment
                      </button>
                    </>
                  ) : (
                    <div className="empty-state">
                      <p>Not in queue. Check in to an appointment first.</p>
                      <button
                        onClick={() => window.location.hash = '#appointments'}
                        className="btn btn-primary"
                      >
                        View Appointments
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="section-card">
                  <p>Select an appointment to view queue status</p>
                  <div className="appointments-grid">
                    {appointments.map((apt) => (
                      <button
                        key={apt.appointmentId}
                        onClick={() => checkQueuePosition(apt.appointmentId)}
                        className="appointment-card appointment-select"
                      >
                        Appointment #{apt.appointmentId}
                      </button>
                    ))}
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
                    <label>First Name</label>
                    <input type="text" value={userProfile?.fname || ''} disabled />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" value={userProfile?.lname || ''} disabled />
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
    </div>
  )
}
