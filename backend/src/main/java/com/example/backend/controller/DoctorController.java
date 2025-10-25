package com.example.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.ErrorResponse;
import com.example.backend.model.Doctor;
import com.example.backend.service.DoctorService;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Allow CORS for testing
@Tag(name = "Doctors", description = "Doctor CRUD operations")
public class DoctorController {

    private final DoctorService doctorService;

    // GET /api/doctors/health - Health check for doctor service
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Doctor service is running!");
    }

    // GET /api/doctors - Get all doctors
    @GetMapping
    public ResponseEntity<List<Doctor>> getAllDoctors() {
        try {
            List<Doctor> doctors = doctorService.getAllDoctors();
            return ResponseEntity.ok(doctors);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/doctors/{id} - Get doctor by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getDoctorById(@PathVariable Long id) {
        try {
            return doctorService.getDoctorById(id)
                    .map(doctor -> ResponseEntity.ok(doctor))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            ErrorResponse errorResponse = new ErrorResponse(
                    500,
                    "Internal Server Error",
                    "An unexpected error occurred: " + e.getMessage(),
                    "/api/doctors/" + id);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // GET /api/doctors/clinic/{clinicId} - Get doctors by clinic
    @GetMapping("/clinic/{clinicId}")
    public ResponseEntity<List<Doctor>> getDoctorsByClinic(@PathVariable Long clinicId) {
        try {
            List<Doctor> doctors = doctorService.getDoctorsByClinic(clinicId);
            return ResponseEntity.ok(doctors);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // POST /api/doctors - Create new doctor
    @PostMapping
    public ResponseEntity<?> createDoctor(@RequestBody Doctor doctor) {
        try {
            // Validate required fields
            if (doctor.getFname() == null || doctor.getFname().isEmpty() ||
                    doctor.getLname() == null || doctor.getLname().isEmpty() ||
                    doctor.getAssignedClinic() == null) {
                ErrorResponse errorResponse = new ErrorResponse(
                        400,
                        "Bad Request",
                        "Missing required fields: fname, lname, or assignedClinic",
                        "/api/doctors");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Doctor createdDoctor = doctorService.createDoctor(doctor);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdDoctor);
        } catch (IllegalArgumentException e) {
            ErrorResponse errorResponse = new ErrorResponse(
                    400,
                    "Bad Request",
                    e.getMessage(),
                    "/api/doctors");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            // Log the actual error for debugging
            System.err.println("Error creating doctor: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();

            ErrorResponse errorResponse = new ErrorResponse(
                    500,
                    "Internal Server Error",
                    "An unexpected error occurred: " + e.getMessage(),
                    "/api/doctors");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // PUT /api/doctors/{id} - Update doctor
    @PutMapping("/{id}")
    public ResponseEntity<?> updateDoctor(@PathVariable Long id, @RequestBody Doctor doctor) {
        try {
            return doctorService.updateDoctor(id, doctor)
                    .map(updatedDoctor -> ResponseEntity.ok(updatedDoctor))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            ErrorResponse errorResponse = new ErrorResponse(
                    500,
                    "Internal Server Error",
                    "An unexpected error occurred: " + e.getMessage(),
                    "/api/doctors/" + id);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // DELETE /api/doctors/{id} - Delete doctor
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable Long id) {
        try {
            boolean deleted = doctorService.deleteDoctor(id);
            return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
