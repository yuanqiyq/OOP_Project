import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { queueAPI, appointmentAPI } from '../lib/api'
import './StaffView.css'

export default function StaffView() {
  const { userProfile } = useAuth()
  const [clinicId, setClinicId] = useState(1) // Default clinic ID
  const [queue, setQueue] = useState([])
  const [currentServing, setCurrentServing] = useState(null)
  const [missed, setMissed] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchQueue()
    fetchCurrentlyServing()
    fetchMissed()
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchQueue()
      fetchCurrentlyServing()
    }, 10000)
    return () => clearInterval(interval)
  }, [clinicId])

  const fetchQueue = async () => {
    try {
      setLoading(true)
      const data = await queueAPI.getClinicQueue(clinicId)
      setQueue(data.queue || [])
      setError('')
    } catch (err) {
      setError('Failed to load queue')
      console.error(err)
    } finally {
      setLoading(false)
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

  const updateQueueStatus = async (queueId, status) => {
    try {
      setLoading(true)
      await queueAPI.updateStatus(queueId, status)
      setError('')
      await fetchQueue()
      await fetchCurrentlyServing()
      await fetchMissed()
    } catch (err) {
      setError(err.message || 'Failed to update queue status')
    } finally {
      setLoading(false)
    }
  }

  const requeuePatient = async (appointmentId, priority = 1) => {
    try {
      setLoading(true)
      await queueAPI.requeue(appointmentId, priority)
      setError('')
      await fetchQueue()
      await fetchMissed()
    } catch (err) {
      setError(err.message || 'Failed to requeue patient')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="staff-view">
      <header className="view-header">
        <h1>Staff Queue Management</h1>
        <p className="user-info">
          Staff: {userProfile?.fname} {userProfile?.lname}
        </p>
        <div className="clinic-selector">
          <label htmlFor="clinic-select">Clinic ID:</label>
          <input
            id="clinic-select"
            type="number"
            value={clinicId}
            onChange={(e) => setClinicId(Number(e.target.value))}
            min="1"
            className="clinic-input"
          />
          <button onClick={fetchQueue} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="staff-content">
        <section className="currently-serving-section">
          <h2>Currently Serving</h2>
          {currentServing?.status === 'QUEUE_EMPTY' ? (
            <div className="empty-state">No patient currently being served</div>
          ) : currentServing?.appointmentId ? (
            <div className="serving-card">
              <p>
                <strong>Appointment ID:</strong> {currentServing.appointmentId}
              </p>
              <p>
                <strong>Queue ID:</strong> {currentServing.queueId}
              </p>
              <button
                onClick={() => updateQueueStatus(currentServing.queueId, 'DONE')}
                className="btn btn-primary"
                disabled={loading}
              >
                Mark as Done
              </button>
            </div>
          ) : (
            <div className="empty-state">Loading...</div>
          )}
        </section>

        <section className="queue-section">
          <h2>Queue ({queue.length})</h2>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : queue.length === 0 ? (
            <div className="empty-state">Queue is empty</div>
          ) : (
            <div className="queue-list">
              {queue.map((entry, index) => (
                <div key={entry.queueId} className="queue-item">
                  <div className="queue-position">#{index + 1}</div>
                  <div className="queue-info">
                    <p>
                      <strong>Appointment ID:</strong> {entry.appointmentId}
                    </p>
                    <p>
                      <strong>Patient:</strong> {entry.patientName || 'N/A'}
                    </p>
                    <p>
                      <strong>Priority:</strong> {entry.priority}
                    </p>
                    <p>
                      <strong>Status:</strong> {entry.status}
                    </p>
                    <p>
                      <strong>Check-in Time:</strong>{' '}
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="queue-actions">
                    {index === 0 && (
                      <button
                        onClick={() => updateQueueStatus(entry.queueId, 'DONE')}
                        className="btn btn-success"
                        disabled={loading}
                      >
                        Mark Done
                      </button>
                    )}
                    <button
                      onClick={() => updateQueueStatus(entry.queueId, 'MISSED')}
                      className="btn btn-warning"
                      disabled={loading}
                    >
                      Mark Missed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {missed.length > 0 && (
          <section className="missed-section">
            <h2>Missed Patients ({missed.length})</h2>
            <div className="missed-list">
              {missed.map((entry) => (
                <div key={entry.queueId} className="missed-item">
                  <div className="missed-info">
                    <p>
                      <strong>Appointment ID:</strong> {entry.appointmentId}
                    </p>
                    <p>
                      <strong>Status:</strong> {entry.status}
                    </p>
                  </div>
                  <button
                    onClick={() => requeuePatient(entry.appointmentId)}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    Re-queue
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

