import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { appointmentAPI, queueAPI, adminAPI, clinicAPI, doctorAPI } from '../lib/api'
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

  // Booking state
  const [clinics, setClinics] = useState([])
  const [doctors, setDoctors] = useState([])
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
    if (location.pathname.includes('/book')) return 'book'
    if (location.pathname.includes('/appointments')) return 'appointments'
    if (location.pathname.includes('/queue')) return 'queue'
    if (location.pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  // Fetch clinics and doctors for booking
  useEffect(() => {
    if (getCurrentView() === 'book') {
      fetchClinics()
      fetchDoctors()
      requestLocationPermission()
    }
  }, [location.pathname])

  // Filter clinics when filters change
  useEffect(() => {
    if (getCurrentView() === 'book') {
      applyFilters()
      setCurrentPage(1) // Reset to first page when filters change
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDoctor, filterClinic, filterRegion, filterSpecialty, filterDate, clinics, userLocation])

  // Update displayed clinics when filtered clinics or page changes
  useEffect(() => {
    if (getCurrentView() === 'book') {
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
    return count < 5
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
      
      const newAppointment = await appointmentAPI.create({
        patientId: userProfile.userId,
        clinicId: selectedClinic.id,
        doctorId: selectedDoctor.id,
        dateTime: localDateTimeString,
        apptStatus: 'SCHEDULED'
      })

      setSuccess('Appointment booked successfully!')
      
      // Close modal and reset booking state
      closeBookingModal()
      
      // Refresh appointments list
      await fetchAppointments()
      
      setTimeout(() => {
        setSuccess('')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to book appointment')
      setTimeout(() => setError(''), 5000)
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

          {currentView === 'book' && (
            <>
              <div className="page-header">
                <h1>Book Appointment</h1>
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

              {/* Booking Modal */}
              {showBookingModal && selectedClinic && (
                <div className="modal-overlay" onClick={closeBookingModal}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2>Book Appointment - {selectedClinic.name}</h2>
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
                                    title={!available ? `Slot full (${count}/5 appointments)` : 'Click to select'}
                                  >
                                    <span className="time-slot-time">{slot.timeString}</span>
                                    {!available && (
                                      <span className="time-slot-badge">Full</span>
                                    )}
                                    {count > 0 && available && (
                                      <span className="time-slot-count">{count}/5</span>
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
                              onClick={handleBookAppointment}
                              className="btn btn-primary"
                              disabled={loading}
                            >
                              {loading ? 'Booking...' : 'Confirm Booking'}
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
