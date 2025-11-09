package com.example.backend.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.example.backend.exception.DoubleBookingException;
import com.example.backend.model.Patient;
import com.example.backend.model.Doctor;
import com.example.backend.model.clinic.Clinic;
import com.example.backend.model.appointments.Appointment;
import com.example.backend.model.appointments.AppointmentStatus;
import com.example.backend.model.notification.NotificationRequest;
import com.example.backend.repo.AppointmentRepository;
import com.example.backend.repo.ClinicRepository;
import com.example.backend.repo.DoctorRepository;
import com.example.backend.repo.PatientRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final NotificationService notificationService;
    private final PatientRepository patientRepository;
    private final ClinicRepository clinicRepository;
    private final DoctorRepository doctorRepository;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    // Get all appointments
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    // Get appointment by ID
    public Optional<Appointment> getAppointmentById(Long appointmentId) {
        return appointmentRepository.findById(appointmentId);
    }

    // Create a new appointment
    public Appointment createAppointment(Appointment appointment) {
        // Check for double booking (same clinic, doctor, and time)
        if (isDoubleBooking(appointment.getClinicId(), appointment.getDoctorId(), appointment.getDateTime())) {
            throw new DoubleBookingException(
                    "Double booking detected: An appointment already exists for this doctor at the specified time and clinic");
        }

        // Always set status to SCHEDULED for new appointments
        appointment.setApptStatus(AppointmentStatus.SCHEDULED);

        // Set created timestamp
        if (appointment.getCreatedAt() == null) {
            appointment.setCreatedAt(LocalDateTime.now());
        }

        Appointment savedAppointment = appointmentRepository.save(appointment);

        // Send appointment confirmation email
        sendAppointmentConfirmationNotification(savedAppointment);

        return savedAppointment;
    }

    /**
     * Sends appointment confirmation email notification
     */
    private void sendAppointmentConfirmationNotification(Appointment appointment) {
        try {
            // Fetch related entities
            Patient patient = patientRepository.findById(appointment.getPatientId()).orElse(null);
            Clinic clinic = clinicRepository.findById(appointment.getClinicId()).orElse(null);
            Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);

            if (patient == null || clinic == null || doctor == null || patient.getEmail() == null) {
                log.warn(
                        "Cannot send appointment confirmation: missing patient, clinic, doctor, or email for appointment {}",
                        appointment.getAppointmentId());
                return;
            }

            // Build notification request
            String patientName = formatFullName(patient.getFname(), patient.getLname());
            String doctorName = formatFullName(doctor.getFname(), doctor.getLname());
            String appointmentDateTime = appointment.getDateTime().format(DATE_TIME_FORMATTER);

            NotificationRequest request = new NotificationRequest();
            request.setToEmail(patient.getEmail());
            request.setPatientName(patientName);
            request.setClinicName(clinic.getName());
            request.setDoctorName(doctorName);
            request.setAppointmentDateTime(appointmentDateTime);
            request.setQueueNumber(0); // Queue number not applicable for appointment confirmation
            request.setRoomNumber(null); // Room number not applicable
            request.setAppointmentNumber(appointment.getAppointmentId());

            notificationService.sendAppointmentConfirmationEmail(request);
            log.info("Sent appointment confirmation email to {} for appointment {}", patient.getEmail(),
                    appointment.getAppointmentId());

        } catch (IOException e) {
            log.error("Failed to send appointment confirmation email for appointment {}: {}",
                    appointment.getAppointmentId(), e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error sending appointment confirmation for appointment {}: {}",
                    appointment.getAppointmentId(), e.getMessage());
        }
    }

    /**
     * Formats first and last name with proper spacing
     */
    private String formatFullName(String fname, String lname) {
        String firstName = fname != null ? fname.trim() : "";
        String lastName = lname != null ? lname.trim() : "";

        if (firstName.isEmpty() && lastName.isEmpty()) {
            return "";
        } else if (firstName.isEmpty()) {
            return lastName;
        } else if (lastName.isEmpty()) {
            return firstName;
        } else {
            return firstName + " " + lastName;
        }
    }

    // Check for double booking
    public boolean isDoubleBooking(Long clinicId, Long doctorId, LocalDateTime dateTime) {
        return appointmentRepository.existsByClinicIdAndDoctorIdAndDateTime(clinicId, doctorId, dateTime);
    }

    // Update appointment
    public Optional<Appointment> updateAppointment(Long appointmentId, Appointment updatedAppointment) {
        return appointmentRepository.findById(appointmentId)
                .map(existingAppointment -> {
                    // Update fields
                    if (updatedAppointment.getPatientId() != null) {
                        existingAppointment.setPatientId(updatedAppointment.getPatientId());
                    }
                    if (updatedAppointment.getClinicId() != null) {
                        existingAppointment.setClinicId(updatedAppointment.getClinicId());
                    }
                    if (updatedAppointment.getDoctorId() != null) {
                        existingAppointment.setDoctorId(updatedAppointment.getDoctorId());
                    }
                    if (updatedAppointment.getDateTime() != null) {
                        existingAppointment.setDateTime(updatedAppointment.getDateTime());
                    }
                    if (updatedAppointment.getApptStatus() != null) {
                        existingAppointment.setApptStatus(updatedAppointment.getApptStatus());
                    }
                    if (updatedAppointment.getTreatmentSummary() != null) {
                        existingAppointment.setTreatmentSummary(updatedAppointment.getTreatmentSummary());
                    }

                    return appointmentRepository.save(existingAppointment);
                });
    }

    // Delete appointment by ID
    public boolean deleteAppointment(Long appointmentId) {
        if (appointmentRepository.existsById(appointmentId)) {
            appointmentRepository.deleteById(appointmentId);
            return true;
        }
        return false;
    }

    // Get appointments by patient ID
    public List<Appointment> getAppointmentsByPatientId(Long patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    // Get appointments by clinic ID
    public List<Appointment> getAppointmentsByClinicId(Long clinicId) {
        return appointmentRepository.findByClinicId(clinicId);
    }

    // Get appointments by doctor ID
    public List<Appointment> getAppointmentsByDoctorId(Long doctorId) {
        return appointmentRepository.findByDoctorId(doctorId);
    }

    // Get appointments by status
    public List<Appointment> getAppointmentsByStatus(String status) {
        return appointmentRepository.findByApptStatus(status);
    }

    // Get appointments by patient ID and status
    public List<Appointment> getAppointmentsByPatientIdAndStatus(Long patientId, String status) {
        return appointmentRepository.findByPatientIdAndApptStatus(patientId, status);
    }

    // Get appointments by clinic ID and status
    public List<Appointment> getAppointmentsByClinicIdAndStatus(Long clinicId, String status) {
        return appointmentRepository.findByClinicIdAndApptStatus(clinicId, status);
    }

    // Get appointments by date range
    public List<Appointment> getAppointmentsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return appointmentRepository.findByDateTimeBetween(startDate, endDate);
    }

    // Get appointments by patient ID and date range
    public List<Appointment> getAppointmentsByPatientIdAndDateRange(Long patientId,
            LocalDateTime startDate,
            LocalDateTime endDate) {
        return appointmentRepository.findByPatientIdAndDateTimeBetween(patientId, startDate, endDate);
    }

    // Get appointments by clinic ID and date range
    public List<Appointment> getAppointmentsByClinicIdAndDateRange(Long clinicId,
            LocalDateTime startDate,
            LocalDateTime endDate) {
        return appointmentRepository.findByClinicIdAndDateTimeBetween(clinicId, startDate, endDate);
    }

    // Check if appointment exists by patient ID and date time
    public boolean appointmentExistsByPatientIdAndDateTime(Long patientId, LocalDateTime dateTime) {
        return appointmentRepository.existsByPatientIdAndDateTime(patientId, dateTime);
    }

    // Check if appointment exists by clinic ID and date time
    public boolean appointmentExistsByClinicIdAndDateTime(Long clinicId, LocalDateTime dateTime) {
        return appointmentRepository.existsByClinicIdAndDateTime(clinicId, dateTime);
    }

    // Update appointment status
    public Optional<Appointment> updateAppointmentStatus(Long appointmentId, String status) {
        return appointmentRepository.findById(appointmentId)
                .map(appointment -> {
                    AppointmentStatus appointmentStatus = AppointmentStatus.fromValue(status);
                    appointment.setApptStatus(appointmentStatus);
                    return appointmentRepository.save(appointment);
                });
    }
}
