import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { appointmentAPI, queueAPI, adminAPI, clinicAPI, doctorAPI } from '../lib/api'
import Navbar from '../components/Navbar'
import Toast from '../components/Toast'
import { useLocation } from 'react-router-dom'
import PatientProfile from './PatientProfile'
import './PatientView.css'

export default function PatientView() {
  const { userProfile, loading: authLoading } = useAuth()
  const location = useLocation()
  const [appointments, setAppointments] = useState([])
  const [queuePosition, setQueuePosition] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0 })
  const [clinicId, setClinicId] = useState(null)
  
  // Toast state
  const [toast, setToast] = useState(null)
  
  // Appointment filter state
  const [appointmentFilter, setAppointmentFilter] = useState('upcoming') // 'upcoming' or 'past'
  const [pastAppointmentDateFilter, setPastAppointmentDateFilter] = useState('')
  
  // Appointments tab state (for the combined appointments page)
  const [appointmentsTab, setAppointmentsTab] = useState(() => {
    // Default to 'book' tab, but if on /patient/book, ensure it's set to 'book'
    return location.pathname.includes('/book') ? 'book' : 'book'
  }) // 'book' or 'upcoming'
  
  // Medical history state
  const [expandedAppointmentId, setExpandedAppointmentId] = useState(null) // Track which appointment is expanded
  const [medicalHistoryFilter, setMedicalHistoryFilter] = useState('past') // 'past' or 'archive'
  
  // Reschedule state
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null)
  
  // Cancel state
  const [appointmentToCancel, setAppointmentToCancel] = useState(null)

  // Booking state
  const [clinics, setClinics] = useState([])
  const [doctors, setDoctors] = useState([])
  
  // Clinic and doctor name mappings
  const [clinicNames, setClinicNames] = useState({})
  const [doctorNames, setDoctorNames] = useState({})
  const [filteredClinics, setFilteredClinics] = useState([])
  const [displayedClinics, setDisplayedClinics] = useState([])
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])
  const [existingAppointments, setExistingAppointments] = useState([])
  
  // Filters
  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterDoctorSearch, setFilterDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [filterClinic, setFilterClinic] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterRegionSearch, setFilterRegionSearch] = useState('')
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterSpecialtySearch, setFilterSpecialtySearch] = useState('')
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  
  // Booking Modal
  const [showBookingModal, setShowBookingModal] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Location
  const [userLocation, setUserLocation] = useState(null)
  const [locationPermission, setLocationPermission] = useState(null)
  const [clinicCoordinates, setClinicCoordinates] = useState({})

  useEffect(() => {
    // Use userId or patientId (Patient model might use either)
    const patientId = userProfile?.userId || userProfile?.patientId
    if (patientId && !authLoading) {
      fetchAppointments()
    }
  }, [userProfile, authLoading])

  // Update clinic and doctor name mappings when data is loaded
  useEffect(() => {
    if (clinics.length > 0) {
      const namesMap = {}
      clinics.forEach(clinic => {
        namesMap[clinic.id] = clinic.name
      })
      setClinicNames(namesMap)
    }
  }, [clinics])

  useEffect(() => {
    if (doctors.length > 0) {
      const namesMap = {}
      doctors.forEach(doctor => {
        namesMap[doctor.id] = `Dr. ${doctor.fname} ${doctor.lname}`
      })
      setDoctorNames(namesMap)
    }
  }, [doctors])

  useEffect(() => {
    // Use SSE for real-time queue position updates (on dashboard)
    const isDashboard = !location.pathname.includes('/appointments') && 
                        !location.pathname.includes('/medical-history') && 
                        !location.pathname.includes('/settings') &&
                        !location.pathname.includes('/book')
    
    if (selectedAppointment && isDashboard) {
      let eventSource = null
      
      try {
        eventSource = queueAPI.streamQueuePosition(
          selectedAppointment,
          (position) => {
            // Update queue position on each SSE event
            setQueuePosition(position)
            setError('')
          },
          (error) => {
            // Handle errors (connection lost, not in queue, etc.)
            if (error.message?.includes('Not Found') || error.message?.includes('Not in queue')) {
              setQueuePosition(null)
            } else {
              setError('Connection lost. Reconnecting...')
              // EventSource will auto-reconnect
            }
            console.error('SSE error:', error)
          }
        )
      } catch (err) {
        console.error('Failed to create SSE connection:', err)
        setError('Failed to connect to queue updates')
      }
      
      return () => {
        // Cleanup: close SSE connection
        if (eventSource) {
          eventSource.close()
        }
      }
    }
  }, [selectedAppointment, location])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      // Use userId or patientId (Patient model might use either)
      const patientId = userProfile?.userId || userProfile?.patientId
      if (!patientId) {
        console.error('No patient ID available')
        setError('Unable to load appointments: Patient ID not found')
        return
      }
      const data = await appointmentAPI.getByPatientId(patientId)
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
      showToast('Failed to load appointments', 'error')
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


  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Check if appointment is within 24 hours
  const isWithin24Hours = (appointmentDateTime) => {
    const now = new Date()
    const appointmentDate = new Date(appointmentDateTime)
    const diffInMs = appointmentDate.getTime() - now.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    return diffInHours <= 24 && diffInHours >= 0
  }

  // Filter appointments based on selected filter (for upcoming appointments tab)
  const getFilteredAppointments = () => {
    const now = new Date()
    // Always show upcoming appointments that are not cancelled for the upcoming tab
    return appointments.filter(apt => 
      new Date(apt.dateTime) > now && apt.apptStatus !== 'CANCELLED'
    )
  }

  // Get past appointments for medical history
  const getPastAppointments = () => {
    const now = new Date()
    return appointments.filter(apt => 
      new Date(apt.dateTime) <= now && apt.apptStatus !== 'CANCELLED'
    )
  }

  // Get cancelled appointments for archive
  const getCancelledAppointments = () => {
    return appointments.filter(apt => apt.apptStatus === 'CANCELLED')
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

      showToast('Appointment rescheduled successfully!')
      
      // Close modal and reset state
      closeBookingModal()
      setAppointmentToReschedule(null)
      
      // Refresh appointments list
      await fetchAppointments()
    } catch (err) {
      showToast(err.message || 'Failed to reschedule appointment', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle cancel button click - show confirmation
  const handleCancelClick = (appointment) => {
    setAppointmentToCancel(appointment)
  }

  // Handle cancel confirmation - update appointment status to cancelled
  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return

    try {
      setLoading(true)

      await appointmentAPI.update(appointmentToCancel.appointmentId, {
        patientId: appointmentToCancel.patientId,
        clinicId: appointmentToCancel.clinicId,
        doctorId: appointmentToCancel.doctorId,
        dateTime: appointmentToCancel.dateTime,
        apptStatus: 'CANCELLED'
      })

      showToast('Appointment cancelled successfully!')
      
      // Reset state
      setAppointmentToCancel(null)
      
      // Refresh appointments list
      await fetchAppointments()
    } catch (err) {
      showToast(err.message || 'Failed to cancel appointment', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentView = () => {
    if (location.pathname.includes('/profile')) return 'profile'
    if (location.pathname.includes('/medical-history')) return 'medical-history'
    if (location.pathname.includes('/appointments') || location.pathname.includes('/book')) return 'appointments'
    if (location.pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  // Update appointments tab when navigating
  useEffect(() => {
    if (getCurrentView() === 'appointments') {
      if (location.pathname.includes('/book')) {
        setAppointmentsTab('book')
      }
    }
  }, [location.pathname])

  // Fetch clinics and doctors for booking
  useEffect(() => {
    if (getCurrentView() === 'appointments') {
      fetchClinics()
      fetchDoctors()
      requestLocationPermission()
    }
  }, [location.pathname])

  // Filter clinics when filters change
  useEffect(() => {
    if (getCurrentView() === 'appointments') {
      applyFilters()
      setCurrentPage(1) // Reset to first page when filters change
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDoctor, filterClinic, filterRegion, filterSpecialty, filterDate, clinics, userLocation])

  // Update displayed clinics when filtered clinics or page changes
  useEffect(() => {
    if (getCurrentView() === 'appointments') {
      updateDisplayedClinics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClinics, currentPage])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      // Check if click is outside any searchable dropdown
      const isInsideDropdown = target.closest('.searchable-dropdown') || 
                               target.closest('.dropdown-menu') ||
                               target.closest('.dropdown-item') ||
                               target.closest('.clear-filter-btn')
      
      if (!isInsideDropdown) {
        setShowDoctorDropdown(false)
        setShowSpecialtyDropdown(false)
        setShowRegionDropdown(false)
      }
    }
    
    // Use capture phase to catch clicks earlier
    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('click', handleClickOutside, true)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [])

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

  // Generate time slots when clinic and date are selected
  useEffect(() => {
    if (selectedClinic && selectedDate && showBookingModal) {
      generateTimeSlots()
      fetchExistingAppointments()
    }
  }, [selectedClinic, selectedDate, showBookingModal])

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

  const requestLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setLocationPermission('granted')
        },
        (error) => {
          console.error('Location permission denied or error:', error)
          setLocationPermission('denied')
        }
      )
    } else {
      setLocationPermission('not-supported')
    }
  }

  const geocodeAddress = async (address) => {
    // Check cache first
    if (clinicCoordinates[address]) {
      return clinicCoordinates[address]
    }
    
    try {
      // Use OpenStreetMap Nominatim API (free, no API key required)
      // Add a small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200))
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'ClinicBookingApp/1.0'
          }
        }
      )
      const data = await response.json()
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }
        // Cache by address
        setClinicCoordinates(prev => ({ ...prev, [address]: coords }))
        return coords
      }
    } catch (err) {
      console.error('Geocoding error:', err)
    }
    return null
  }

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }

  const fetchClinics = async () => {
    try {
      setLoading(true)
      const data = await clinicAPI.getAll()
      setClinics(data || [])
      setFilteredClinics(data || [])
      setError('')
    } catch (err) {
      setError('Failed to load clinics')
      console.error(err)
    } finally {
      setLoading(false)
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

  // Load clinics and doctors for name mapping when component mounts
  useEffect(() => {
    const patientId = userProfile?.userId || userProfile?.patientId
    if (patientId && !authLoading) {
      fetchClinics()
      fetchDoctors()
    }
  }, [userProfile, authLoading])

  const applyFilters = async () => {
    let filtered = [...clinics]

    if (filterRegion) {
      filtered = filtered.filter(c => c.region === filterRegion)
    }
    if (filterSpecialty) {
      filtered = filtered.filter(c => c.specialty === filterSpecialty)
    }
    if (filterClinic) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(filterClinic.toLowerCase())
      )
    }
    if (filterDoctor) {
      // Filter clinics that have the selected doctor
      const doctor = doctors.find(d => d.id?.toString() === filterDoctor)
      if (doctor && doctor.assignedClinic) {
        filtered = filtered.filter(c => c.id === doctor.assignedClinic)
      }
    }

    // Sort by distance if location is available
    if (userLocation) {
      // Geocode addresses and calculate distances (with caching)
      const clinicsWithDistance = await Promise.all(
        filtered.map(async (clinic) => {
          // Check cache by clinic ID first, then by address
          let coords = clinicCoordinates[clinic.id] || clinicCoordinates[clinic.address]
          if (!coords) {
            coords = await geocodeAddress(clinic.address)
            if (coords) {
              // Cache by both ID and address
              setClinicCoordinates(prev => ({ 
                ...prev, 
                [clinic.id]: coords,
                [clinic.address]: coords
              }))
            }
          }
          
          let distance = null
          if (coords && userLocation) {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              coords.lat,
              coords.lng
            )
          }
          
          return { ...clinic, distance }
        })
      )
      
      // Sort by distance (null distances go to end)
      clinicsWithDistance.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      })
      
      filtered = clinicsWithDistance
    }

    setFilteredClinics(filtered)
  }

  const updateDisplayedClinics = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setDisplayedClinics(filteredClinics.slice(startIndex, endIndex))
  }

  const getUniqueRegions = () => {
    const regions = [...new Set(clinics.map(c => c.region).filter(Boolean))]
    return regions.sort()
  }

  const getUniqueSpecialties = () => {
    const specialties = [...new Set(clinics.map(c => c.specialty).filter(Boolean))]
    return specialties.sort()
  }

  const getFilteredDoctors = () => {
    if (!filterDoctorSearch) return doctors
    return doctors.filter(d => 
      `${d.fname} ${d.lname}`.toLowerCase().includes(filterDoctorSearch.toLowerCase())
    )
  }

  const getFilteredSpecialties = () => {
    if (!filterSpecialtySearch) return getUniqueSpecialties()
    return getUniqueSpecialties().filter(s => 
      s.toLowerCase().includes(filterSpecialtySearch.toLowerCase())
    )
  }

  const getFilteredRegions = () => {
    if (!filterRegionSearch) return getUniqueRegions()
    return getUniqueRegions().filter(r => 
      r.toLowerCase().includes(filterRegionSearch.toLowerCase())
    )
  }

  const handleClinicClick = (clinic) => {
    setSelectedClinic(clinic)
    setSelectedDate('')
    setSelectedTimeSlot(null)
    setSelectedDoctor(null)
    setTimeSlots([])
    setShowBookingModal(true)
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

  const totalPages = Math.ceil(filteredClinics.length / itemsPerPage)

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
    return existingAppointments.filter(apt => {
      const aptDate = new Date(apt.dateTime)
      const slotDate = new Date(slotDatetime)
      // Check if appointments are at the exact same time (same hour and minute)
      return aptDate.getHours() === slotDate.getHours() && 
             aptDate.getMinutes() === slotDate.getMinutes()
    }).length
  }

  const isSlotAvailable = (slot) => {
    const count = getAppointmentCountForSlot(slot.datetime)
    return count < 3
  }

  const handleBookAppointment = async () => {
    if (!selectedClinic || !selectedDate || !selectedTimeSlot || !selectedDoctor) {
      setError('Please select clinic, date, time slot, and doctor')
      return
    }

    try {
      setLoading(true)
      setError('')

      const appointmentDateTime = new Date(selectedTimeSlot.datetime)
      
      // Format as local date-time string without timezone conversion
      // Format: YYYY-MM-DDTHH:mm:ss (no timezone info)
      const year = appointmentDateTime.getFullYear()
      const month = String(appointmentDateTime.getMonth() + 1).padStart(2, '0')
      const day = String(appointmentDateTime.getDate()).padStart(2, '0')
      const hours = String(appointmentDateTime.getHours()).padStart(2, '0')
      const minutes = String(appointmentDateTime.getMinutes()).padStart(2, '0')
      const seconds = String(appointmentDateTime.getSeconds()).padStart(2, '0')
      const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      
      // Use userId or patientId (Patient model might use either)
      const patientId = userProfile?.userId || userProfile?.patientId
      if (!patientId) {
        showToast('Unable to book appointment: Patient ID not found', 'error')
        return
      }
      
      const newAppointment = await appointmentAPI.create({
        patientId: patientId,
        clinicId: selectedClinic.id,
        doctorId: selectedDoctor.id,
        dateTime: localDateTimeString,
        apptStatus: 'SCHEDULED'
      })

      showToast('Appointment booked successfully!')
      
      // Close modal and reset booking state
      closeBookingModal()
      
      // Refresh appointments list
      await fetchAppointments()
    } catch (err) {
      showToast(err.message || 'Failed to book appointment', 'error')
    } finally {
      setLoading(false)
    }
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

  // Helper function to format opening hours
  const formatOpeningHours = (clinic) => {
    if (!clinic) return null

    const formatTime = (timeStr) => {
      if (!timeStr) return null
      // Handle both "HH:mm:ss" and "HH:mm" formats
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

  const currentView = getCurrentView()

  // Show loading state while auth is loading or userProfile is not ready
  if (authLoading || !userProfile) {
    return (
      <div className="patient-view">
        <Navbar />
        <div className="patient-layout">
          <div className="patient-main">
            <div className="loading">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  // If on profile page, render PatientProfile component
  if (getCurrentView() === 'profile') {
    return <PatientProfile />
  }

  return (
    <div className="patient-view">
      <Navbar />
      <div className="patient-layout">
        <div className="patient-main">
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
              duration={3000}
            />
          )}

          {currentView === 'dashboard' && (
            <>
              <div className="page-header">
                <h1>Home</h1>
                <p className="subtitle">Welcome back, {userProfile?.fname}!</p>
              </div>

              {/* Queue Number Section - Center Stage */}
              <div className="queue-display-section">
                <div className="queue-display-card">
                  <h2 className="queue-section-title">Your Queue Number</h2>
                  {queuePosition && selectedAppointment ? (
                    <div className="queue-active-display">
                      <div className="queue-number-large">
                        <span className="queue-number">{queuePosition.position || 'N/A'}</span>
                      </div>
                      <div className="queue-info">
                        <div className="queue-info-item">
                          <span className="queue-info-label">Total in Queue</span>
                          <span className="queue-info-value">{queuePosition.totalInQueue || 'N/A'}</span>
                        </div>
                        <div className="queue-info-item">
                          <span className="queue-info-label">Status</span>
                          <span className="queue-info-value">{queuePosition.status || 'N/A'}</span>
                        </div>
                        <div className="queue-info-item">
                          <span className="queue-info-label">Appointment</span>
                          <span className="queue-info-value">#{selectedAppointment}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="queue-inactive-display">
                      <div className="queue-inactive-icon">⏳</div>
                      <p className="queue-inactive-message">You are not checked in</p>
                      <p className="queue-inactive-submessage">Check in to an appointment to see your queue position</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Appointments Section */}
              <div className="section-card">
                <div className="section-header">
                  <h2>Upcoming Appointments</h2>
                  <button onClick={fetchAppointments} className="btn btn-secondary btn-sm">
                    Refresh
                  </button>
                </div>
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : getFilteredAppointments().length === 0 ? (
                  <div className="empty-state">
                    <p>No upcoming appointments found</p>
                  </div>
                ) : (
                  <div className="appointments-grid">
                    {getFilteredAppointments().slice(0, 3).map((apt) => (
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
                            🕐 {new Date(apt.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </p>
                          <p className="appointment-clinic">
                            🏥 {clinicNames[apt.clinicId] || `Clinic #${apt.clinicId}`}
                          </p>
                          {apt.doctorId && (
                            <p className="appointment-doctor">
                              👨‍⚕️ {doctorNames[apt.doctorId] || `Doctor #${apt.doctorId}`}
                            </p>
                          )}
                        </div>
                        <div className="appointment-actions">
                          <button
                            onClick={() => checkQueuePosition(apt.appointmentId)}
                            className="btn btn-secondary btn-sm"
                            disabled={loading}
                          >
                            Check Queue Position
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
                <h1>Appointments</h1>
              </div>

              {/* Tabs */}
              <div className="section-card">
                <div className="tabs-container">
                  <button
                    className={`tab-btn ${appointmentsTab === 'book' ? 'active' : ''}`}
                    onClick={() => setAppointmentsTab('book')}
                  >
                    Book New Appointment
                  </button>
                  <button
                    className={`tab-btn ${appointmentsTab === 'upcoming' ? 'active' : ''}`}
                    onClick={() => setAppointmentsTab('upcoming')}
                  >
                    Upcoming Appointments
                  </button>
                </div>
              </div>

              {/* Book New Appointment Tab */}
              {appointmentsTab === 'book' && (
                <>
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
                                    setFilterDoctorSearch(`${doctor.fname} ${doctor.lname}`)
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
                        <label>Clinic Name</label>
                        <input
                          type="text"
                          placeholder="Search clinics"
                          value={filterClinic}
                          onChange={(e) => setFilterClinic(e.target.value)}
                          className="input-sm"
                        />
                      </div>
                      <div className="form-group">
                        <label>Region</label>
                        <div className="searchable-dropdown">
                          <input
                            type="text"
                            placeholder="Search by region"
                            value={filterRegionSearch}
                            onChange={(e) => {
                              setFilterRegionSearch(e.target.value)
                              setShowRegionDropdown(true)
                            }}
                            onFocus={() => setShowRegionDropdown(true)}
                            onClick={(e) => e.stopPropagation()}
                            className="input-sm"
                          />
                          {showRegionDropdown && getFilteredRegions().length > 0 && (
                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              {getFilteredRegions().map((region) => (
                                <div
                                  key={region}
                                  className="dropdown-item"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setFilterRegion(region)
                                    setFilterRegionSearch(region)
                                    setShowRegionDropdown(false)
                                  }}
                                >
                                  {region}
                                </div>
                              ))}
                            </div>
                          )}
                          {filterRegion && (
                            <button
                              className="clear-filter-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                setFilterRegion('')
                                setFilterRegionSearch('')
                              }}
                              type="button"
                              aria-label="Clear region filter"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Specialty</label>
                        <div className="searchable-dropdown">
                          <input
                            type="text"
                            placeholder="Search by specialty"
                            value={filterSpecialtySearch}
                            onChange={(e) => {
                              setFilterSpecialtySearch(e.target.value)
                              setShowSpecialtyDropdown(true)
                            }}
                            onFocus={() => setShowSpecialtyDropdown(true)}
                            onClick={(e) => e.stopPropagation()}
                            className="input-sm"
                          />
                          {showSpecialtyDropdown && getFilteredSpecialties().length > 0 && (
                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              {getFilteredSpecialties().map((specialty) => (
                                <div
                                  key={specialty}
                                  className="dropdown-item"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setFilterSpecialty(specialty)
                                    setFilterSpecialtySearch(specialty)
                                    setShowSpecialtyDropdown(false)
                                  }}
                                >
                                  {specialty}
                                </div>
                              ))}
                            </div>
                          )}
                          {filterSpecialty && (
                            <button
                              className="clear-filter-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                setFilterSpecialty('')
                                setFilterSpecialtySearch('')
                              }}
                              type="button"
                              aria-label="Clear specialty filter"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {locationPermission === 'denied' && (
                      <div className="location-warning">
                        <p>📍 Location permission denied. Clinics will not be sorted by distance.</p>
                        <button onClick={requestLocationPermission} className="btn btn-secondary btn-sm">
                          Request Location Again
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Clinic Selection */}
                  <div className="section-card">
                    <div className="section-header">
                      <h2>Select Clinic</h2>
                      {userLocation && (
                        <span className="location-badge">📍 Sorted by distance</span>
                      )}
                    </div>
                    {loading ? (
                      <div className="loading">Loading clinics...</div>
                    ) : displayedClinics.length === 0 ? (
                      <div className="empty-state">
                        <p>No clinics found matching your filters</p>
                      </div>
                    ) : (
                      <>
                        <div className="clinics-grid">
                          {displayedClinics.map((clinic) => (
                            <div
                              key={clinic.id}
                              className="clinic-card"
                              onClick={() => handleClinicClick(clinic)}
                            >
                              <div className="clinic-header">
                                <h3>{clinic.name}</h3>
                              </div>
                              <div className="clinic-details">
                                <p><strong>Clinic ID:</strong> {clinic.id}</p>
                                <p><strong>Address:</strong> {clinic.address}</p>
                                {clinic.region && <p><strong>Region:</strong> {clinic.region}</p>}
                                {clinic.specialty && <p><strong>Specialty:</strong> {clinic.specialty}</p>}
                                {clinic.telephoneNo && <p><strong>Phone:</strong> {clinic.telephoneNo}</p>}
                                {clinic.distance !== null && clinic.distance !== undefined && (
                                  <p className="distance-info">
                                    <strong>Distance:</strong> {clinic.distance.toFixed(2)} km away
                                  </p>
                                )}
                                {formatOpeningHours(clinic) && (
                                  <div className="opening-hours">
                                    <p><strong>Opening Hours:</strong></p>
                                    <div className="opening-hours-list">
                                      {formatOpeningHours(clinic).map((schedule, index) => (
                                        <div key={index} className="opening-hours-item">
                                          <span className="opening-hours-day">{schedule.day}:</span>
                                          <span className="opening-hours-time">{schedule.times}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="pagination">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </button>
                            <span className="pagination-info">
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Upcoming Appointments Tab */}
              {appointmentsTab === 'upcoming' && (
                <div className="section-card">
                  {loading ? (
                    <div className="loading">Loading...</div>
                  ) : getFilteredAppointments().length === 0 ? (
                    <div className="empty-state">
                      <p>No upcoming appointments found</p>
                    </div>
                  ) : (
                    <div className="appointments-list">
                      {getFilteredAppointments().map((apt) => {
                        const within24Hours = isWithin24Hours(apt.dateTime)
                        return (
                          <div key={apt.appointmentId} className="appointment-card-large">
                            <div className="appointment-main">
                              <div className="appointment-header">
                                <h3>Appointment #{apt.appointmentId}</h3>
                              </div>
                              <div className="appointment-status-badge">
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
                                  <span className="detail-label">Clinic:</span>
                                  <span className="detail-value">
                                    {clinicNames[apt.clinicId] || `Clinic #${apt.clinicId}`}
                                  </span>
                                </div>
                                {apt.doctorId && (
                                  <div className="detail-item">
                                    <span className="detail-label">Doctor:</span>
                                    <span className="detail-value">
                                      {doctorNames[apt.doctorId] || `Doctor #${apt.doctorId}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="appointment-actions-vertical">
                              {apt.apptStatus !== 'CANCELLED' && (
                                <>
                                  <button
                                    onClick={() => handleRescheduleClick(apt)}
                                    className="btn btn-primary reschedule-btn"
                                    disabled={loading || within24Hours}
                                  >
                                    Reschedule
                                  </button>
                                  <button
                                    onClick={() => handleCancelClick(apt)}
                                    className="btn btn-warning reschedule-btn"
                                    disabled={loading || within24Hours}
                                  >
                                    Cancel
                                  </button>
                                  {within24Hours && (
                                    <p className="reschedule-disabled-message">
                                      Cannot reschedule or cancel appointments within 24 hours
                                    </p>
                                  )}
                                </>
                              )}
                              {apt.apptStatus === 'CANCELLED' && (
                                <p className="reschedule-disabled-message">
                                  This appointment has been cancelled
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Medical History View */}
          {currentView === 'medical-history' && (
            <>
              <div className="page-header">
                <h1>Medical History</h1>
              </div>

              {/* Filter Tabs */}
              <div className="section-card">
                <div className="tabs-container">
                  <button
                    className={`tab-btn ${medicalHistoryFilter === 'past' ? 'active' : ''}`}
                    onClick={() => {
                      setMedicalHistoryFilter('past')
                      setExpandedAppointmentId(null)
                    }}
                  >
                    Past Appointments
                  </button>
                  <button
                    className={`tab-btn ${medicalHistoryFilter === 'archive' ? 'active' : ''}`}
                    onClick={() => {
                      setMedicalHistoryFilter('archive')
                      setExpandedAppointmentId(null)
                    }}
                  >
                    Archive (Cancelled)
                  </button>
                </div>
              </div>

              {/* Past Appointments Tab */}
              {medicalHistoryFilter === 'past' && (
                <div className="section-card">
                  {loading ? (
                    <div className="loading">Loading...</div>
                  ) : getPastAppointments().length === 0 ? (
                    <div className="empty-state">
                      <p>No past appointments found</p>
                    </div>
                  ) : (
                    <div className="appointments-list">
                      {getPastAppointments().map((apt) => {
                        const isExpanded = expandedAppointmentId === apt.appointmentId
                        return (
                          <div key={apt.appointmentId} className="appointment-card-large clickable-appointment">
                            <div 
                              className="appointment-main"
                              onClick={() => setExpandedAppointmentId(isExpanded ? null : apt.appointmentId)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="appointment-header">
                                <h3>Appointment #{apt.appointmentId}</h3>
                                <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                              </div>
                              <div className="appointment-status-badge">
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
                                  <span className="detail-label">Clinic:</span>
                                  <span className="detail-value">
                                    {clinicNames[apt.clinicId] || `Clinic #${apt.clinicId}`}
                                  </span>
                                </div>
                                {apt.doctorId && (
                                  <div className="detail-item">
                                    <span className="detail-label">Doctor:</span>
                                    <span className="detail-value">
                                      {doctorNames[apt.doctorId] || `Doctor #${apt.doctorId}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {isExpanded && apt.treatmentSummary && (
                                <div className="treatment-summary-section">
                                  <h4>Treatment Summary</h4>
                                  <div className="treatment-summary-content">
                                    {apt.treatmentSummary}
                                  </div>
                                </div>
                              )}
                              {isExpanded && !apt.treatmentSummary && (
                                <div className="treatment-summary-section">
                                  <p className="no-treatment-summary">No treatment summary available for this appointment.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Archive (Cancelled) Tab */}
              {medicalHistoryFilter === 'archive' && (
                <div className="section-card">
                  {loading ? (
                    <div className="loading">Loading...</div>
                  ) : getCancelledAppointments().length === 0 ? (
                    <div className="empty-state">
                      <p>No cancelled appointments found</p>
                    </div>
                  ) : (
                    <div className="appointments-list">
                      {getCancelledAppointments().map((apt) => (
                        <div key={apt.appointmentId} className="appointment-card-large">
                          <div className="appointment-main">
                            <div className="appointment-header">
                              <h3>Appointment #{apt.appointmentId}</h3>
                            </div>
                            <div className="appointment-status-badge">
                              <span className={`status-badge status-${apt.apptStatus?.toLowerCase() || 'cancelled'}`}>
                                {apt.apptStatus || 'CANCELLED'}
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
                                <span className="detail-label">Clinic:</span>
                                <span className="detail-value">
                                  {clinicNames[apt.clinicId] || `Clinic #${apt.clinicId}`}
                                </span>
                              </div>
                              {apt.doctorId && (
                                <div className="detail-item">
                                  <span className="detail-label">Doctor:</span>
                                  <span className="detail-value">
                                    {doctorNames[apt.doctorId] || `Doctor #${apt.doctorId}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Cancel Confirmation Modal */}
          {appointmentToCancel && (
            <div className="modal-overlay" onClick={() => setAppointmentToCancel(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Cancel Appointment</h2>
                  <button className="modal-close" onClick={() => setAppointmentToCancel(null)}>×</button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to cancel this appointment?</p>
                  <div className="booking-details">
                    <div className="detail-item">
                      <span className="detail-label">Appointment ID:</span>
                      <span className="detail-value">#{appointmentToCancel.appointmentId}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Date & Time:</span>
                      <span className="detail-value">
                        {new Date(appointmentToCancel.dateTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Clinic:</span>
                      <span className="detail-value">
                        {clinicNames[appointmentToCancel.clinicId] || `Clinic #${appointmentToCancel.clinicId}`}
                      </span>
                    </div>
                    {appointmentToCancel.doctorId && (
                      <div className="detail-item">
                        <span className="detail-label">Doctor:</span>
                        <span className="detail-value">
                          {doctorNames[appointmentToCancel.doctorId] || `Doctor #${appointmentToCancel.doctorId}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="modal-actions">
                    <button
                      onClick={handleConfirmCancel}
                      className="btn btn-warning"
                      disabled={loading}
                    >
                      {loading ? 'Cancelling...' : 'Confirm Cancel'}
                    </button>
                    <button
                      onClick={() => setAppointmentToCancel(null)}
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
                                  <span className="time-slot-count">{count}/3</span>
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
                          onClick={appointmentToReschedule ? handleRescheduleAppointment : handleBookAppointment}
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading 
                            ? (appointmentToReschedule ? 'Rescheduling...' : 'Booking...') 
                            : (appointmentToReschedule ? 'Confirm Reschedule' : 'Confirm Booking')
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
