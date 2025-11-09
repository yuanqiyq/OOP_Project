import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { queueAPI, adminAPI } from '../lib/api'
import './StaffDisplay.css'

export default function StaffDisplay() {
  const { userProfile } = useAuth()
  const [clinicId, setClinicId] = useState(null)
  const [clinicName, setClinicName] = useState('')
  const [currentServing, setCurrentServing] = useState(null)
  const [queue, setQueue] = useState([])
  const [missed, setMissed] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (userProfile?.email) {
      fetchStaffClinic()
    }
  }, [userProfile])

  useEffect(() => {
    if (clinicId) {
      fetchQueue()
      fetchCurrentlyServing()
      fetchMissed()
      const interval = setInterval(() => {
        fetchQueue()
        fetchCurrentlyServing()
        fetchMissed()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [clinicId])

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

  return (
    <div className="staff-display">
      <div className="display-header">
        <h1>{clinicName || `Clinic ID: ${clinicId}`}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Currently Serving */}
      <div className="display-section serving-section">
        <h2>Currently Serving</h2>
        {currentServing?.status === 'QUEUE_EMPTY' ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No patient currently being served</p>
          </div>
        ) : currentServing?.appointmentId ? (
          <div className="serving-display-large">
            <div className="serving-badge-large">
              <span className="serving-label-large">NOW SERVING</span>
              <span className="serving-id-large">#{currentServing.appointmentId}</span>
            </div>
          </div>
        ) : (
          <div className="loading">Loading...</div>
        )}
      </div>

      <div className="display-sections-container">
        {/* Queue List */}
        <div className="display-section queue-section">
          <h2>Queue ({queue.length})</h2>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : queue.length === 0 ? (
            <div className="empty-state">Queue is empty</div>
          ) : (
            <div className="queue-list-display">
              {queue.map((entry, index) => (
                <div key={entry.queueId} className={`queue-item-display ${index === 0 ? 'next-up' : ''}`}>
                  <div className="queue-position">{index + 1}</div>
                  <div className="queue-info">
                    <div className="queue-appointment-id">Appointment #{entry.appointmentId}</div>
                    <div className="queue-patient-name">{entry.patientName || 'N/A'}</div>
                  </div>
                  {index === 0 && <div className="next-badge">Next</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missed Patients */}
        <div className="display-section missed-section">
          <h2>Missed ({missed.length})</h2>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : missed.length === 0 ? (
            <div className="empty-state">No missed patients</div>
          ) : (
            <div className="missed-list-display">
              {missed.map((entry) => (
                <div key={entry.queueId} className="missed-item-display">
                  <div className="missed-info">
                    <div className="missed-appointment-id">Appointment #{entry.appointmentId}</div>
                    <div className="missed-patient-name">{entry.patientName || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

