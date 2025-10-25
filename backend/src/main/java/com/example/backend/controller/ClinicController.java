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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.ErrorResponse;
import com.example.backend.model.clinic.Clinic;
import com.example.backend.service.ClinicService;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/clinics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Allow CORS for testing
@Tag(name = "Clinics", description = "Clinic CRUD operations")
public class ClinicController {

    private final ClinicService clinicService;

    // GET /api/clinics - Get all clinics
    @GetMapping
    public ResponseEntity<List<Clinic>> getAllClinics() {
        try {
            List<Clinic> clinics = clinicService.getAllClinics();
            return ResponseEntity.ok(clinics);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/clinics/{id} - Get clinic by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getClinicById(@PathVariable Long id) {
        try {
            return clinicService.getClinicById(id)
                    .map(clinic -> ResponseEntity.ok(clinic))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            ErrorResponse errorResponse = new ErrorResponse(
                    500,
                    "Internal Server Error",
                    "An unexpected error occurred: " + e.getMessage(),
                    "/api/clinics/" + id);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // POST /api/clinics - Create new clinic
    @PostMapping
    public ResponseEntity<?> createClinic(@RequestBody Clinic clinic) {
        try {
            // Validate required fields
            if (clinic.getName() == null || clinic.getName().isEmpty() ||
                    clinic.getAddress() == null || clinic.getAddress().isEmpty() ||
                    clinic.getTelephoneNo() == null || clinic.getTelephoneNo().isEmpty()) {
                ErrorResponse errorResponse = new ErrorResponse(
                        400,
                        "Bad Request",
                        "Missing required fields: name, address, or telephoneNo",
                        "/api/clinics");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Clinic createdClinic = clinicService.createClinic(clinic);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdClinic);
        } catch (IllegalArgumentException e) {
            ErrorResponse errorResponse = new ErrorResponse(
                    400,
                    "Bad Request",
                    e.getMessage(),
                    "/api/clinics");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            // Log the actual error for debugging
            System.err.println("Error creating clinic: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();

            ErrorResponse errorResponse = new ErrorResponse(
                    500,
                    "Internal Server Error",
                    "An unexpected error occurred: " + e.getMessage(),
                    "/api/clinics");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // PUT /api/clinics/{id} - Update clinic
    @PutMapping("/{id}")
    public ResponseEntity<?> updateClinic(@PathVariable Long id, @RequestBody Clinic clinic) {
        try {
            return clinicService.updateClinic(id, clinic)
                    .map(updatedClinic -> ResponseEntity.ok(updatedClinic))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            ErrorResponse errorResponse = new ErrorResponse(
                    500,
                    "Internal Server Error",
                    "An unexpected error occurred: " + e.getMessage(),
                    "/api/clinics/" + id);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // DELETE /api/clinics/{id} - Delete clinic
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClinic(@PathVariable Long id) {
        try {
            boolean deleted = clinicService.deleteClinic(id);
            return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/clinics/region/{region} - Get clinics by region
    @GetMapping("/region/{region}")
    public ResponseEntity<List<Clinic>> getClinicsByRegion(@PathVariable String region) {
        try {
            List<Clinic> clinics = clinicService.getClinicsByRegion(region);
            return ResponseEntity.ok(clinics);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/clinics/specialty/{specialty} - Get clinics by specialty
    @GetMapping("/specialty/{specialty}")
    public ResponseEntity<List<Clinic>> getClinicsBySpecialty(@PathVariable String specialty) {
        try {
            List<Clinic> clinics = clinicService.getClinicsBySpecialty(specialty);
            return ResponseEntity.ok(clinics);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/clinics/area/{area} - Get clinics by area
    @GetMapping("/area/{area}")
    public ResponseEntity<List<Clinic>> getClinicsByArea(@PathVariable String area) {
        try {
            List<Clinic> clinics = clinicService.getClinicsByArea(area);
            return ResponseEntity.ok(clinics);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/clinics/type - Get clinics by clinic type (query param)
    @GetMapping("/type")
    public ResponseEntity<List<Clinic>> getClinicsByType(@RequestParam String clinicType) {
        try {
            List<Clinic> clinics = clinicService.getClinicsByClinicType(clinicType);
            return ResponseEntity.ok(clinics);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // GET /api/clinics/health - Health check for clinic service
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Clinic service is running!");
    }
}
