import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { adminAPI } from '../lib/api'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import { useNavigate } from 'react-router-dom'
import './PatientProfile.css'

export default function PatientProfile() {
  const { userProfile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [patientData, setPatientData] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    emergencyContact: '',
    emergencyContactPhone: '',
    medicalHistory: '',
    allergies: '',
    bloodType: ''
  })

  useEffect(() => {
    if (userProfile && !authLoading) {
      fetchPatientData()
    }
  }, [userProfile, authLoading])

  const fetchPatientData = async () => {
    try {
      setLoading(true)
      const patientId = userProfile?.patientId || userProfile?.userId
      if (!patientId) {
        showToast('Unable to load patient data: Patient ID not found', 'error')
        return
      }
      
      const data = await adminAPI.getPatientById(patientId)
      setPatientData(data)
      
      // Populate form with existing data
      setFormData({
        emergencyContact: data.emergencyContact || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        medicalHistory: data.medicalHistory || '',
        allergies: data.allergies || '',
        bloodType: data.bloodType || ''
      })
    } catch (err) {
      showToast('Failed to load patient data', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      const patientId = userProfile?.patientId || userProfile?.userId
      if (!patientId) {
        showToast('Unable to update: Patient ID not found', 'error')
        return
      }

      // Prepare update data - only include fields that can be updated
      const updateData = {
        emergencyContact: formData.emergencyContact || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
        medicalHistory: formData.medicalHistory || null,
        allergies: formData.allergies || null,
        bloodType: formData.bloodType || null
      }

      await adminAPI.updatePatient(patientId, updateData)
      showToast('Profile updated successfully!', 'success')
      
      // Refresh patient data
      await fetchPatientData()
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Show loading state while auth is loading or userProfile is not ready
  if (authLoading || !userProfile) {
    return (
      <div className="patient-profile-view">
        <Navbar />
        <div className="patient-profile-layout">
          <div className="patient-profile-main">
            <div className="loading">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="patient-profile-view">
      <Navbar />
      <div className="patient-profile-layout">
        <div className="patient-profile-main">
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
              duration={3000}
            />
          )}

          <div className="page-header">
            <button 
              onClick={() => navigate('/patient')} 
              className="back-btn"
            >
              ← Back
            </button>
            <h1>Profile</h1>
            <p className="subtitle">Update your patient information</p>
          </div>

          <div className="section-card">
            <h2>Patient Information</h2>
            {loading && !patientData ? (
              <div className="loading">Loading...</div>
            ) : (
              <form onSubmit={handleSubmit} className="profile-form">
                <div className="form-group">
                  <label htmlFor="emergencyContact">Emergency Contact Name</label>
                  <input
                    type="text"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Enter emergency contact name"
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="emergencyContactPhone">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    placeholder="Enter emergency contact phone"
                    pattern="^[+]?[0-9\s\-()]{8,20}$"
                  />
                  <small className="form-hint">Format: +65 92345678 or 92345678</small>
                </div>

                <div className="form-group">
                  <label htmlFor="medicalHistory">Medical History</label>
                  <textarea
                    id="medicalHistory"
                    name="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={handleInputChange}
                    placeholder="Enter your medical history"
                    rows={6}
                    maxLength={2000}
                  />
                  <small className="form-hint">Maximum 2000 characters</small>
                </div>

                <div className="form-group">
                  <label htmlFor="allergies">Allergies</label>
                  <textarea
                    id="allergies"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    placeholder="Enter any allergies or reactions"
                    rows={4}
                    maxLength={1000}
                  />
                  <small className="form-hint">Maximum 1000 characters</small>
                </div>

                <div className="form-group">
                  <label htmlFor="bloodType">Blood Type</label>
                  <select
                    id="bloodType"
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                  >
                    <option value="">Select blood type</option>
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

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/patient')}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

