package com.example.backend.controller;

import com.example.backend.model.Patient;
import com.example.backend.model.Staff;
import com.example.backend.dto.StaffDTO;
import com.example.backend.dto.CreateStaffRequestDTO;
import com.example.backend.dto.CreatePatientRequestDTO;
import com.example.backend.dto.UpdateStaffRequestDTO;
import com.example.backend.dto.ErrorResponse;
import com.example.backend.service.PatientService;
import com.example.backend.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Allow CORS for testing
public class AdminController {
    
    private final PatientService patientService;
    private final StaffService staffService;
    
    // GET /api/admin/patients - Get all patients
    @GetMapping("/patients")
    public ResponseEntity<List<Patient>> getAllPatients() {
        try {
            List<Patient> patients = patientService.getAllPatients();
            return ResponseEntity.ok(patients);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/patients/{id} - Get patient by ID
    @GetMapping("/patients/{id}")
    public ResponseEntity<Patient> getPatientById(@PathVariable Long id) {
        try {
            return patientService.getPatientById(id)
                    .map(patient -> ResponseEntity.ok(patient))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/patients/email/{email} - Get patient by email
    @GetMapping("/patients/email/{email}")
    public ResponseEntity<Patient> getPatientByEmail(@PathVariable String email) {
        try {
            return patientService.getPatientByEmail(email)
                    .map(patient -> ResponseEntity.ok(patient))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/patients/ic/{patientIc} - Get patient by patient IC
    @GetMapping("/patients/ic/{patientIc}")
    public ResponseEntity<Patient> getPatientByPatientIc(@PathVariable String patientIc) {
        try {
            return patientService.getPatientByPatientIc(patientIc)
                    .map(patient -> ResponseEntity.ok(patient))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/patients/gender/{gender} - Get patients by gender
    @GetMapping("/patients/gender/{gender}")
    public ResponseEntity<List<Patient>> getPatientsByGender(@PathVariable String gender) {
        try {
            List<Patient> patients = patientService.getPatientsByGender(gender);
            return ResponseEntity.ok(patients);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/patients/blood-type/{bloodType} - Get patients by blood type
    @GetMapping("/patients/blood-type/{bloodType}")
    public ResponseEntity<List<Patient>> getPatientsByBloodType(@PathVariable String bloodType) {
        try {
            List<Patient> patients = patientService.getPatientsByBloodType(bloodType);
            return ResponseEntity.ok(patients);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/patients/age-range?minAge={minAge}&maxAge={maxAge} - Get patients by age range
    @GetMapping("/patients/age-range")
    public ResponseEntity<List<Patient>> getPatientsByAgeRange(
            @RequestParam int minAge, 
            @RequestParam int maxAge) {
        try {
            List<Patient> patients = patientService.getPatientsByAgeRange(minAge, maxAge);
            return ResponseEntity.ok(patients);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // POST /api/admin/patients - Create a new patient
    @PostMapping("/patients")
    public ResponseEntity<Patient> createPatient(@Valid @RequestBody CreatePatientRequestDTO requestDTO) {
        try {
            Patient createdPatient = patientService.createPatientFromDTO(requestDTO);
            return ResponseEntity.ok(createdPatient);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // PUT /api/admin/patients/{id} - Update patient details
    @PutMapping("/patients/{id}")
    public ResponseEntity<?> updatePatientDetails(@PathVariable Long id, @RequestBody Patient updatedPatient) {
        try {
            return patientService.updatePatientDetails(id, updatedPatient)
                    .map(patient -> ResponseEntity.ok(patient))
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            ErrorResponse errorResponse = new ErrorResponse(
                    400,
                    "Bad Request",
                    e.getMessage(),
                    "/api/admin/patients/" + id);
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            // Log the error for debugging
            System.err.println("Error updating patient: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();
            ErrorResponse errorResponse = new ErrorResponse(
                    500,
                    "Internal Server Error",
                    "An unexpected error occurred: " + e.getMessage(),
                    "/api/admin/patients/" + id);
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    // DELETE /api/admin/patients/{id} - Delete patient by ID
    @DeleteMapping("/patients/{id}")
    public ResponseEntity<Void> deletePatient(@PathVariable Long id) {
        try {
            // Check if patient exists before attempting to delete
            if (patientService.getPatientById(id).isPresent()) {
                patientService.deletePatient(id);
                return ResponseEntity.noContent().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/patients/count - Get patient count
    @GetMapping("/patients/count")
    public ResponseEntity<Long> getPatientCount() {
        try {
            long count = patientService.getPatientCount();
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // ==================== STAFF ENDPOINTS ====================
    
    // GET /api/admin/staff - Get all staff
    @GetMapping("/staff")
    public ResponseEntity<List<StaffDTO>> getAllStaff() {
        try {
            List<Staff> staff = staffService.getAllStaff();
            List<StaffDTO> staffDTOs = staff.stream()
                    .map(StaffDTO::fromStaff)
                    .toList();
            return ResponseEntity.ok(staffDTOs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/staff/{id} - Get staff by ID
    @GetMapping("/staff/{id}")
    public ResponseEntity<StaffDTO> getStaffById(@PathVariable Long id) {
        try {
            return staffService.getStaffById(id)
                    .map(staff -> ResponseEntity.ok(StaffDTO.fromStaff(staff)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/staff/email/{email} - Get staff by email
    @GetMapping("/staff/email/{email}")
    public ResponseEntity<Staff> getStaffByEmail(@PathVariable String email) {
        try {
            return staffService.getStaffByEmail(email)
                    .map(staff -> ResponseEntity.ok(staff))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/staff/clinic/{clinicId} - Get staff by clinic ID
    @GetMapping("/staff/clinic/{clinicId}")
    public ResponseEntity<List<StaffDTO>> getStaffByClinicId(@PathVariable Long clinicId) {
        try {
            List<Staff> staff = staffService.getStaffByClinicId(clinicId);
            List<StaffDTO> staffDTOs = staff.stream()
                    .map(StaffDTO::fromStaff)
                    .toList();
            return ResponseEntity.ok(staffDTOs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/staff/clinic/{clinicId}/ordered - Get staff by clinic ID (ordered by first name)
    @GetMapping("/staff/clinic/{clinicId}/ordered")
    public ResponseEntity<List<Staff>> getStaffByClinicIdOrdered(@PathVariable Long clinicId) {
        try {
            List<Staff> staff = staffService.getStaffByClinicIdOrdered(clinicId);
            return ResponseEntity.ok(staff);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // // GET /api/admin/staff/role/{role} - Get staff by role
    // @GetMapping("/staff/role/{role}")
    // public ResponseEntity<List<Staff>> getStaffByRole(@PathVariable String role) {
    //     try {
    //         List<Staff> staff = staffService.getStaffByRole(role);
    //         return ResponseEntity.ok(staff);
    //     } catch (Exception e) {
    //         return ResponseEntity.internalServerError().build();
    //     }
    // }
    
    // // GET /api/admin/staff/role/{role}/clinic/{clinicId} - Get staff by role and clinic
    // @GetMapping("/staff/role/{role}/clinic/{clinicId}")
    // public ResponseEntity<List<Staff>> getStaffByRoleAndClinic(@PathVariable String role, @PathVariable Long clinicId) {
    //     try {
    //         List<Staff> staff = staffService.getStaffByRoleAndClinic(role, clinicId);
    //         return ResponseEntity.ok(staff);
    //     } catch (Exception e) {
    //         return ResponseEntity.internalServerError().build();
    //     }
    // }
    
    // GET /api/admin/staff/search/name?query={query} - Search staff by name
    @GetMapping("/staff/search/name")
    public ResponseEntity<List<StaffDTO>> searchStaffByName(@RequestParam String query) {
        try {
            List<Staff> staff = staffService.searchStaffByName(query);
            List<StaffDTO> staffDTOs = staff.stream()
                    .map(StaffDTO::fromStaff)
                    .toList();
            return ResponseEntity.ok(staffDTOs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/staff/search/name/clinic/{clinicId}?query={query} - Search staff by name in specific clinic
    @GetMapping("/staff/search/name/clinic/{clinicId}")
    public ResponseEntity<List<Staff>> searchStaffByNameInClinic(@PathVariable Long clinicId, @RequestParam String query) {
        try {
            List<Staff> staff = staffService.searchStaffByNameInClinic(clinicId, query);
            return ResponseEntity.ok(staff);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // // GET /api/admin/staff/search/firstname?query={query} - Search staff by first name
    // @GetMapping("/staff/search/firstname")
    // public ResponseEntity<List<Staff>> searchStaffByFirstName(@RequestParam String query) {
    //     try {
    //         List<Staff> staff = staffService.searchStaffByFirstName(query);
    //         return ResponseEntity.ok(staff);
    //     } catch (Exception e) {
    //         return ResponseEntity.internalServerError().build();
    //     }
    // }
    
    // // GET /api/admin/staff/search/lastname?query={query} - Search staff by last name
    // @GetMapping("/staff/search/lastname")
    // public ResponseEntity<List<Staff>> searchStaffByLastName(@RequestParam String query) {
    //     try {
    //         List<Staff> staff = staffService.searchStaffByLastName(query);
    //         return ResponseEntity.ok(staff);
    //     } catch (Exception e) {
    //         return ResponseEntity.internalServerError().build();
    //     }
    // }
    
    // POST /api/admin/staff - Create a new staff member
    @PostMapping("/staff")
    public ResponseEntity<StaffDTO> createStaff(@RequestBody CreateStaffRequestDTO requestDTO) {
        try {
            Staff createdStaff = staffService.createStaffFromDTO(requestDTO);
            return ResponseEntity.ok(StaffDTO.fromStaff(createdStaff));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // PUT /api/admin/staff/{id} - Update staff details
    @PutMapping("/staff/{id}")
    public ResponseEntity<StaffDTO> updateStaffDetails(@PathVariable Long id, @RequestBody UpdateStaffRequestDTO requestDTO) {
        try {
            return staffService.updateStaffDetailsFromDTO(id, requestDTO)
                    .map(staff -> ResponseEntity.ok(StaffDTO.fromStaff(staff)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // DELETE /api/admin/staff/{id} - Delete staff by ID
    @DeleteMapping("/staff/{id}")
    public ResponseEntity<Void> deleteStaff(@PathVariable Long id) {
        try {
            // Check if staff exists before attempting to delete
            if (staffService.getStaffById(id).isPresent()) {
                staffService.deleteStaff(id);
                return ResponseEntity.noContent().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/staff/count - Get staff count
    @GetMapping("/staff/count")
    public ResponseEntity<Long> getStaffCount() {
        try {
            long count = staffService.getStaffCount();
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // GET /api/admin/staff/count/clinic/{clinicId} - Get staff count by clinic
    @GetMapping("/staff/count/clinic/{clinicId}")
    public ResponseEntity<Long> getStaffCountByClinic(@PathVariable Long clinicId) {
        try {
            long count = staffService.getStaffCountByClinic(clinicId);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // PUT /api/admin/staff/{id}/transfer/{clinicId} - Transfer staff to different clinic
    @PutMapping("/staff/{id}/transfer/{clinicId}")
    public ResponseEntity<Staff> transferStaffToClinic(@PathVariable Long id, @PathVariable Long clinicId) {
        try {
            return staffService.transferStaffToClinic(id, clinicId)
                    .map(staff -> ResponseEntity.ok(staff))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // Simple health check endpoint
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Admin service is running! (Patients & Staff)");
    }
    
    // Test endpoint to verify server is responding
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testEndpoint() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Admin controller is working");
        response.put("timestamp", java.time.LocalDateTime.now());
        return ResponseEntity.ok(response);
    }
}
