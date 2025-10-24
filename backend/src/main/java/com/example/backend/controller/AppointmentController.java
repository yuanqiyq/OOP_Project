package com.example.backend.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.ErrorResponse;
import com.example.backend.exception.DoubleBookingException;
import com.example.backend.model.appointments.Appointment;
import com.example.backend.service.AppointmentService;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Allow CORS for testing
@Tag(name = "Appointments", description = "Appointment management endpoints")

public class AppointmentController {

    private final AppointmentService appointmentService;

    // GET /api/appointments - Get all appointments
    @GetMapping
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        try {
            List<Appointment> appointments = appointmentService.getAllAppointments();
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/{id} - Get appointment by ID
    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(@PathVariable Long id) {
        try {
            return appointmentService.getAppointmentById(id)
                    .map(appointment -> ResponseEntity.ok(appointment))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // POST /api/appointments - Create new appointment
    @PostMapping
    public ResponseEntity<?> createAppointment(@RequestBody Appointment appointment) {
        try {
            // Validate required fields
            if (appointment.getPatientId() == null || appointment.getClinicId() == null ||
                    appointment.getDateTime() == null || appointment.getDoctorId() == null) {
                return ResponseEntity.badRequest().build();
            }

            Appointment createdAppointment = appointmentService.createAppointment(appointment);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdAppointment);
        } catch (DoubleBookingException e) {
            // Handle double booking error with HTTP 409 Conflict
            ErrorResponse errorResponse = new ErrorResponse(
                    409,
                    "Conflict",
                    e.getMessage(),
                    "/api/appointments");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
        } catch (Exception e) {
            // Log the actual error for debugging
            System.err.println("Error creating appointment: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();

            ErrorResponse errorResponse = new ErrorResponse(
                    500,
                    "Internal Server Error",
                    "An unexpected error occurred: " + e.getMessage(),
                    "/api/appointments");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // PUT /api/appointments/{id} - Update appointment
    @PutMapping("/{id}")
    public ResponseEntity<Appointment> updateAppointment(@PathVariable Long id,
            @RequestBody Appointment appointment) {
        try {
            return appointmentService.updateAppointment(id, appointment)
                    .map(updatedAppointment -> ResponseEntity.ok(updatedAppointment))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // DELETE /api/appointments/{id} - Delete appointment
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable Long id) {
        try {
            boolean deleted = appointmentService.deleteAppointment(id);
            return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/patient/{patientId} - Get appointments by patient ID
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByPatientId(@PathVariable Long patientId) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsByPatientId(patientId);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/clinic/{clinicId} - Get appointments by clinic ID
    @GetMapping("/clinic/{clinicId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByClinicId(@PathVariable Long clinicId) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsByClinicId(clinicId);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/doctor/{doctorId} - Get appointments by doctor ID
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByDoctorId(@PathVariable Long doctorId) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsByDoctorId(doctorId);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/status/{status} - Get appointments by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Appointment>> getAppointmentsByStatus(@PathVariable String status) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsByStatus(status);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/patient/{patientId}/status/{status} - Get appointments
    // by patient ID and status
    @GetMapping("/patient/{patientId}/status/{status}")
    public ResponseEntity<List<Appointment>> getAppointmentsByPatientIdAndStatus(
            @PathVariable Long patientId, @PathVariable String status) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsByPatientIdAndStatus(patientId, status);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/clinic/{clinicId}/status/{status} - Get appointments by
    // clinic ID and status
    @GetMapping("/clinic/{clinicId}/status/{status}")
    public ResponseEntity<List<Appointment>> getAppointmentsByClinicIdAndStatus(
            @PathVariable Long clinicId, @PathVariable String status) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsByClinicIdAndStatus(clinicId, status);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/date-range - Get appointments by date range
    @GetMapping("/date-range")
    public ResponseEntity<List<Appointment>> getAppointmentsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsByDateRange(startDate, endDate);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/patient/{patientId}/date-range - Get appointments by
    // patient ID and date range
    @GetMapping("/patient/{patientId}/date-range")
    public ResponseEntity<List<Appointment>> getAppointmentsByPatientIdAndDateRange(
            @PathVariable Long patientId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsByPatientIdAndDateRange(
                    patientId, startDate, endDate);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/clinic/{clinicId}/date-range - Get appointments by
    // clinic ID and date range
    @GetMapping("/clinic/{clinicId}/date-range")
    public ResponseEntity<List<Appointment>> getAppointmentsByClinicIdAndDateRange(
            @PathVariable Long clinicId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsByClinicIdAndDateRange(
                    clinicId, startDate, endDate);
            return ResponseEntity.ok(appointments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // PATCH /api/appointments/{id}/status - Update appointment status
    @PatchMapping("/{id}/status")
    public ResponseEntity<Appointment> updateAppointmentStatus(@PathVariable Long id,
            @RequestBody Map<String, String> statusUpdate) {
        try {
            String status = statusUpdate.get("status");
            if (status == null || status.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            return appointmentService.updateAppointmentStatus(id, status)
                    .map(updatedAppointment -> ResponseEntity.ok(updatedAppointment))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/appointments/health - Health check for appointment service
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Appointment service is running!");
    }
}
