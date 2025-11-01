import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { appointmentAPI, queueAPI } from '../lib/api'
import './PatientView.css'

export default function PatientView() {
  const { userProfile } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [queuePosition, setQueuePosition] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (userProfile?.userId) {
      fetchAppointments()
    }
  }, [userProfile])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      // Note: This assumes patient_id matches user_id
      const data = await appointmentAPI.getByPatientId(userProfile.userId)
      setAppointments(data || [])
    } catch (err) {
      setError('Failed to load appointments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const checkQueuePosition = async (appointmentId) => {
    try {
      setLoading(true)
      const position = await queueAPI.getQueuePosition(appointmentId)
      setQueuePosition(position)
      setSelectedAppointment(appointmentId)
    } catch (err) {
      setError('Failed to get queue position')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const checkIn = async (appointmentId, priority = 1) => {
    try {
      setLoading(true)
      await queueAPI.checkIn(appointmentId, priority)
      setError('')
      alert('Successfully checked in to queue!')
      await checkQueuePosition(appointmentId)
    } catch (err) {
      setError(err.message || 'Failed to check in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="patient-view">
      <header className="view-header">
        <h1>Patient Dashboard</h1>
        <p className="user-info">
          Welcome, {userProfile?.fname} {userProfile?.lname}
        </p>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="patient-content">
        <section className="appointments-section">
          <h2>My Appointments</h2>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : appointments.length === 0 ? (
            <p className="empty-state">No appointments found</p>
          ) : (
            <div className="appointments-list">
              {appointments.map((apt) => (
                <div key={apt.appointmentId} className="appointment-card">
                  <div className="appointment-info">
                    <h3>Appointment #{apt.appointmentId}</h3>
                    <p>
                      <strong>Status:</strong> {apt.apptStatus || 'PENDING'}
                    </p>
                    <p>
                      <strong>Date:</strong>{' '}
                      {new Date(apt.dateTime).toLocaleString()}
                    </p>
                    <p>
                      <strong>Clinic ID:</strong> {apt.clinicId}
                    </p>
                  </div>
                  <div className="appointment-actions">
                    <button
                      onClick={() => checkIn(apt.appointmentId)}
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      Check In
                    </button>
                    <button
                      onClick={() => checkQueuePosition(apt.appointmentId)}
                      className="btn btn-secondary"
                      disabled={loading}
                    >
                      Check Position
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {queuePosition && selectedAppointment && (
          <section className="queue-section">
            <h2>Queue Status</h2>
            <div className="queue-info">
              <p>
                <strong>Position:</strong> {queuePosition.position || 'N/A'}
              </p>
              <p>
                <strong>Total in Queue:</strong>{' '}
                {queuePosition.totalInQueue || 'N/A'}
              </p>
              <p>
                <strong>Status:</strong> {queuePosition.status || 'N/A'}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

