import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { queueAPI, appointmentAPI, clinicAPI, adminAPI, doctorAPI, reportAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import { useLocation } from 'react-router-dom'
import './StaffView.css'

export default function StaffView() {
  const { userProfile, setIgnoreAuthChanges, setOriginalSession } = useAuth()
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
  const [toast, setToast] = useState(null)
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
  
  // Priority selection modal state for requeue
  const [showRequeuePriorityModal, setShowRequeuePriorityModal] = useState(false)
  const [selectedAppointmentForRequeue, setSelectedAppointmentForRequeue] = useState(null)
  const [requeuePriority, setRequeuePriority] = useState(1)
  
  // Cancel confirmation modal state for missed appointments
  const [showCancelConfirmationModal, setShowCancelConfirmationModal] = useState(false)
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState(null)
  
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
  const [selectedPatientDetails, setSelectedPatientDetails] = useState(null)
  const [patientAppointmentsHistory, setPatientAppointmentsHistory] = useState([])
  const [expandedMedicalHistoryAppointmentId, setExpandedMedicalHistoryAppointmentId] = useState(null)
  
  // Treatment summary modal state
  const [showTreatmentSummaryModal, setShowTreatmentSummaryModal] = useState(false)
  const [selectedAppointmentForSummary, setSelectedAppointmentForSummary] = useState(null)
  
  // Filter state
  const [filterDate, setFilterDate] = useState('')
  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterDoctorSearch, setFilterDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)

  // Reschedule state
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null)

  // Booking modal state
  const [clinics, setClinics] = useState([])
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])
  const [existingAppointments, setExistingAppointments] = useState([])
  const [showBookingModal, setShowBookingModal] = useState(false)

  // Report state
  const [reportDate, setReportDate] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)

  // Manual check-in modal state
  const [showManualCheckInModal, setShowManualCheckInModal] = useState(false)
  const [manualCheckInStep, setManualCheckInStep] = useState('search') // 'search' | 'existing' | 'new' | 'appointment'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedPatientForCheckIn, setSelectedPatientForCheckIn] = useState(null)
  const [newPatientFormData, setNewPatientFormData] = useState({
    email: '',
    fname: '',
    lname: '',
    patientIc: '',
    dateOfBirth: '',
    gender: '',
  })
  const [checkInAppointmentData, setCheckInAppointmentData] = useState({
    doctorId: null,
    date: '',
    timeSlot: null,
    priority: 1,
  })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [availableTimeSlots, setAvailableTimeSlots] = useState([])
  const [checkInExistingAppointments, setCheckInExistingAppointments] = useState([])

  // Helper function to show toast notifications
  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type, duration })
  }

  // Helper function to get priority label
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1:
        return 'Normal'
      case 2:
        return 'Elderly'
      case 3:
        return 'Emergency'
      default:
        return `Priority ${priority}`
    }
  }

  // Generate secure random password
  const generatePassword = () => {
    const length = 16
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    password += '0123456789'[Math.floor(Math.random() * 10)]
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  // Search for patient by name or IC
  const searchPatient = async () => {
    if (!searchQuery.trim()) {
      showToast('Please enter a name or IC number', 'error')
      return
    }

    try {
      setLoading(true)
      setHasSearched(true)
      const query = searchQuery.trim().toLowerCase()
      
      // Search in patients list by name or IC
      const allPatients = await adminAPI.getPatients()
      const found = allPatients.filter(p => {
        const fullName = `${p.fname || ''} ${p.lname || ''}`.toLowerCase().trim()
        const ic = p.patientIc?.toLowerCase() || ''
        return fullName.includes(query) || ic.includes(query)
      })
      
      setSearchResults(found)
      // Don't auto-select, let user choose
      setSelectedPatientForCheckIn(null)
    } catch (err) {
      console.error('Error searching patient:', err)
      showToast(err.message || 'Failed to search patient', 'error')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  // Reset manual check-in modal
  const resetManualCheckInModal = () => {
    setShowManualCheckInModal(false)
    setManualCheckInStep('search')
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setSelectedPatientForCheckIn(null)
    setNewPatientFormData({
      email: '',
      fname: '',
      lname: '',
      patientIc: '',
      dateOfBirth: '',
      gender: '',
    })
    setCheckInAppointmentData({
      doctorId: null,
      date: getTodayDate(),
      timeSlot: null,
      priority: 1,
    })
    setGeneratedPassword('')
    setAvailableTimeSlots([])
    setCheckInExistingAppointments([])
    setLoading(false) // Ensure loading is reset
  }

  // Generate time slots for selected doctor and date
  const generateCheckInTimeSlots = async () => {
    if (!checkInAppointmentData.doctorId || !checkInAppointmentData.date || !clinicId) return

    try {
      const doctor = doctors.find(d => d.id === checkInAppointmentData.doctorId)
      if (!doctor) return

      const clinic = clinics.find(c => c.id === clinicId)
      if (!clinic) return

      const date = new Date(checkInAppointmentData.date)
      const dayOfWeek = date.getDay()
      const isSaturday = dayOfWeek === 6
      const isSunday = dayOfWeek === 0
      const isPublicHoliday = false

      const intervalMinutes = clinic.apptIntervalMin || 15
      let slots = []

      let startTime, endTime, pmStartTime, pmEndTime

      if (isPublicHoliday) {
        startTime = clinic.phAmStart
        endTime = clinic.phAmEnd
        pmStartTime = clinic.phPmStart
        pmEndTime = clinic.phPmEnd
      } else if (isSaturday) {
        startTime = clinic.satAmStart
        endTime = clinic.satAmEnd
        pmStartTime = clinic.satPmStart
        pmEndTime = clinic.satPmEnd
      } else if (isSunday) {
        startTime = clinic.sunAmStart
        endTime = clinic.sunAmEnd
        pmStartTime = clinic.sunPmStart
        pmEndTime = clinic.sunPmEnd
      } else {
        startTime = clinic.monFriAmStart
        endTime = clinic.monFriAmEnd
        pmStartTime = clinic.monFriPmStart
        pmEndTime = clinic.monFriPmEnd
      }

      // Generate AM slots
      if (startTime && endTime) {
        const amSlots = generateSlotsForPeriod(startTime, endTime, intervalMinutes, date)
        slots.push(...amSlots)
      }

      // Generate PM slots
      if (pmStartTime && pmEndTime) {
        const pmSlots = generateSlotsForPeriod(pmStartTime, pmEndTime, intervalMinutes, date)
        slots.push(...pmSlots)
      }

      // Fetch existing appointments for the date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const clinicAppointments = await appointmentAPI.getByClinicId(clinicId)
      const dayAppointments = clinicAppointments.filter(apt => {
        const aptDate = new Date(apt.dateTime)
        return aptDate >= startOfDay && aptDate <= endOfDay
      })

      setCheckInExistingAppointments(dayAppointments)
      setAvailableTimeSlots(slots)
    } catch (err) {
      console.error('Error generating time slots:', err)
      showToast('Failed to generate time slots', 'error')
    }
  }

  // Get appointment count for a slot
  const getCheckInAppointmentCountForSlot = (slotDatetime) => {
    if (!checkInAppointmentData.doctorId || !clinicId) return 0
    
    return checkInExistingAppointments.filter(apt => {
      const aptDate = new Date(apt.dateTime)
      const slotDate = new Date(slotDatetime)
      const status = apt.apptStatus?.toUpperCase() || ''
      
      return apt.doctorId === checkInAppointmentData.doctorId &&
             apt.clinicId === clinicId &&
             aptDate.getHours() === slotDate.getHours() && 
             aptDate.getMinutes() === slotDate.getMinutes() &&
             status === 'SCHEDULED'
    }).length
  }

  // Check if slot is available
  const isCheckInSlotAvailable = (slot) => {
    const count = getCheckInAppointmentCountForSlot(slot.datetime)
    return count < 3
  }

  // Create patient account and check in
  const handleManualCheckIn = async () => {
    if (!selectedPatientForCheckIn && manualCheckInStep !== 'appointment') {
      showToast('Please select or create a patient', 'error')
      return
    }

    if (!checkInAppointmentData.doctorId || !checkInAppointmentData.date || !checkInAppointmentData.timeSlot) {
      showToast('Please select date and time slot', 'error')
      return
    }

    try {
      setLoading(true)
      let patientId = null
      let password = ''

      // If new patient (appointment step without selectedPatientForCheckIn), create account
      if (manualCheckInStep === 'appointment' && !selectedPatientForCheckIn) {
        // Validate required fields
        if (!newPatientFormData.email || !newPatientFormData.fname || !newPatientFormData.lname || 
            !newPatientFormData.patientIc || !newPatientFormData.dateOfBirth || !newPatientFormData.gender) {
          showToast('Please fill in all required fields', 'error')
          setLoading(false)
          return
        }

        // Generate password
        password = generatePassword()
        setGeneratedPassword(password)

        // Get current session to restore it after creating the new user
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !currentSession) {
          throw new Error('No active session. Please sign in again.')
        }

        // Set flag to ignore auth state changes during user creation
        setOriginalSession(currentSession)
        setIgnoreAuthChanges(true)

        // Create Supabase Auth account
        console.log('Creating Supabase Auth account for:', newPatientFormData.email)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: newPatientFormData.email,
          password: password,
          options: {
            emailRedirectTo: window.location.origin + '/auth',
          },
        })

        if (authError) {
          console.error('Supabase Auth signup error:', authError)
          throw new Error(`Failed to create auth account: ${authError.message}`)
        }
        if (!authData.user) {
          console.error('No user returned from signup')
          throw new Error('Failed to create user in Supabase Auth')
        }

        console.log('Auth account created successfully, user ID:', authData.user.id)

        // Immediately restore the original staff session BEFORE creating patient record
        console.log('Restoring staff session...')
        const { error: sessionRestoreError } = await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        })

        if (sessionRestoreError) {
          console.error('Failed to restore staff session:', sessionRestoreError)
          throw new Error(`Failed to restore staff session: ${sessionRestoreError.message}`)
        }

        // Small delay to ensure session is restored before proceeding
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Verify session is restored
        const { data: { session: restoredSession } } = await supabase.auth.getSession()
        if (!restoredSession || restoredSession.user.id !== currentSession.user.id) {
          throw new Error('Failed to verify staff session restoration')
        }
        console.log('Staff session restored successfully')

        // Create patient record
        console.log('Creating patient record in backend...')
        let createdPatient
        try {
          createdPatient = await adminAPI.createPatient({
            authUuid: authData.user.id,
            email: newPatientFormData.email,
            fname: newPatientFormData.fname,
            lname: newPatientFormData.lname,
            role: 'PATIENT',
            patientIc: newPatientFormData.patientIc,
            dateOfBirth: newPatientFormData.dateOfBirth,
            gender: newPatientFormData.gender,
          })
          console.log('Patient record created:', createdPatient)
        } catch (patientError) {
          console.error('Failed to create patient record:', patientError)
          throw new Error(`Failed to create patient record: ${patientError.message || patientError}`)
        }

        // Send password reset email AFTER patient record is created
        console.log('Sending password reset email...')
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(newPatientFormData.email, {
          redirectTo: window.location.origin + '/auth',
        })
        if (resetError) {
          console.warn('Failed to send password reset email:', resetError)
          // Don't throw, just warn - password is already generated and will be shown
        } else {
          console.log('Password reset email sent successfully')
        }

        // Patient extends User, so it has userId. patientId is the same as userId for Patient entities
        patientId = createdPatient.userId || createdPatient.patientId || createdPatient.id
        console.log('Created patient object:', createdPatient)
        console.log('Extracted patientId:', patientId)
        if (!patientId) {
          console.error('Failed to extract patientId. Created patient object:', JSON.stringify(createdPatient, null, 2))
          throw new Error('Failed to get patient ID after account creation')
        }
        setIgnoreAuthChanges(false)
      } else {
        // For existing patients, try userId first (since Patient extends User)
        patientId = selectedPatientForCheckIn.userId || selectedPatientForCheckIn.patientId || selectedPatientForCheckIn.id
        console.log('Selected patient object:', selectedPatientForCheckIn)
        console.log('Extracted patientId:', patientId)
        if (!patientId) {
          console.error('Failed to extract patientId. Selected patient object:', JSON.stringify(selectedPatientForCheckIn, null, 2))
          throw new Error('Patient ID not found')
        }
      }

      // Validate all required data before creating appointment
      if (!patientId || !clinicId || !checkInAppointmentData.doctorId || !checkInAppointmentData.timeSlot) {
        console.error('Missing required information:', {
          patientId,
          clinicId,
          doctorId: checkInAppointmentData.doctorId,
          timeSlot: checkInAppointmentData.timeSlot
        })
        throw new Error('Missing required information: patientId, clinicId, doctorId, or timeSlot')
      }

      // Create appointment
      const appointmentDateTime = new Date(checkInAppointmentData.timeSlot.datetime)
      const year = appointmentDateTime.getFullYear()
      const month = String(appointmentDateTime.getMonth() + 1).padStart(2, '0')
      const day = String(appointmentDateTime.getDate()).padStart(2, '0')
      const hours = String(appointmentDateTime.getHours()).padStart(2, '0')
      const minutes = String(appointmentDateTime.getMinutes()).padStart(2, '0')
      const seconds = String(appointmentDateTime.getSeconds()).padStart(2, '0')
      const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`

      console.log('Creating appointment with:', {
        patientId,
        clinicId,
        doctorId: checkInAppointmentData.doctorId,
        dateTime: localDateTimeString
      })

      const newAppointment = await appointmentAPI.create({
        patientId: Number(patientId), // Ensure it's a number
        clinicId: Number(clinicId), // Ensure it's a number
        doctorId: Number(checkInAppointmentData.doctorId), // Ensure it's a number
        dateTime: localDateTimeString,
        apptStatus: 'SCHEDULED'
      })

      console.log('Appointment created:', newAppointment)

      if (!newAppointment || !newAppointment.appointmentId) {
        throw new Error('Failed to create appointment or get appointment ID')
      }

      // Check into queue
      const appointmentId = newAppointment.appointmentId || newAppointment.id
      console.log('Checking into queue with:', {
        appointmentId: appointmentId,
        priority: checkInAppointmentData.priority,
        fullAppointmentObject: newAppointment
      })

      if (!appointmentId) {
        console.error('Failed to get appointmentId from created appointment:', newAppointment)
        throw new Error('Failed to get appointment ID after creating appointment')
      }

      await queueAPI.checkIn(Number(appointmentId), checkInAppointmentData.priority)

      console.log('Queue check-in successful')

      // Refresh queue and appointments first
      await fetchQueue()
      await fetchAppointments()

      // Show success message with password if new account was created
      if (password) {
        // Keep modal open to show password
        setGeneratedPassword(password)
        showToast('Account created and patient checked in! See password below.', 'success', 5000)
        
        // Also log it for staff reference
        console.log('=== NEW PATIENT ACCOUNT CREATED ===')
        console.log('Email:', newPatientFormData.email)
        console.log('Generated Password:', password)
        console.log('===================================')
        
        // Don't close modal yet - let staff see the password
        // They can close it manually
      } else {
        showToast('Patient checked in successfully!', 'success')
        resetManualCheckInModal()
      }
    } catch (err) {
      console.error('Error during manual check-in:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to check in patient'
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Global ESC key handler to close all modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Close all modals
        if (showTreatmentModal) {
          setShowTreatmentModal(false)
          setSelectedAppointmentForTreatment(null)
          setSelectedQueueIdForTreatment(null)
          setTreatmentSummaryText('')
        }
        if (showPriorityModal) {
          setShowPriorityModal(false)
          setSelectedAppointmentForCheckIn(null)
          setCheckInPriority(1)
        }
        if (showRequeuePriorityModal) {
          setShowRequeuePriorityModal(false)
          setSelectedAppointmentForRequeue(null)
          setRequeuePriority(1)
        }
        if (showCancelConfirmationModal) {
          setShowCancelConfirmationModal(false)
          setSelectedAppointmentForCancel(null)
        }
        if (showMedicalHistoryModal) {
          setShowMedicalHistoryModal(false)
          setSelectedPatientForHistory(null)
          setSelectedPatientDetails(null)
          setPatientAppointmentsHistory([])
        }
        if (showManualCheckInModal) {
          resetManualCheckInModal()
        }
        if (showTreatmentSummaryModal) {
          setShowTreatmentSummaryModal(false)
          setSelectedAppointmentForSummary(null)
        }
        if (showAddDoctorModal) {
          setShowAddDoctorModal(false)
          setNewDoctor({ fname: '', lname: '', shiftDays: [] })
        }
        if (showEditDoctorModal) {
          setShowEditDoctorModal(false)
          setEditingDoctor(null)
        }
        if (showBookingModal) {
          closeBookingModal()
        }
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showTreatmentModal, showPriorityModal, showRequeuePriorityModal, showCancelConfirmationModal, showMedicalHistoryModal, showTreatmentSummaryModal, showAddDoctorModal, showEditDoctorModal, showBookingModal, showManualCheckInModal])

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
      fetchClinics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  // Auto-select doctor when date is selected for manual check-in
  useEffect(() => {
    if (checkInAppointmentData.date && clinicId && showManualCheckInModal && manualCheckInStep !== 'search') {
      const availableDoctors = getDoctorsForDate(checkInAppointmentData.date, clinicId)
      if (availableDoctors.length > 0 && !checkInAppointmentData.doctorId) {
        setCheckInAppointmentData({ ...checkInAppointmentData, doctorId: availableDoctors[0].id, timeSlot: null })
      } else if (availableDoctors.length === 0) {
        // No doctor available on this date
        setCheckInAppointmentData({ ...checkInAppointmentData, doctorId: null, timeSlot: null })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInAppointmentData.date, clinicId, showManualCheckInModal, manualCheckInStep])

  // Generate time slots for manual check-in when doctor or date changes
  useEffect(() => {
    if (checkInAppointmentData.doctorId && checkInAppointmentData.date && clinicId && showManualCheckInModal) {
      generateCheckInTimeSlots()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInAppointmentData.doctorId, checkInAppointmentData.date, clinicId, showManualCheckInModal])

  // Auto-populate doctor when date is selected (only if no doctor selected or current doctor doesn't work that day)
  useEffect(() => {
    if (selectedDate && selectedClinic && showBookingModal) {
      const dayOfWeek = getDayOfWeek(selectedDate)
      // If a doctor is selected but doesn't work on this day, clear it
      if (selectedDoctor && (!selectedDoctor.shiftDays || !selectedDoctor.shiftDays.includes(dayOfWeek))) {
        setSelectedDoctor(null)
      }
      // If no doctor selected, auto-select first available
      if (!selectedDoctor) {
        const availableDoctors = getDoctorsForDate(selectedDate, selectedClinic.id)
        if (availableDoctors.length > 0) {
          setSelectedDoctor(availableDoctors[0])
        }
      }
    }
  }, [selectedDate, selectedClinic, showBookingModal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-populate date when doctor is selected (only if no date selected or current date doesn't match)
  useEffect(() => {
    if (selectedDoctor && selectedClinic && showBookingModal) {
      const dayOfWeek = selectedDate ? getDayOfWeek(selectedDate) : null
      // If a date is selected but doctor doesn't work that day, clear it
      if (selectedDate && (!selectedDoctor.shiftDays || !selectedDoctor.shiftDays.includes(dayOfWeek))) {
        setSelectedDate('')
        setSelectedTimeSlot(null)
        setTimeSlots([])
      }
      // If no date selected, auto-select first available
      if (!selectedDate) {
        const availableDates = getAvailableDatesForDoctor(selectedDoctor)
        if (availableDates.length > 0) {
          setSelectedDate(availableDates[0])
        }
      }
    }
  }, [selectedDoctor, selectedClinic, showBookingModal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Generate time slots when clinic, date, or doctor are selected
  useEffect(() => {
    if (selectedClinic && selectedDate && showBookingModal) {
      generateTimeSlots()
      fetchExistingAppointments()
    }
  }, [selectedClinic, selectedDate, selectedDoctor, showBookingModal])

  // Auto-select the original appointment's time slot when rescheduling
  useEffect(() => {
    if (appointmentToReschedule && timeSlots.length > 0 && !selectedTimeSlot && selectedDate) {
      const originalDateTime = new Date(appointmentToReschedule.dateTime)
      const originalDateStr = originalDateTime.toISOString().split('T')[0]
      
      // Only auto-select if the selected date matches the original appointment date
      if (selectedDate === originalDateStr) {
        const originalHour = originalDateTime.getHours()
        const originalMinute = originalDateTime.getMinutes()
        
        // Find the slot that matches the original appointment's time
        const matchingSlot = timeSlots.find(slot => {
          const slotDate = new Date(slot.datetime)
          return slotDate.getHours() === originalHour && slotDate.getMinutes() === originalMinute
        })
        
        if (matchingSlot) {
          setSelectedTimeSlot(matchingSlot)
        }
      }
    }
  }, [appointmentToReschedule, timeSlots, selectedTimeSlot, selectedDate])

  useEffect(() => {
    if (autoRefresh && clinicId && location.pathname.includes('/staff') && !location.pathname.includes('/settings')) {
      const interval = setInterval(() => {
        fetchQueue(false) // Don't show errors for auto-refresh
        fetchCurrentlyServing()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, clinicId, location])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      const isInsideDropdown = target.closest('.searchable-dropdown') || 
                               target.closest('.dropdown-menu') ||
                               target.closest('.dropdown-item') ||
                               target.closest('.clear-filter-btn')
      
      if (!isInsideDropdown) {
        setShowDoctorDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('click', handleClickOutside, true)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [])

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
    } catch (err) {
      console.error('Failed to load queue:', err)
      // Only show error if explicitly requested (user-initiated refresh)
      if (showError) {
        showToast('Failed to load queue', 'error')
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

  const fetchClinics = async () => {
    try {
      const data = await clinicAPI.getAll()
      setClinics(data || [])
    } catch (err) {
      console.error('Failed to fetch clinics', err)
    }
  }

  const fetchQueueHistory = async (appointmentId) => {
    try {
      setLoading(true)
      const data = await queueAPI.getAppointmentHistory(appointmentId)
      setQueueHistory(data)
      setSelectedAppointmentId(appointmentId)
    } catch (err) {
      showToast('Failed to load queue history', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateQueueStatus = async (queueId, status) => {
    try {
      setLoading(true)
      await queueAPI.updateStatus(queueId, status)
      showToast(`Queue entry marked as ${status}`, 'success')
      await fetchQueue(false)
      await fetchCurrentlyServing()
      await fetchMissed()
      // If marking as MISSED, also refresh appointments to update appointment status
      if (status === 'MISSED') {
        await fetchAppointments()
      }
    } catch (err) {
      showToast(err.message || 'Failed to update queue status', 'error')
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
      showToast('Appointment done!', 'success')
      
      // Refresh data to remove from queue and update display
      await fetchQueue(false)
      await fetchCurrentlyServing()
      await fetchMissed()
      await fetchAppointments()
    } catch (err) {
      console.error('Error completing appointment:', err)
      showToast(err.message || 'Failed to complete appointment', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openRequeueModal = (appointmentId) => {
    setSelectedAppointmentForRequeue(appointmentId)
    setRequeuePriority(1) // Default to normal priority
    setShowRequeuePriorityModal(true)
  }

  const requeuePatient = async (appointmentId, priority = 1) => {
    try {
      setLoading(true)
      await queueAPI.requeue(appointmentId, priority)
      showToast('Patient re-queued successfully', 'success')
      
      // Close modal and reset state
      setShowRequeuePriorityModal(false)
      setSelectedAppointmentForRequeue(null)
      setRequeuePriority(1)
      
      await fetchQueue(false)
      await fetchMissed()
    } catch (err) {
      showToast(err.message || 'Failed to requeue patient', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRequeueWithPriority = async () => {
    if (!selectedAppointmentForRequeue) return
    await requeuePatient(selectedAppointmentForRequeue, requeuePriority)
  }

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      setLoading(true)
      await appointmentAPI.updateStatus(appointmentId, status)
      showToast(`Appointment status updated to ${status}`, 'success')
      await fetchAppointments()
    } catch (err) {
      showToast(err.message || 'Failed to update appointment status', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Mark appointment as NO_SHOW (for appointments that never showed up)
  const markAppointmentAsMissed = async (appointmentId) => {
    try {
      setLoading(true)
      await appointmentAPI.updateStatus(appointmentId, 'no-show')
      showToast('Appointment marked as no-show', 'success')
      await fetchAppointments()
    } catch (err) {
      showToast(err.message || 'Failed to mark appointment as no-show', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Cancel appointment (bypasses 24h restriction for staff)
  // Opens confirmation modal instead of using window.confirm
  const cancelAppointment = (appointmentId) => {
    openCancelConfirmationModal(appointmentId)
  }

  // Open cancel confirmation modal for missed appointment
  const openCancelConfirmationModal = (appointmentId) => {
    setSelectedAppointmentForCancel(appointmentId)
    setShowCancelConfirmationModal(true)
  }

  // Cancel appointment with confirmation (works for both missed and waiting-to-check-in)
  const cancelMissedAppointment = async () => {
    if (!selectedAppointmentForCancel) return
    
    try {
      setLoading(true)
      await appointmentAPI.updateStatus(selectedAppointmentForCancel, 'CANCELLED')
      showToast('Appointment cancelled successfully', 'success')
      
      // Close modal and reset state
      setShowCancelConfirmationModal(false)
      setSelectedAppointmentForCancel(null)
      
      await fetchAppointments()
      await fetchMissed()
    } catch (err) {
      showToast(err.message || 'Failed to cancel appointment', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Apply filters to appointments
  const applyFilters = (aptList) => {
    let filtered = aptList

    // Filter by doctor
    if (filterDoctor) {
      filtered = filtered.filter(apt => apt.doctorId === parseInt(filterDoctor))
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.dateTime)
        const filterDateObj = new Date(filterDate)
        // Compare dates only (ignore time)
        return aptDate.toDateString() === filterDateObj.toDateString()
      })
    }

    return filtered
  }

  // Get filtered doctors for dropdown
  const getFilteredDoctors = () => {
    if (!filterDoctorSearch) return doctors
    return doctors.filter(d => 
      `${d.fname} ${d.lname}`.toLowerCase().includes(filterDoctorSearch.toLowerCase())
    )
  }

  // Get upcoming appointments (future appointments that are not cancelled or completed)
  const getUpcomingAppointments = () => {
    const now = new Date()
    const upcoming = appointments.filter(apt => {
      // First check status - cancelled and completed should never be in upcoming
      const status = apt.apptStatus?.toUpperCase() || ''
      if (status === 'CANCELLED' || status === 'COMPLETED') {
        return false
      }
      // Then check if it's a future appointment
      const aptDate = new Date(apt.dateTime)
      return aptDate > now
    })
    return applyFilters(upcoming)
  }

  // Get completed appointments (all appointments with COMPLETED status, regardless of date)
  const getHistoryAppointments = () => {
    const history = appointments.filter(apt => {
      const status = apt.apptStatus?.toUpperCase() || ''
      return status === 'COMPLETED'
    })
    return applyFilters(history)
  }

  // Get cancelled appointments (all appointments with CANCELLED status, regardless of date)
  const getCancelledAppointments = () => {
    const cancelled = appointments.filter(apt => {
      const status = apt.apptStatus?.toUpperCase() || ''
      return status === 'CANCELLED'
    })
    return applyFilters(cancelled)
  }

  // Get appointments waiting to be checked in (SCHEDULED, not in queue, not CALLED, not MISSED)
  const getAppointmentsWaitingCheckIn = () => {
    // Get appointment IDs that are already in the queue (IN_QUEUE status)
    const queueAppointmentIds = new Set(queue.map(entry => entry.appointmentId))
    
    // Get appointment ID that is currently being served (CALLED status)
    const calledAppointmentId = currentServing?.appointmentId || null
    
    return appointments.filter(apt => {
      const status = apt.apptStatus?.toUpperCase() || ''
      // Only SCHEDULED appointments
      if (status !== 'SCHEDULED') {
        return false
      }
      
      // Explicitly exclude MISSED appointments
      if (status === 'MISSED') {
        return false
      }
      
      // Exclude appointments already in queue (IN_QUEUE status)
      if (queueAppointmentIds.has(apt.appointmentId)) {
        return false
      }
      
      // Exclude appointments that are CALLED (currently being served)
      if (calledAppointmentId && calledAppointmentId === apt.appointmentId) {
        return false
      }
      
      return true
    }).sort((a, b) => {
      // Sort by appointment time (earliest first)
      return new Date(a.dateTime) - new Date(b.dateTime)
    })
  }

  // Open medical history modal for a patient
  const openMedicalHistoryModal = async (patientId) => {
    try {
      setLoading(true)
      setSelectedPatientForHistory(patientId)
      
      // Fetch patient details and appointment history in parallel
      const [patientDetails, history] = await Promise.all([
        adminAPI.getPatientById(patientId).catch(() => null), // Don't fail if patient fetch fails
        appointmentAPI.getByPatientId(patientId)
      ])
      
      setSelectedPatientDetails(patientDetails)
      
      // Filter to only show COMPLETED appointments
      const completedHistory = (history || []).filter(apt => {
        const status = apt.apptStatus?.toUpperCase() || ''
        return status === 'COMPLETED'
      })
      // Sort by date descending (most recent first)
      const sortedHistory = completedHistory.sort((a, b) => {
        return new Date(b.dateTime) - new Date(a.dateTime)
      })
      setPatientAppointmentsHistory(sortedHistory)
      setExpandedMedicalHistoryAppointmentId(null) // Reset expanded state
      setShowMedicalHistoryModal(true)
    } catch (err) {
      showToast(err.message || 'Failed to load medical history', 'error')
      console.error('Error loading medical history:', err)
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

  // Helper function to get day of week (1=Monday, 7=Sunday)
  const getDayOfWeek = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString + 'T00:00:00')
    // JavaScript getDay() returns 0=Sunday, 1=Monday, etc.
    // Convert to 1=Monday, 7=Sunday
    const day = date.getDay()
    return day === 0 ? 7 : day
  }

  // Helper function to get available dates for a doctor (next 30 days when they work)
  const getAvailableDatesForDoctor = (doctor) => {
    if (!doctor || !doctor.shiftDays || doctor.shiftDays.length === 0) {
      return []
    }

    const dates = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dayOfWeek = getDayOfWeek(date.toISOString().split('T')[0])
      
      if (doctor.shiftDays.includes(dayOfWeek)) {
        dates.push(date.toISOString().split('T')[0])
      }
    }
    
    return dates
  }

  // Helper function to filter doctors by date
  const getDoctorsForDate = (dateString, clinicId) => {
    if (!dateString) return []
    
    const dayOfWeek = getDayOfWeek(dateString)
    return doctors.filter(d => {
      if (d.assignedClinic !== clinicId) return false
      if (!d.shiftDays || d.shiftDays.length === 0) return false
      return d.shiftDays.includes(dayOfWeek)
    })
  }

  const closeBookingModal = () => {
    setShowBookingModal(false)
    setSelectedClinic(null)
    setSelectedDate('')
    setSelectedTimeSlot(null)
    setSelectedDoctor(null)
    setTimeSlots([])
    setAppointmentToReschedule(null)
  }

  const generateSlotsForPeriod = (startTime, endTime, intervalMinutes, date) => {
    if (!startTime || !endTime) return []

    const slots = []
    // Handle time format (could be "HH:mm" or "HH:mm:ss")
    const startParts = startTime.split(':')
    const endParts = endTime.split(':')
    const startHour = parseInt(startParts[0], 10)
    const startMin = parseInt(startParts[1], 10)
    const endHour = parseInt(endParts[0], 10)
    const endMin = parseInt(endParts[1], 10)

    const start = new Date(date)
    start.setHours(startHour, startMin, 0, 0)

    const end = new Date(date)
    end.setHours(endHour, endMin, 0, 0)

    let current = new Date(start)

    while (current < end) {
      const timeString = current.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
      
      slots.push({
        datetime: new Date(current),
        timeString: timeString,
        isoString: current.toISOString()
      })

      current.setMinutes(current.getMinutes() + intervalMinutes)
    }

    return slots
  }

  const generateTimeSlots = () => {
    if (!selectedClinic || !selectedDate) return

    const date = new Date(selectedDate)
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
    const isSaturday = dayOfWeek === 6
    const isSunday = dayOfWeek === 0
    const isPublicHoliday = false // You may want to add public holiday detection

    const clinic = clinics.find(c => c.id === selectedClinic.id)
    if (!clinic) return

    const intervalMinutes = clinic.apptIntervalMin || 15
    let slots = []

    // Determine which hours to use based on day
    let startTime, endTime, pmStartTime, pmEndTime

    if (isPublicHoliday) {
      startTime = clinic.phAmStart
      endTime = clinic.phAmEnd
      pmStartTime = clinic.phPmStart
      pmEndTime = clinic.phPmEnd
    } else if (isSaturday) {
      startTime = clinic.satAmStart
      endTime = clinic.satAmEnd
      pmStartTime = clinic.satPmStart
      pmEndTime = clinic.satPmEnd
    } else if (isSunday) {
      startTime = clinic.sunAmStart
      endTime = clinic.sunAmEnd
      pmStartTime = clinic.sunPmStart
      pmEndTime = clinic.sunPmEnd
    } else {
      // Monday to Friday
      startTime = clinic.monFriAmStart
      endTime = clinic.monFriAmEnd
      pmStartTime = clinic.monFriPmStart
      pmEndTime = clinic.monFriPmEnd
    }

    // Generate AM slots
    if (startTime && endTime) {
      const amSlots = generateSlotsForPeriod(startTime, endTime, intervalMinutes, date)
      slots.push(...amSlots)
    }

    // Generate PM slots
    if (pmStartTime && pmEndTime) {
      const pmSlots = generateSlotsForPeriod(pmStartTime, pmEndTime, intervalMinutes, date)
      slots.push(...pmSlots)
    }

    // Filter out past times
    const now = new Date()
    slots = slots.filter(slot => {
      const slotDate = new Date(slot.datetime)
      return slotDate > now
    })

    setTimeSlots(slots)
  }

  const fetchExistingAppointments = async () => {
    if (!selectedClinic || !selectedDate) return

    try {
      const date = new Date(selectedDate)
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      // Fetch appointments for the clinic on the selected date
      const clinicAppointments = await appointmentAPI.getByClinicId(selectedClinic.id)
      
      // Filter appointments for the selected date
      const dayAppointments = clinicAppointments.filter(apt => {
        const aptDate = new Date(apt.dateTime)
        return aptDate >= startOfDay && aptDate <= endOfDay
      })

      setExistingAppointments(dayAppointments)
    } catch (err) {
      console.error('Failed to fetch existing appointments', err)
      setExistingAppointments([])
    }
  }

  const getAppointmentCountForSlot = (slotDatetime) => {
    if (!selectedDoctor || !selectedClinic) return 0
    
    return existingAppointments.filter(apt => {
      const aptDate = new Date(apt.dateTime)
      const slotDate = new Date(slotDatetime)
      const status = apt.apptStatus?.toUpperCase() || ''
      
      // Only count scheduled appointments (exclude cancelled, completed, missed)
      // Check if appointments are for the same doctor, clinic, and exact same time
      return apt.doctorId === selectedDoctor.id &&
             apt.clinicId === selectedClinic.id &&
             aptDate.getHours() === slotDate.getHours() && 
             aptDate.getMinutes() === slotDate.getMinutes() &&
             status === 'SCHEDULED'
    }).length
  }

  const isSlotAvailable = (slot) => {
    const count = getAppointmentCountForSlot(slot.datetime)
    return count < 3
  }

  // Handle reschedule button click
  const handleRescheduleClick = async (appointment) => {
    try {
      setLoading(true)
      
      // Ensure clinics and doctors are loaded for the modal
      if (clinics.length === 0) {
        await fetchClinics()
      }
      if (doctors.length === 0) {
        await fetchDoctors()
      }
      
      // Fetch clinic and doctor details for the appointment
      const clinic = await clinicAPI.getById(appointment.clinicId)
      const doctor = appointment.doctorId ? await doctorAPI.getById(appointment.doctorId) : null
      
      setSelectedClinic(clinic)
      if (doctor) {
        setSelectedDoctor(doctor)
      }
      
      // Set the appointment to reschedule
      setAppointmentToReschedule(appointment)
      
      // Pre-populate date and time from existing appointment
      const appointmentDate = new Date(appointment.dateTime)
      setSelectedDate(appointmentDate.toISOString().split('T')[0])
      
      // Open booking modal
      setShowBookingModal(true)
    } catch (err) {
      showToast(err.message || 'Failed to load appointment details', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle reschedule (update appointment)
  const handleRescheduleAppointment = async () => {
    if (!appointmentToReschedule || !selectedClinic || !selectedDate || !selectedTimeSlot || !selectedDoctor) {
      showToast('Please select clinic, date, time slot, and doctor', 'error')
      return
    }

    try {
      setLoading(true)

      const appointmentDateTime = new Date(selectedTimeSlot.datetime)
      
      // Format as local date-time string without timezone conversion
      const year = appointmentDateTime.getFullYear()
      const month = String(appointmentDateTime.getMonth() + 1).padStart(2, '0')
      const day = String(appointmentDateTime.getDate()).padStart(2, '0')
      const hours = String(appointmentDateTime.getHours()).padStart(2, '0')
      const minutes = String(appointmentDateTime.getMinutes()).padStart(2, '0')
      const seconds = String(appointmentDateTime.getSeconds()).padStart(2, '0')
      const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      
      await appointmentAPI.update(appointmentToReschedule.appointmentId, {
        patientId: appointmentToReschedule.patientId,
        clinicId: selectedClinic.id,
        doctorId: selectedDoctor.id,
        dateTime: localDateTimeString,
        apptStatus: appointmentToReschedule.apptStatus || 'SCHEDULED'
      })

      showToast('Appointment rescheduled successfully!', 'success')
      
      // Close modal and reset state
      closeBookingModal()
      
      // Refresh appointments list
      await fetchAppointments()
    } catch (err) {
      showToast(err.message || 'Failed to reschedule appointment', 'error')
    } finally {
      setLoading(false)
    }
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
      
      showToast('Patient checked in to queue successfully!', 'success')
      await fetchQueue(false)
      await fetchAppointments()
    } catch (err) {
      showToast(err.message || 'Failed to check in patient', 'error')
    } finally {
      setLoading(false)
    }
  }

  const callNextPatient = async (e) => {
    // Prevent any event bubbling issues
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    console.log('callNextPatient called', { clinicId, loading, queueLength: queue.length })
    
    if (!clinicId) {
      showToast('Clinic ID not available', 'error')
      return
    }
    
    if (loading) {
      console.log('Already loading, ignoring click')
      return
    }
    
    try {
      setLoading(true)
      
      console.log('Calling backend endpoint...')
      // Call the backend endpoint to call next patient in priority queue
      const result = await queueAPI.callNext(clinicId)
      console.log('Backend response:', result)
      
      if (result) {
        showToast(`Patient #${result.appointmentId} called successfully!`, 'success')
      } else {
        showToast('Next patient called successfully!', 'success')
      }
      
      // Refresh all relevant data
      await Promise.all([
        fetchQueue(false),
        fetchCurrentlyServing(),
        fetchMissed(),
        fetchAppointments()
      ])
    } catch (err) {
      console.error('Error calling next patient:', err)
      const errorMessage = err.message || err.response?.data?.message || 'Failed to call next patient'
      showToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  const callPatientByAppointmentId = async (appointmentId) => {
    try {
      setLoading(true)
      await queueAPI.callByAppointmentId(appointmentId)
      showToast('Patient called successfully!', 'success')
      await fetchQueue(false)
      await fetchCurrentlyServing()
    } catch (err) {
      showToast(err.message || 'Failed to call patient', 'error')
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
      showToast('First name and last name are required', 'error')
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
      showToast('Doctor created successfully!', 'success')
      setShowAddDoctorModal(false)
      setNewDoctor({ fname: '', lname: '', shiftDays: [] })
      await fetchDoctors()
    } catch (err) {
      showToast(err.message || 'Failed to create doctor', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateDoctor = async () => {
    if (!editingDoctor || !editingDoctor.fname || !editingDoctor.lname) {
      showToast('First name and last name are required', 'error')
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
      showToast('Doctor updated successfully!', 'success')
      setShowEditDoctorModal(false)
      setEditingDoctor(null)
      await fetchDoctors()
    } catch (err) {
      showToast(err.message || 'Failed to update doctor', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentView = () => {
    if (location.pathname.includes('/appointments')) return 'appointments'
    if (location.pathname.includes('/doctors')) return 'doctors'
    if (location.pathname.includes('/reports')) return 'reports'
    if (location.pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const handleGenerateDailyReport = async () => {
    if (!clinicId) {
      showToast('Clinic ID not available', 'error')
      return
    }

    try {
      setGeneratingReport(true)

      const blob = await reportAPI.getDailyReport(clinicId, reportDate || null)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename
      const dateStr = reportDate || new Date().toISOString().split('T')[0]
      link.download = `DailyClinicReport_${clinicName.replace(/\s+/g, '_')}_${dateStr}.pdf`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showToast('Report generated and downloaded successfully', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to generate report', 'error')
      console.error('Failed to generate daily report', err)
    } finally {
      setGeneratingReport(false)
    }
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={3000}
        />
      )}
      <div className="staff-layout">
        <div className="staff-main">
          {currentView === 'dashboard' && (
            <>
              <div className="page-header">
                <div>
                  <h1>Queue</h1>
                  <p className="subtitle">
                    {clinicName || `Clinic ID: ${clinicId}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCheckInAppointmentData({
                      doctorId: null,
                      date: getTodayDate(),
                      timeSlot: null,
                      priority: 1,
                    })
                    setShowManualCheckInModal(true)
                  }}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Manual Check-in
                </button>
              </div>

              {/* Currently Serving */}
              <div className="section-card serving-card-large">
                <h2>Currently Serving</h2>
                {currentServing?.status === 'QUEUE_EMPTY' ? (
                  <div className="empty-state-large">
                    <div className="empty-icon">📭</div>
                    <p>No patient currently being served</p>
                    {queue.length > 0 ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          callNextPatient(e)
                        }}
                        className="btn btn-primary btn-large"
                        disabled={loading}
                        style={{ marginTop: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
                        type="button"
                      >
                        Call Next Patient
                      </button>
                    ) : (
                      <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
                        No patients in queue
                      </p>
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
                      <button
                        onClick={() => updateQueueStatus(currentServing.queueId, 'MISSED')}
                        className="btn btn-warning btn-large"
                        disabled={loading}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        ⚠ Mark as Missed
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
                          </div>
                          <div className="queue-info-grid">
                            <div className="info-item">
                              <span className="info-label">Patient:</span>
                              <span className="info-value">{entry.patientName || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Priority:</span>
                              <span className="info-value">
                                <span className={`priority-badge priority-${entry.priority}`}>
                                  {getPriorityLabel(entry.priority)}
                                </span>
                              </span>
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
                            Call
                          </button>
                          <button
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              
                              try {
                                // Get patientId from queue entry, or from appointments array, or fetch appointment
                                let patientId = entry.patientId
                                
                                if (!patientId) {
                                  const appointment = appointments.find(apt => apt.appointmentId === entry.appointmentId)
                                  patientId = appointment?.patientId
                                }
                                
                                // If still not found, fetch the appointment
                                if (!patientId && entry.appointmentId) {
                                  const appointment = await appointmentAPI.getById(entry.appointmentId)
                                  patientId = appointment?.patientId
                                }
                                
                                if (patientId) {
                                  openMedicalHistoryModal(patientId)
                                } else {
                                  showToast('Patient ID not found for this appointment', 'error')
                                }
                              } catch (err) {
                                console.error('Error loading patient history:', err)
                                showToast(err.message || 'Failed to load patient information', 'error')
                              }
                            }}
                            className="btn btn-outline"
                            disabled={loading}
                            title="View patient medical history"
                          >
                            📋 History
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Appointments Waiting to Check In */}
              {getAppointmentsWaitingCheckIn().length > 0 && (
                <div className="section-card waiting-checkin-card">
                  <div className="section-header">
                    <h2>Waiting to Check In ({getAppointmentsWaitingCheckIn().length})</h2>
                    <span className="waiting-checkin-badge">
                      {getAppointmentsWaitingCheckIn().length} appointment{getAppointmentsWaitingCheckIn().length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="waiting-checkin-list">
                    {getAppointmentsWaitingCheckIn().map((apt) => {
                      const { formattedDate, formattedTime } = formatDateTime(apt.dateTime)
                      const patient = patients.find(p => p.patientId === apt.patientId || p.userId === apt.patientId)
                      const patientName = patient ? `${patient.fname || ''} ${patient.lname || ''}`.trim() : `Patient #${apt.patientId}`
                      const doctor = doctors.find(d => d.id === apt.doctorId)
                      return (
                        <div key={apt.appointmentId} className="waiting-checkin-item">
                          <div className="waiting-checkin-info">
                            <div className="waiting-checkin-header">
                              <h3>Appointment #{apt.appointmentId}</h3>
                              <span className="appointment-time-badge">
                                🕐 {formattedTime}
                              </span>
                            </div>
                            <div className="waiting-checkin-details">
                              <div className="detail-row">
                                <span className="detail-label">Patient:</span>
                                <span className="detail-value">
                                  {patientName}
                                </span>
                              </div>
                              {doctor && (
                                <div className="detail-row">
                                  <span className="detail-label">Doctor:</span>
                                  <span className="detail-value">
                                    Dr. {doctor.fname} {doctor.lname}
                                  </span>
                                </div>
                              )}
                              <div className="detail-row">
                                <span className="detail-label">Date:</span>
                                <span className="detail-value">{formattedDate}</span>
                              </div>
                            </div>
                          </div>
                          <div className="waiting-checkin-actions">
                            <button
                              onClick={() => openCheckInModal(apt.appointmentId)}
                              className="btn btn-primary"
                              disabled={loading}
                              title="Check in patient to queue"
                            >
                              ✓ Check In
                            </button>
                            <button
                              onClick={() => markAppointmentAsMissed(apt.appointmentId)}
                              className="btn btn-warning"
                              disabled={loading}
                              title="Mark appointment as missed if patient doesn't show up"
                              style={{ marginLeft: '0.5rem' }}
                            >
                              ⚠ Missed
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Missed Patients */}
              {(() => {
                // Filter out missed appointments that have been cancelled
                const activeMissed = missed.filter(entry => {
                  const appointment = appointments.find(apt => apt.appointmentId === entry.appointmentId)
                  // If appointment not found in appointments list, exclude it (might be cancelled)
                  // If appointment is found, check if it's cancelled
                  if (!appointment) {
                    return false // Exclude if appointment not found (likely cancelled or deleted)
                  }
                  const status = appointment.apptStatus?.toUpperCase() || ''
                  return status !== 'CANCELLED'
                })
                
                return activeMissed.length > 0 && (
                  <div className="section-card missed-card">
                    <div className="section-header">
                      <h2>Missed Patients ({activeMissed.length})</h2>
                    </div>
                    <div className="missed-list-enhanced">
                      {activeMissed.map((entry) => (
                        <div key={entry.queueId} className="missed-item-enhanced">
                          <div className="missed-info">
                            <h3>Appointment #{entry.appointmentId}</h3>
                            <p>Status: {entry.status}</p>
                            <p>Missed at: {new Date(entry.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="missed-actions">
                            <button
                              onClick={() => openRequeueModal(entry.appointmentId)}
                              className="btn btn-primary"
                              disabled={loading}
                            >
                              ↻ Re-queue
                            </button>
                            <button
                              onClick={() => openCancelConfirmationModal(entry.appointmentId)}
                              className="btn btn-warning"
                              disabled={loading}
                            >
                              ✕ Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

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
                          <option value={1}>Normal (Priority 1)</option>
                          <option value={2}>Elderly (Priority 2)</option>
                          <option value={3}>Emergency (Priority 3)</option>
                        </select>
                        <p className="form-hint" style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                          Queue order: Emergency (3) → Elderly (2) → Normal (1). Within the same priority, earlier check-ins are served first.
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

              {/* Cancel Confirmation Modal for Missed Appointments */}
              {showCancelConfirmationModal && selectedAppointmentForCancel && (
                <div className="modal-overlay" onClick={() => {
                  if (!loading) {
                    setShowCancelConfirmationModal(false)
                    setSelectedAppointmentForCancel(null)
                  }
                }}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>Cancel Appointment #{selectedAppointmentForCancel}</h2>
                      <button
                        onClick={() => {
                          if (!loading) {
                            setShowCancelConfirmationModal(false)
                            setSelectedAppointmentForCancel(null)
                          }
                        }}
                        className="btn-close"
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="modal-body">
                      <p style={{ fontSize: '1rem', color: '#2d2d2d', marginBottom: '1.5rem' }}>
                        Are you sure you want to cancel appointment #{selectedAppointmentForCancel}? This action cannot be undone.
                      </p>
                      <div className="modal-actions">
                        <button
                          onClick={cancelMissedAppointment}
                          className="btn btn-warning"
                          disabled={loading}
                        >
                          {loading ? 'Cancelling...' : '✕ Cancel Appointment'}
                        </button>
                        <button
                          onClick={() => {
                            if (!loading) {
                              setShowCancelConfirmationModal(false)
                              setSelectedAppointmentForCancel(null)
                            }
                          }}
                          className="btn btn-secondary"
                          disabled={loading}
                        >
                          Keep Appointment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Priority Selection Modal for Re-queue */}
              {showRequeuePriorityModal && selectedAppointmentForRequeue && (
                <div className="modal-overlay" onClick={() => {
                  if (!loading) {
                    setShowRequeuePriorityModal(false)
                    setSelectedAppointmentForRequeue(null)
                    setRequeuePriority(1)
                  }
                }}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>Re-queue Patient - Appointment #{selectedAppointmentForRequeue}</h2>
                      <button
                        onClick={() => {
                          if (!loading) {
                            setShowRequeuePriorityModal(false)
                            setSelectedAppointmentForRequeue(null)
                            setRequeuePriority(1)
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
                          value={requeuePriority}
                          onChange={(e) => setRequeuePriority(parseInt(e.target.value))}
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
                          <option value={1}>Normal (Priority 1)</option>
                          <option value={2}>Elderly (Priority 2)</option>
                          <option value={3}>Emergency (Priority 3)</option>
                        </select>
                        <p className="form-hint" style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                          Queue order: Emergency (3) → Elderly (2) → Normal (1). Within the same priority, earlier check-ins are served first.
                        </p>
                      </div>
                      <div className="modal-actions">
                        <button
                          onClick={handleRequeueWithPriority}
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading ? 'Re-queuing...' : '↻ Re-queue'}
                        </button>
                        <button
                          onClick={() => {
                            if (!loading) {
                              setShowRequeuePriorityModal(false)
                              setSelectedAppointmentForRequeue(null)
                              setRequeuePriority(1)
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
                                <p><strong>Priority:</strong> {getPriorityLabel(entry.priority)} ({entry.priority})</p>
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

              {/* Filters Section */}
              <div className="section-card">
                <h2>Search & Filter</h2>
                <div className="filters-grid">
                  <div className="form-group">
                    <label>Doctor</label>
                    <div className="searchable-dropdown">
                      <input
                        type="text"
                        placeholder="Search by doctor name"
                        value={filterDoctorSearch}
                        onChange={(e) => {
                          setFilterDoctorSearch(e.target.value)
                          setShowDoctorDropdown(true)
                        }}
                        onFocus={() => setShowDoctorDropdown(true)}
                        onClick={(e) => e.stopPropagation()}
                        className="input-sm"
                      />
                      {showDoctorDropdown && getFilteredDoctors().length > 0 && (
                        <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                          {getFilteredDoctors().map((doctor) => (
                            <div
                              key={doctor.id}
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation()
                                setFilterDoctor(doctor.id.toString())
                                setFilterDoctorSearch(`Dr. ${doctor.fname} ${doctor.lname}`)
                                setShowDoctorDropdown(false)
                              }}
                            >
                              Dr. {doctor.fname} {doctor.lname}
                            </div>
                          ))}
                        </div>
                      )}
                      {filterDoctor && (
                        <button
                          className="clear-filter-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFilterDoctor('')
                            setFilterDoctorSearch('')
                          }}
                          type="button"
                          aria-label="Clear doctor filter"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Date</label>
                    <div className="input-with-clear">
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="input-sm"
                      />
                      {filterDate && (
                        <button
                          type="button"
                          className="clear-filter-btn"
                          onClick={() => setFilterDate('')}
                          title="Clear date filter"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
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
                                    {apt.apptStatus !== 'CANCELLED' && (
                                      <button
                                        onClick={() => handleRescheduleClick(apt)}
                                        className="btn btn-primary btn-sm"
                                        disabled={loading}
                                        title="Reschedule appointment"
                                      >
                                        ↻ Reschedule
                                      </button>
                                    )}
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
                          <p style={{ 
                            marginTop: '0.5rem', 
                            marginBottom: 0, 
                            fontSize: '1.1rem', 
                            fontWeight: '600', 
                            color: '#ffffff',
                            padding: '0.4rem 1rem',
                            background: 'rgba(78, 205, 196, 0.2)',
                            border: '1.5px solid var(--teal-primary)',
                            boxShadow: '0 0 8px rgba(78, 205, 196, 0.6), 0 0 16px rgba(78, 205, 196, 0.4)',
                            borderRadius: '20px',
                            display: 'inline-block'
                          }}>
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {currentView === 'reports' && (
            <>
              <div className="page-header">
                <h1>Daily Clinic Report</h1>
                <p className="subtitle">
                  {clinicName || `Clinic ID: ${clinicId}`}
                </p>
              </div>

              <div className="section-card">
                <h2>Generate Daily Report</h2>
                <div className="report-content">
                  <div className="report-info">
                    <p className="report-description">
                      Generate a comprehensive daily report including:
                    </p>
                    <ul className="report-metrics-list">
                      <li>📊 <strong>Patients Seen</strong> - Number of queue logs with status = 'completed'</li>
                      <li>⏱️ <strong>Average Waiting Time</strong> - Difference between appointment_start and created_at in queue_log</li>
                      <li>🚫 <strong>No-Show Rate</strong> - Appointments without a queue_log entry for that day</li>
                    </ul>
                  </div>
                  <div className="report-form">
                    <div className="form-group">
                      <label htmlFor="reportDate">Report Date (optional, defaults to today)</label>
                      <input
                        type="date"
                        id="reportDate"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="form-input"
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        onClick={handleGenerateDailyReport}
                        className="btn btn-primary"
                        disabled={generatingReport || !clinicId}
                      >
                        {generatingReport ? 'Generating PDF...' : '📄 Generate & Download PDF Report'}
                      </button>
                    </div>
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

          {/* Booking Modal - Rendered outside view conditions so it can appear from any view */}
          {showBookingModal && selectedClinic && (
            <div className="modal-overlay" onClick={closeBookingModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{appointmentToReschedule ? 'Reschedule Appointment' : 'Book Appointment'} - {selectedClinic.name}</h2>
                  <button className="modal-close" onClick={closeBookingModal}>×</button>
                </div>
                <div className="modal-body">
                  {/* Date and Doctor Selection */}
                  <div className="booking-form-section">
                    <h3>Select Date & Doctor</h3>
                    <div className="booking-form-row">
                      <div className="form-group">
                        <label>Date</label>
                        <div className="input-with-clear">
                          {selectedDoctor ? (
                            // Show dropdown of available dates when doctor is selected
                            (() => {
                              const availableDates = getAvailableDatesForDoctor(selectedDoctor)
                              return availableDates.length === 0 ? (
                                <div className="empty-state">
                                  <p>No available dates for this doctor in the next 30 days</p>
                                </div>
                              ) : (
                                <>
                                  <select
                                    value={selectedDate || ''}
                                    onChange={(e) => {
                                      setSelectedDate(e.target.value)
                                      setSelectedTimeSlot(null)
                                      setTimeSlots([])
                                    }}
                                    className="input-sm"
                                  >
                                    <option value="">Select a date</option>
                                    {availableDates.map((date) => {
                                      const dateObj = new Date(date + 'T00:00:00')
                                      const formattedDate = dateObj.toLocaleDateString('en-US', { 
                                        weekday: 'short', 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })
                                      return (
                                        <option key={date} value={date}>
                                          {formattedDate}
                                        </option>
                                      )
                                    })}
                                  </select>
                                  {selectedDate && (
                                    <button
                                      type="button"
                                      className="clear-input-btn"
                                      onClick={() => {
                                        setSelectedDate('')
                                        setSelectedTimeSlot(null)
                                        setTimeSlots([])
                                      }}
                                      title="Clear date"
                                    >
                                      ×
                                    </button>
                                  )}
                                </>
                              )
                            })()
                          ) : (
                            // Show date input when no doctor is selected
                            <>
                              <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                  setSelectedDate(e.target.value)
                                  setSelectedTimeSlot(null)
                                  setTimeSlots([])
                                  // Clear doctor if selected date doesn't match their shift
                                  if (selectedDoctor) {
                                    const dayOfWeek = getDayOfWeek(e.target.value)
                                    if (!selectedDoctor.shiftDays || !selectedDoctor.shiftDays.includes(dayOfWeek)) {
                                      setSelectedDoctor(null)
                                    }
                                  }
                                }}
                                min={new Date().toISOString().split('T')[0]}
                                className="input-sm"
                              />
                              {selectedDate && (
                                <button
                                  type="button"
                                  className="clear-input-btn"
                                  onClick={() => {
                                    setSelectedDate('')
                                    setSelectedTimeSlot(null)
                                    setTimeSlots([])
                                    setSelectedDoctor(null)
                                  }}
                                  title="Clear date"
                                >
                                  ×
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Doctor</label>
                        <div className="input-with-clear">
                          {(() => {
                            // Filter doctors based on selected date or show all if no date selected
                            const availableDoctors = selectedDate 
                              ? getDoctorsForDate(selectedDate, selectedClinic.id)
                              : doctors.filter(d => !selectedClinic || d.assignedClinic === selectedClinic.id)
                            
                            return availableDoctors.length === 0 ? (
                              <div className="empty-state">
                                <p>
                                  {selectedDate 
                                    ? 'No doctors available on this date' 
                                    : 'No doctors available at this clinic'}
                                </p>
                              </div>
                            ) : (
                              <>
                                <select
                                  value={selectedDoctor?.id || ''}
                                  onChange={(e) => {
                                    const doctorId = Number(e.target.value)
                                    const doctor = doctors.find(d => d.id === doctorId)
                                    setSelectedDoctor(doctor || null)
                                    // Clear date if selected doctor doesn't work on that day
                                    if (selectedDate && doctor) {
                                      const dayOfWeek = getDayOfWeek(selectedDate)
                                      if (!doctor.shiftDays || !doctor.shiftDays.includes(dayOfWeek)) {
                                        setSelectedDate('')
                                        setSelectedTimeSlot(null)
                                        setTimeSlots([])
                                      }
                                    }
                                  }}
                                  disabled={!!selectedDate}
                                  className="input-sm"
                                >
                                  <option value="">Select a doctor</option>
                                  {availableDoctors.map((doctor) => (
                                    <option key={doctor.id} value={doctor.id}>
                                      Dr. {doctor.fname} {doctor.lname}
                                    </option>
                                  ))}
                                </select>
                                {selectedDoctor && (
                                  <button
                                    type="button"
                                    className="clear-input-btn"
                                    onClick={() => {
                                      setSelectedDoctor(null)
                                      if (selectedDate) {
                                        setSelectedDate('')
                                        setSelectedTimeSlot(null)
                                        setTimeSlots([])
                                      }
                                    }}
                                    title="Clear doctor"
                                  >
                                    ×
                                  </button>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDate && (
                    <div className="booking-form-section">
                      <h3>Available Time Slots</h3>
                      {timeSlots.length === 0 ? (
                        <div className="empty-state">
                          <p>No time slots available for this date. The clinic may be closed or opening hours are not set.</p>
                        </div>
                      ) : (
                        <div className="time-slots-grid">
                          {timeSlots.map((slot, index) => {
                            const available = isSlotAvailable(slot)
                            const count = getAppointmentCountForSlot(slot.datetime)
                            return (
                              <button
                                key={index}
                                className={`time-slot ${!available ? 'unavailable' : ''} ${selectedTimeSlot?.datetime.getTime() === slot.datetime.getTime() ? 'selected' : ''}`}
                                onClick={() => available && setSelectedTimeSlot(slot)}
                                disabled={!available || loading}
                                title={!available ? `Slot full (${count}/3 appointments)` : 'Click to select'}
                              >
                                <span className="time-slot-time">{slot.timeString}</span>
                                {!available && (
                                  <span className="time-slot-badge">Full</span>
                                )}
                                {count > 0 && available && (
                                  <div className="time-slot-count-badge">
                                    <span className="time-slot-count-number">{count}</span>
                                    <span className="time-slot-count-separator">/</span>
                                    <span className="time-slot-count-total">3</span>
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Booking Summary and Submit */}
                  {selectedDate && selectedTimeSlot && selectedDoctor && (
                    <div className="booking-summary">
                      <h3>Booking Summary</h3>
                      <div className="booking-details">
                        <div className="detail-item">
                          <span className="detail-label">Clinic:</span>
                          <span className="detail-value">{selectedClinic.name}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Doctor:</span>
                          <span className="detail-value">Dr. {selectedDoctor.fname} {selectedDoctor.lname}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Date:</span>
                          <span className="detail-value">{new Date(selectedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Time:</span>
                          <span className="detail-value">{selectedTimeSlot.timeString}</span>
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button
                          onClick={handleRescheduleAppointment}
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading 
                            ? 'Rescheduling...' 
                            : 'Confirm Reschedule'
                          }
                        </button>
                        <button
                          onClick={closeBookingModal}
                          className="btn btn-secondary"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Medical History Modal - Accessible from all views */}
          {showMedicalHistoryModal && selectedPatientForHistory && (() => {
            const patient = selectedPatientDetails || patients.find(p => p.patientId === selectedPatientForHistory || p.userId === selectedPatientForHistory)
            const patientName = patient ? `${patient.fname || ''} ${patient.lname || ''}`.trim() : `Patient #${selectedPatientForHistory}`
            
            // Format date of birth
            const formatDateOfBirth = (dob) => {
              if (!dob) return 'N/A'
              try {
                const date = new Date(dob)
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              } catch {
                return dob
              }
            }
            
            return (
              <div className="modal-overlay" onClick={() => {
                if (!loading) {
                  setShowMedicalHistoryModal(false)
                  setSelectedPatientForHistory(null)
                  setSelectedPatientDetails(null)
                  setPatientAppointmentsHistory([])
                  setExpandedMedicalHistoryAppointmentId(null)
                }
              }}>
                <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h2>Patient Medical History</h2>
                    </div>
                    <button
                      onClick={() => {
                        if (!loading) {
                          setShowMedicalHistoryModal(false)
                          setSelectedPatientForHistory(null)
                          setSelectedPatientDetails(null)
                          setPatientAppointmentsHistory([])
                          setExpandedMedicalHistoryAppointmentId(null)
                        }
                      }}
                      className="modal-close"
                      disabled={loading}
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="modal-body">
                    {loading ? (
                      <div className="loading">Loading patient information...</div>
                    ) : (
                      <>
                        {/* Patient Information Section */}
                        {patient && (
                          <div className="section-card" style={{ marginBottom: '2rem' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--teal-dark)' }}>Patient Information</h3>
                            <div className="patient-info-grid">
                              <div className="info-item">
                                <span className="info-label">Name:</span>
                                <span className="info-value">{patientName}</span>
                              </div>
                              {patient.patientIc && (
                                <div className="info-item">
                                  <span className="info-label">IC Number:</span>
                                  <span className="info-value">{patient.patientIc}</span>
                                </div>
                              )}
                              {patient.dateOfBirth && (
                                <div className="info-item">
                                  <span className="info-label">Date of Birth:</span>
                                  <span className="info-value">{formatDateOfBirth(patient.dateOfBirth)}</span>
                                </div>
                              )}
                              {patient.gender && (
                                <div className="info-item">
                                  <span className="info-label">Gender:</span>
                                  <span className="info-value">{patient.gender}</span>
                                </div>
                              )}
                              {patient.bloodType && (
                                <div className="info-item">
                                  <span className="info-label">Blood Type:</span>
                                  <span className="info-value" style={{ fontWeight: '700', color: 'var(--teal-primary)' }}>{patient.bloodType}</span>
                                </div>
                              )}
                              {patient.email && (
                                <div className="info-item">
                                  <span className="info-label">Email:</span>
                                  <span className="info-value">{patient.email}</span>
                                </div>
                              )}
                              {patient.emergencyContact && (
                                <div className="info-item">
                                  <span className="info-label">Emergency Contact:</span>
                                  <span className="info-value">{patient.emergencyContact}</span>
                                </div>
                              )}
                              {patient.emergencyContactPhone && (
                                <div className="info-item">
                                  <span className="info-label">Emergency Phone:</span>
                                  <span className="info-value">{patient.emergencyContactPhone}</span>
                                </div>
                              )}
                            </div>
                            
                            {patient.allergies && (
                              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(78, 205, 196, 0.2)' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: 'var(--teal-dark)' }}>Allergies</h4>
                                <div style={{ 
                                  padding: '1rem', 
                                  background: 'var(--gradient-glow)', 
                                  borderRadius: '8px',
                                  border: '1px solid rgba(78, 205, 196, 0.2)',
                                  color: '#333',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {patient.allergies}
                                </div>
                              </div>
                            )}
                            
                            {patient.medicalHistory && (
                              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(78, 205, 196, 0.2)' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: 'var(--teal-dark)' }}>Medical History</h4>
                                <div style={{ 
                                  padding: '1rem', 
                                  background: 'var(--gradient-glow)', 
                                  borderRadius: '8px',
                                  border: '1px solid rgba(78, 205, 196, 0.2)',
                                  color: '#333',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {patient.medicalHistory}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Appointment History Section */}
                        <div className="section-card">
                          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--teal-dark)' }}>Appointment History</h3>
                          {patientAppointmentsHistory.length === 0 ? (
                            <div className="empty-state">No completed appointments found for this patient</div>
                          ) : (
                            <div className="medical-history-list">
                              {patientAppointmentsHistory.map((apt) => {
                                const doctor = doctors.find(d => d.id === apt.doctorId)
                                const doctorName = doctor ? `Dr. ${doctor.fname || ''} ${doctor.lname || ''}`.trim() : (apt.doctorId ? `Doctor #${apt.doctorId}` : 'N/A')
                                const { formattedDate, formattedTime } = formatDateTime(apt.dateTime)
                                const isExpanded = expandedMedicalHistoryAppointmentId === apt.appointmentId
                                
                                return (
                                  <div 
                                    key={apt.appointmentId} 
                                    className={`medical-history-item ${isExpanded ? 'expanded' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      setExpandedMedicalHistoryAppointmentId(
                                        isExpanded ? null : apt.appointmentId
                                      )
                                    }}
                                  >
                                    <div className="medical-history-header">
                                      <div>
                                        <h3>Appointment #{apt.appointmentId}</h3>
                                        <p className="medical-history-date">{formattedDate}, {formattedTime}</p>
                                        <p className="medical-history-doctor">Doctor: {doctorName}</p>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span className={`status-badge status-${apt.apptStatus?.toLowerCase() || 'pending'}`}>
                                          {apt.apptStatus || 'PENDING'}
                                        </span>
                                        <span style={{ fontSize: '1.2rem', color: '#666' }}>
                                          {isExpanded ? '▼' : '▶'}
                                        </span>
                                      </div>
                                    </div>
                                    {isExpanded && (
                                      <div className="treatment-summary-section">
                                        {apt.treatmentSummary ? (
                                          <>
                                            <h4>Treatment Summary</h4>
                                            <div className="treatment-summary-content">
                                              {apt.treatmentSummary}
                                            </div>
                                          </>
                                        ) : (
                                          <p className="no-treatment-summary">No treatment summary available for this appointment.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Manual Check-in Modal */}
          {showManualCheckInModal && (
            <div className="modal-overlay" onClick={() => {
              if (!loading) {
                resetManualCheckInModal()
              }
            }}>
              <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <h2>Manual Check-in</h2>
                  </div>
                  <button
                    onClick={() => {
                      if (!loading) {
                        resetManualCheckInModal()
                      }
                    }}
                    className="modal-close"
                    disabled={loading}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="modal-body">
                  {loading ? (
                    <div className="loading" style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '3rem',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(78, 205, 196, 0.2)',
                        borderTop: '4px solid var(--teal-primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <p style={{ margin: 0, color: 'var(--teal-dark)', fontWeight: '500' }}>
                        {manualCheckInStep === 'appointment' && !selectedPatientForCheckIn 
                          ? 'Creating account and checking in...' 
                          : 'Processing check-in...'}
                      </p>
                    </div>
                  ) : generatedPassword ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3rem',
                      gap: '1.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem'
                      }}>
                        ✓
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--teal-dark)' }}>Account Created Successfully!</h3>
                        <p style={{ margin: '0 0 1.5rem 0', color: '#666' }}>
                          Patient has been checked in. Generated password:
                        </p>
                        <div style={{
                          background: 'var(--gradient-glow)',
                          border: '2px solid var(--teal-primary)',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          marginBottom: '1rem'
                        }}>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#666',
                            marginBottom: '0.5rem',
                            fontWeight: '500'
                          }}>
                            Generated Password
                          </div>
                          <div style={{
                            fontSize: '1.5rem',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            color: 'var(--teal-dark)',
                            letterSpacing: '0.1em',
                            wordBreak: 'break-all'
                          }}>
                            {generatedPassword}
                          </div>
                        </div>
                        <p style={{ margin: '0 0 1.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                          A password reset email has been sent to <strong>{newPatientFormData.email}</strong>
                        </p>
                        <button
                          onClick={resetManualCheckInModal}
                          className="btn btn-primary"
                          style={{
                            padding: '0.875rem 2rem',
                            fontSize: '1rem',
                            fontWeight: '600'
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Step 1: Search Patient */}
                      {manualCheckInStep === 'search' && (
                        <div>
                          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ 
                              width: '64px', 
                              height: '64px', 
                              borderRadius: '50%', 
                              background: 'var(--gradient-primary)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              margin: '0 auto 1rem',
                              fontSize: '2rem'
                            }}>
                              🔍
                            </div>
                            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--teal-dark)' }}>Search for Patient</h3>
                            <p style={{ color: '#666', marginBottom: 0 }}>
                              Enter patient name or IC number to search
                            </p>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            gap: '0.75rem', 
                            marginBottom: '1.5rem',
                            background: '#f8f9fa',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(78, 205, 196, 0.2)'
                          }}>
                            <input
                              type="text"
                              placeholder="Name or IC Number"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  searchPatient()
                                }
                              }}
                              className="input"
                              style={{ 
                                flex: 1,
                                fontSize: '1rem',
                                padding: '0.875rem 1rem',
                                border: '2px solid rgba(78, 205, 196, 0.3)',
                                borderRadius: '8px',
                                transition: 'all 0.3s'
                              }}
                              disabled={loading}
                            />
                            <button
                              onClick={searchPatient}
                              className="btn btn-primary"
                              disabled={loading || !searchQuery.trim()}
                              style={{
                                padding: '0.875rem 2rem',
                                fontSize: '1rem',
                                fontWeight: '600',
                                minWidth: '120px'
                              }}
                            >
                              {loading ? 'Searching...' : 'Search'}
                            </button>
                          </div>
                          {searchResults.length > 0 && (
                            <div style={{ marginTop: '1.5rem' }}>
                              <h4 style={{ marginBottom: '1rem', color: 'var(--teal-dark)' }}>
                                Search Results ({searchResults.length})
                              </h4>
                              <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '0.75rem',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                paddingRight: '0.5rem'
                              }}>
                                {searchResults.map((patient) => (
                                  <div
                                    key={patient.patientId || patient.id}
                                    onClick={() => {
                                      setSelectedPatientForCheckIn(patient)
                                      setManualCheckInStep('existing')
                                    }}
                                    style={{
                                      padding: '1.25rem',
                                      border: '2px solid',
                                      borderColor: selectedPatientForCheckIn?.patientId === patient.patientId 
                                        ? 'var(--teal-primary)' 
                                        : 'rgba(78, 205, 196, 0.2)',
                                      borderRadius: '12px',
                                      cursor: 'pointer',
                                      background: selectedPatientForCheckIn?.patientId === patient.patientId 
                                        ? 'var(--gradient-glow)' 
                                        : '#fff',
                                      transition: 'all 0.3s',
                                      boxShadow: selectedPatientForCheckIn?.patientId === patient.patientId
                                        ? '0 4px 12px rgba(78, 205, 196, 0.2)'
                                        : '0 2px 4px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (selectedPatientForCheckIn?.patientId !== patient.patientId) {
                                        e.currentTarget.style.borderColor = 'var(--teal-primary)'
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(78, 205, 196, 0.15)'
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (selectedPatientForCheckIn?.patientId !== patient.patientId) {
                                        e.currentTarget.style.borderColor = 'rgba(78, 205, 196, 0.2)'
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)'
                                      }
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                      <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: 'var(--gradient-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: '700',
                                        fontSize: '1.25rem',
                                        flexShrink: 0
                                      }}>
                                        {patient.fname?.[0]?.toUpperCase() || 'P'}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ 
                                          fontWeight: '600', 
                                          fontSize: '1.1rem',
                                          color: 'var(--teal-dark)',
                                          marginBottom: '0.25rem'
                                        }}>
                                          {patient.fname} {patient.lname}
                                        </div>
                                        <div style={{ 
                                          display: 'flex', 
                                          gap: '1rem', 
                                          flexWrap: 'wrap',
                                          fontSize: '0.9rem',
                                          color: '#666'
                                        }}>
                                          <span>📧 {patient.email}</span>
                                          <span>🆔 IC: {patient.patientIc}</span>
                                        </div>
                                      </div>
                                      <div style={{
                                        color: 'var(--teal-primary)',
                                        fontSize: '1.5rem',
                                        opacity: selectedPatientForCheckIn?.patientId === patient.patientId ? 1 : 0.3
                                      }}>
                                        →
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {hasSearched && searchResults.length === 0 && !loading && (
                            <div style={{
                              textAlign: 'center',
                              padding: '2rem',
                              color: '#666',
                              background: '#f8f9fa',
                              borderRadius: '12px',
                              border: '1px dashed rgba(78, 205, 196, 0.3)'
                            }}>
                              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
                              <p style={{ margin: 0, fontWeight: '500' }}>No patient found</p>
                              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>You can create a new account below</p>
                            </div>
                          )}
                          <div style={{ 
                            marginTop: '2rem', 
                            paddingTop: '1.5rem', 
                            borderTop: '2px solid rgba(78, 205, 196, 0.2)',
                            textAlign: 'center'
                          }}>
                            <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.95rem' }}>
                              Can't find the patient?
                            </p>
                            <button
                              onClick={() => setManualCheckInStep('new')}
                              className="btn btn-secondary"
                              disabled={loading}
                              style={{
                                padding: '0.875rem 2rem',
                                fontSize: '1rem',
                                fontWeight: '600'
                              }}
                            >
                              ➕ Create New Patient Account
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Existing Patient - Appointment Details */}
                      {manualCheckInStep === 'existing' && selectedPatientForCheckIn && (
                        <div>
                          <div style={{ 
                            background: 'var(--gradient-glow)', 
                            padding: '1.5rem', 
                            borderRadius: '12px', 
                            marginBottom: '2rem',
                            border: '1px solid rgba(78, 205, 196, 0.2)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <h3 style={{ margin: 0, color: 'var(--teal-dark)' }}>Patient Information</h3>
                              <button
                                onClick={() => {
                                  setManualCheckInStep('search')
                                  setSelectedPatientForCheckIn(null)
                                  setCheckInAppointmentData({
                                    doctorId: null,
                                    date: '',
                                    timeSlot: null,
                                    priority: 1,
                                  })
                                }}
                                className="btn btn-outline"
                                style={{ 
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.875rem'
                                }}
                              >
                                Change Patient
                              </button>
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '1rem',
                              marginTop: '1rem'
                            }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: '700',
                                fontSize: '1.25rem',
                                flexShrink: 0
                              }}>
                                {selectedPatientForCheckIn.fname?.[0]?.toUpperCase() || 'P'}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  fontWeight: '600', 
                                  fontSize: '1.1rem',
                                  color: 'var(--teal-dark)',
                                  marginBottom: '0.25rem'
                                }}>
                                  {selectedPatientForCheckIn.fname} {selectedPatientForCheckIn.lname}
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  gap: '1rem', 
                                  flexWrap: 'wrap',
                                  fontSize: '0.9rem',
                                  color: '#666'
                                }}>
                                  <span>📧 {selectedPatientForCheckIn.email}</span>
                                  <span>🆔 IC: {selectedPatientForCheckIn.patientIc}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="booking-form-section" style={{ marginTop: 0 }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--teal-dark)' }}>Appointment Details</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Date *</label>
                                <input
                                  type="date"
                                  value={checkInAppointmentData.date}
                                  onChange={(e) => {
                                    setCheckInAppointmentData({ ...checkInAppointmentData, date: e.target.value, timeSlot: null })
                                  }}
                                  className="input"
                                  min={new Date().toISOString().split('T')[0]}
                                  disabled={loading}
                                  style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    fontSize: '1rem'
                                  }}
                                />
                              </div>

                              {checkInAppointmentData.date && checkInAppointmentData.doctorId && (
                                <>
                                  {(() => {
                                    const doctor = doctors.find(d => d.id === checkInAppointmentData.doctorId)
                                    return doctor && (
                                      <div style={{
                                        background: 'var(--gradient-glow)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(78, 205, 196, 0.2)'
                                      }}>
                                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>Doctor on shift</div>
                                        <div style={{ fontWeight: '600', color: 'var(--teal-dark)', fontSize: '1.1rem' }}>
                                          Dr. {doctor.fname} {doctor.lname}
                                        </div>
                                      </div>
                                    )
                                  })()}

                                  {availableTimeSlots.length > 0 ? (
                                    <div>
                                      <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Select Time Slot *</label>
                                      <div className="time-slots-grid">
                                        {availableTimeSlots.map((slot, idx) => {
                                          const isAvailable = isCheckInSlotAvailable(slot)
                                          const count = getCheckInAppointmentCountForSlot(slot.datetime)
                                          const isSelected = checkInAppointmentData.timeSlot?.datetime?.getTime() === slot.datetime.getTime()
                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              className={`time-slot ${!isAvailable ? 'unavailable' : ''} ${isSelected ? 'selected' : ''}`}
                                              onClick={() => {
                                                if (isAvailable) {
                                                  setCheckInAppointmentData({ ...checkInAppointmentData, timeSlot: slot })
                                                }
                                              }}
                                              disabled={!isAvailable || loading}
                                              title={!isAvailable ? `Slot full (${count}/3 appointments)` : 'Click to select'}
                                            >
                                              <span className="time-slot-time">{slot.timeString}</span>
                                              {!isAvailable && (
                                                <span className="time-slot-badge">Full</span>
                                              )}
                                              {count > 0 && isAvailable && (
                                                <div className="time-slot-count-badge">
                                                  <span className="time-slot-count-number">{count}</span>
                                                  <span className="time-slot-count-separator">/</span>
                                                  <span className="time-slot-count-total">3</span>
                                                </div>
                                              )}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ) : checkInAppointmentData.date && (
                                    <div className="empty-state">
                                      <p>No time slots available for this date. The clinic may be closed or opening hours are not set.</p>
                                    </div>
                                  )}

                                  <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Priority *</label>
                                    <select
                                      value={checkInAppointmentData.priority}
                                      onChange={(e) => {
                                        setCheckInAppointmentData({ ...checkInAppointmentData, priority: parseInt(e.target.value) })
                                      }}
                                      className="input"
                                      disabled={loading}
                                      style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        fontSize: '1rem'
                                      }}
                                    >
                                      <option value={1}>Normal</option>
                                      <option value={2}>Elderly</option>
                                      <option value={3}>Emergency</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              {checkInAppointmentData.date && !checkInAppointmentData.doctorId && (
                                <div className="empty-state">
                                  <p>No doctor available on this date. Please select a different date.</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid rgba(78, 205, 196, 0.2)' }}>
                            <button
                              onClick={handleManualCheckIn}
                              className="btn btn-primary"
                              disabled={loading || !checkInAppointmentData.doctorId || !checkInAppointmentData.date || !checkInAppointmentData.timeSlot}
                              style={{
                                flex: 1,
                                padding: '0.875rem 2rem',
                                fontSize: '1rem',
                                fontWeight: '600'
                              }}
                            >
                              Check In
                            </button>
                            <button
                              onClick={resetManualCheckInModal}
                              className="btn btn-outline"
                              disabled={loading}
                              style={{
                                padding: '0.875rem 2rem',
                                fontSize: '1rem'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 3: New Patient - Account Creation */}
                      {manualCheckInStep === 'new' && (
                        <div>
                          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ 
                              width: '64px', 
                              height: '64px', 
                              borderRadius: '50%', 
                              background: 'var(--gradient-primary)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              margin: '0 auto 1rem',
                              fontSize: '2rem'
                            }}>
                              👤
                            </div>
                            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--teal-dark)' }}>Create New Patient Account</h3>
                            <p style={{ color: '#666', marginBottom: 0 }}>
                              Fill in the required information to create a new patient account
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setManualCheckInStep('search')
                              setNewPatientFormData({
                                email: '',
                                fname: '',
                                lname: '',
                                patientIc: '',
                                dateOfBirth: '',
                                gender: '',
                              })
                            }}
                            className="btn btn-outline"
                            disabled={loading}
                            style={{ marginBottom: '1.5rem' }}
                          >
                            ← Back to Search
                          </button>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>First Name *</label>
                                <input
                                  type="text"
                                  value={newPatientFormData.fname}
                                  onChange={(e) => setNewPatientFormData({ ...newPatientFormData, fname: e.target.value })}
                                  className="input"
                                  disabled={loading}
                                  required
                                  style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    fontSize: '1rem'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Last Name *</label>
                                <input
                                  type="text"
                                  value={newPatientFormData.lname}
                                  onChange={(e) => setNewPatientFormData({ ...newPatientFormData, lname: e.target.value })}
                                  className="input"
                                  disabled={loading}
                                  required
                                  style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    fontSize: '1rem'
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Email *</label>
                              <input
                                type="email"
                                value={newPatientFormData.email}
                                onChange={(e) => setNewPatientFormData({ ...newPatientFormData, email: e.target.value })}
                                className="input"
                                disabled={loading}
                                required
                                style={{
                                  width: '100%',
                                  padding: '0.875rem 1rem',
                                  fontSize: '1rem'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>IC Number *</label>
                              <input
                                type="text"
                                value={newPatientFormData.patientIc}
                                onChange={(e) => setNewPatientFormData({ ...newPatientFormData, patientIc: e.target.value })}
                                className="input"
                                disabled={loading}
                                required
                                placeholder="e.g., 123456789012"
                                style={{
                                  width: '100%',
                                  padding: '0.875rem 1rem',
                                  fontSize: '1rem'
                                }}
                              />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Date of Birth *</label>
                                <input
                                  type="date"
                                  value={newPatientFormData.dateOfBirth}
                                  onChange={(e) => setNewPatientFormData({ ...newPatientFormData, dateOfBirth: e.target.value })}
                                  className="input"
                                  disabled={loading}
                                  required
                                  style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    fontSize: '1rem'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Gender *</label>
                                <select
                                  value={newPatientFormData.gender}
                                  onChange={(e) => setNewPatientFormData({ ...newPatientFormData, gender: e.target.value })}
                                  className="input"
                                  disabled={loading}
                                  required
                                  style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    fontSize: '1rem'
                                  }}
                                >
                                  <option value="">Select gender</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid rgba(78, 205, 196, 0.2)' }}>
                            <button
                              onClick={() => {
                                setManualCheckInStep('appointment')
                                setSelectedPatientForCheckIn(null) // Mark as new patient
                              }}
                              className="btn btn-primary"
                              disabled={loading || !newPatientFormData.email || !newPatientFormData.fname || !newPatientFormData.lname || !newPatientFormData.patientIc || !newPatientFormData.dateOfBirth || !newPatientFormData.gender}
                              style={{
                                flex: 1,
                                padding: '0.875rem 2rem',
                                fontSize: '1rem',
                                fontWeight: '600'
                              }}
                            >
                              Continue to Appointment
                            </button>
                            <button
                              onClick={resetManualCheckInModal}
                              className="btn btn-outline"
                              disabled={loading}
                              style={{
                                padding: '0.875rem 2rem',
                                fontSize: '1rem'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 4: Appointment Details for New Patient */}
                      {manualCheckInStep === 'appointment' && (
                        <div>
                          <button
                            onClick={() => setManualCheckInStep('new')}
                            className="btn btn-outline"
                            disabled={loading}
                            style={{ marginBottom: '1.5rem' }}
                          >
                            ← Back to Patient Info
                          </button>
                          <div className="booking-form-section" style={{ marginTop: 0 }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--teal-dark)' }}>Appointment Details</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Date *</label>
                                <input
                                  type="date"
                                  value={checkInAppointmentData.date}
                                  onChange={(e) => {
                                    setCheckInAppointmentData({ ...checkInAppointmentData, date: e.target.value, timeSlot: null })
                                  }}
                                  className="input"
                                  min={new Date().toISOString().split('T')[0]}
                                  disabled={loading}
                                  style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    fontSize: '1rem'
                                  }}
                                />
                              </div>

                              {checkInAppointmentData.date && checkInAppointmentData.doctorId && (
                                <>
                                  {(() => {
                                    const doctor = doctors.find(d => d.id === checkInAppointmentData.doctorId)
                                    return doctor && (
                                      <div style={{
                                        background: 'var(--gradient-glow)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(78, 205, 196, 0.2)'
                                      }}>
                                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>Doctor on shift</div>
                                        <div style={{ fontWeight: '600', color: 'var(--teal-dark)', fontSize: '1.1rem' }}>
                                          Dr. {doctor.fname} {doctor.lname}
                                        </div>
                                      </div>
                                    )
                                  })()}

                                  {availableTimeSlots.length > 0 ? (
                                    <div>
                                      <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Select Time Slot *</label>
                                      <div className="time-slots-grid">
                                        {availableTimeSlots.map((slot, idx) => {
                                          const isAvailable = isCheckInSlotAvailable(slot)
                                          const count = getCheckInAppointmentCountForSlot(slot.datetime)
                                          const isSelected = checkInAppointmentData.timeSlot?.datetime?.getTime() === slot.datetime.getTime()
                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              className={`time-slot ${!isAvailable ? 'unavailable' : ''} ${isSelected ? 'selected' : ''}`}
                                              onClick={() => {
                                                if (isAvailable) {
                                                  setCheckInAppointmentData({ ...checkInAppointmentData, timeSlot: slot })
                                                }
                                              }}
                                              disabled={!isAvailable || loading}
                                              title={!isAvailable ? `Slot full (${count}/3 appointments)` : 'Click to select'}
                                            >
                                              <span className="time-slot-time">{slot.timeString}</span>
                                              {!isAvailable && (
                                                <span className="time-slot-badge">Full</span>
                                              )}
                                              {count > 0 && isAvailable && (
                                                <div className="time-slot-count-badge">
                                                  <span className="time-slot-count-number">{count}</span>
                                                  <span className="time-slot-count-separator">/</span>
                                                  <span className="time-slot-count-total">3</span>
                                                </div>
                                              )}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ) : checkInAppointmentData.date && (
                                    <div className="empty-state">
                                      <p>No time slots available for this date. The clinic may be closed or opening hours are not set.</p>
                                    </div>
                                  )}

                                  <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--teal-dark)' }}>Priority *</label>
                                    <select
                                      value={checkInAppointmentData.priority}
                                      onChange={(e) => {
                                        setCheckInAppointmentData({ ...checkInAppointmentData, priority: parseInt(e.target.value) })
                                      }}
                                      className="input"
                                      disabled={loading}
                                      style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        fontSize: '1rem'
                                      }}
                                    >
                                      <option value={1}>Normal</option>
                                      <option value={2}>Elderly</option>
                                      <option value={3}>Emergency</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              {checkInAppointmentData.date && !checkInAppointmentData.doctorId && (
                                <div className="empty-state">
                                  <p>No doctor available on this date. Please select a different date.</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid rgba(78, 205, 196, 0.2)' }}>
                            <button
                              onClick={() => setManualCheckInStep('new')}
                              className="btn btn-outline"
                              disabled={loading}
                              style={{
                                padding: '0.875rem 2rem',
                                fontSize: '1rem'
                              }}
                            >
                              ← Back
                            </button>
                            <button
                              onClick={handleManualCheckIn}
                              className="btn btn-primary"
                              disabled={loading || !checkInAppointmentData.doctorId || !checkInAppointmentData.date || !checkInAppointmentData.timeSlot}
                              style={{
                                flex: 1,
                                padding: '0.875rem 2rem',
                                fontSize: '1rem',
                                fontWeight: '600'
                              }}
                            >
                              Create Account & Check In
                            </button>
                            <button
                              onClick={resetManualCheckInModal}
                              className="btn btn-outline"
                              disabled={loading}
                              style={{
                                padding: '0.875rem 2rem',
                                fontSize: '1rem'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
