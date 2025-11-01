import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { queueAPI, appointmentAPI, clinicAPI } from '../lib/api'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { useLocation } from 'react-router-dom'
import './StaffView.css'

export default function StaffView() {
  const { userProfile } = useAuth()
  const location = useLocation()
  const [clinicId, setClinicId] = useState(969)
  const [queue, setQueue] = useState([])
  const [currentServing, setCurrentServing] = useState(null)
  const [missed, setMissed] = useState([])
  const [appointments, setAppointments] = useState([])
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [queueHistory, setQueueHistory] = useState(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null)

  useEffect(() => {
    fetchClinics()
    if (clinicId) {
      fetchQueue()
      fetchCurrentlyServing()
      fetchMissed()
      fetchAppointments()
    }
  }, [clinicId])

  useEffect(() => {
    if (autoRefresh && clinicId && location.pathname.includes('/staff') && !location.pathname.includes('/settings')) {
      const interval = setInterval(() => {
        fetchQueue()
        fetchCurrentlyServing()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, clinicId, location])

  const fetchClinics = async () => {
    try {
      const data = await clinicAPI.getAll()
      setClinics(data || [])
      if (data?.length > 0 && !clinicId) {
        setClinicId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch clinics', err)
    }
  }

  const fetchQueue = async () => {
    try {
      const data = await queueAPI.getClinicQueue(clinicId)
      setQueue(data.queue || [])
      setError('')
    } catch (err) {
      setError('Failed to load queue')
      console.error(err)
    }
  }

  const fetchCurrentlyServing = async () => {
    try {
      const data = await queueAPI.getCurrentlyServing(clinicId)
      setCurrentServing(data)
    } catch (err) {
      console.error('Failed to fetch currently serving', err)
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
      await fetchQueue()
      await fetchCurrentlyServing()
      await fetchMissed()
    } catch (err) {
      setError(err.message || 'Failed to update queue status')
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
      await fetchQueue()
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

  const getCurrentView = () => {
    if (location.pathname.includes('/appointments')) return 'appointments'
    if (location.pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const currentView = getCurrentView()
  const selectedClinic = clinics.find(c => c.id === clinicId)

  return (
    <div className="staff-view">
      <Navbar />
      <div className="staff-layout">
        <Sidebar />
        <div className="staff-main">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {currentView === 'dashboard' && (
            <>
              <div className="page-header">
                <div>
                  <h1>Queue Management</h1>
                  <p className="subtitle">
                    {selectedClinic ? selectedClinic.name : `Clinic ID: ${clinicId}`}
                  </p>
                </div>
                <div className="header-controls">
                  <div className="clinic-selector">
                    <label>Clinic:</label>
                    <select
                      value={clinicId}
                      onChange={(e) => setClinicId(Number(e.target.value))}
                      className="select-input"
                    >
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name} (ID: {clinic.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    <span>Auto Refresh</span>
                  </label>
                  <button onClick={fetchQueue} className="btn btn-secondary">
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
                  </div>
                ) : currentServing?.appointmentId ? (
                  <div className="serving-display">
                    <div className="serving-badge">
                      <span className="serving-label">NOW SERVING</span>
                      <span className="serving-id">#{currentServing.appointmentId}</span>
                    </div>
                    <div className="serving-actions">
                      <button
                        onClick={() => updateQueueStatus(currentServing.queueId, 'DONE')}
                        className="btn btn-success btn-large"
                        disabled={loading}
                      >
                        ✓ Mark as Done
                      </button>
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
                          {index === 0 && (
                            <button
                              onClick={() => updateQueueStatus(entry.queueId, 'DONE')}
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
                  <div className="clinic-selector">
                    <label>Clinic:</label>
                    <select
                      value={clinicId}
                      onChange={(e) => setClinicId(Number(e.target.value))}
                      className="select-input"
                    >
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name} (ID: {clinic.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button onClick={fetchAppointments} className="btn btn-secondary">
                    Refresh
                  </button>
                </div>
              </div>

              <div className="section-card">
                <div className="section-header">
                  <h2>Clinic Appointments ({appointments.length})</h2>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        fetchAppointments()
                        // Filter logic can be added here
                      }
                    }}
                    className="select-input"
                  >
                    <option value="">All Status</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
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
                                  onClick={() => updateAppointmentStatus(apt.appointmentId, 'COMPLETED')}
                                  className="btn btn-success btn-sm"
                                  disabled={loading || apt.apptStatus === 'COMPLETED'}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => updateAppointmentStatus(apt.appointmentId, 'CANCELLED')}
                                  className="btn btn-warning btn-sm"
                                  disabled={loading || apt.apptStatus === 'CANCELLED'}
                                >
                                  ✕
                                </button>
                                <button
                                  onClick={() => fetchQueueHistory(apt.appointmentId)}
                                  className="btn btn-outline btn-sm"
                                  disabled={loading}
                                >
                                  📋
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
                  <div className="form-group">
                    <label>Clinic Assignment</label>
                    <select
                      value={clinicId}
                      onChange={(e) => setClinicId(Number(e.target.value))}
                      className="select-input"
                    >
                      {clinics.map(clinic => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </option>
                      ))}
                    </select>
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
