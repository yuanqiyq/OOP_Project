package com.example.backend.service;

import com.example.backend.model.Staff;
import com.example.backend.model.clinic.Clinic;
import com.example.backend.dto.CreateStaffRequestDTO;
import com.example.backend.dto.UpdateStaffRequestDTO;
import com.example.backend.repo.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StaffService {
    
    private final StaffRepository staffRepository;
    
    // Get all staff
    public List<Staff> getAllStaff() {
        return staffRepository.findAll();
    }
    
    // Get staff by ID
    public Optional<Staff> getStaffById(Long staffId) {
        return staffRepository.findById(staffId);
    }
    
    // Get staff by user ID
    public Optional<Staff> getStaffByUserId(Long userId) {
        return Optional.ofNullable(staffRepository.findByUserId(userId));
    }
    
    // Get staff by email
    public Optional<Staff> getStaffByEmail(String email) {
        return Optional.ofNullable(staffRepository.findByEmail(email));
    }
    
    // Get staff by clinic ID
    public List<Staff> getStaffByClinicId(Long clinicId) {
        return staffRepository.findByClinicId(clinicId);
    }
    
    // Get staff by clinic ID (ordered by first name)
    public List<Staff> getStaffByClinicIdOrdered(Long clinicId) {
        return staffRepository.findByClinicIdOrderByFnameAsc(clinicId);
    }
    
    // Get staff by role
    public List<Staff> getStaffByRole(String role) {
        return staffRepository.findByRole(role);
    }
    
    // Get staff by role and clinic
    public List<Staff> getStaffByRoleAndClinic(String role, Long clinicId) {
        return staffRepository.findByRoleAndClinicId(role, clinicId);
    }
    
    // Search staff by name
    public List<Staff> searchStaffByName(String name) {
        return staffRepository.findByNameContainingIgnoreCase(name);
    }
    
    // Search staff by name in specific clinic
    public List<Staff> searchStaffByNameInClinic(Long clinicId, String name) {
        return staffRepository.findByClinicIdAndNameContainingIgnoreCase(clinicId, name);
    }
    
    // Search staff by first name
    public List<Staff> searchStaffByFirstName(String fname) {
        return staffRepository.findByFnameContainingIgnoreCase(fname);
    }
    
    // Search staff by last name
    public List<Staff> searchStaffByLastName(String lname) {
        return staffRepository.findByLnameContainingIgnoreCase(lname);
    }
    
    // Create a new staff member
    public Staff createStaff(Staff staff) {
        // Validate required fields
        if (staff.getEmail() != null && staffRepository.existsByEmail(staff.getEmail())) {
            throw new IllegalArgumentException("Staff with email " + staff.getEmail() + " already exists");
        }
        
        if (staff.getClinic() == null) {
            throw new IllegalArgumentException("Clinic assignment is required for staff");
        }
        
        return staffRepository.save(staff);
    }
    
    // Create a new staff member from DTO
    public Staff createStaffFromDTO(CreateStaffRequestDTO requestDTO) {
        // Validate email uniqueness
        if (staffRepository.existsByEmail(requestDTO.getEmail())) {
            throw new IllegalArgumentException("Staff with email " + requestDTO.getEmail() + " already exists");
        }
        
        // Create new Staff entity
        Staff staff = new Staff();
        staff.setAuthUuid(requestDTO.getAuthUuid()); // Use provided UUID
        staff.setEmail(requestDTO.getEmail());
        staff.setFname(requestDTO.getFname());
        staff.setLname(requestDTO.getLname());
        staff.setRole(requestDTO.getRole());
        
        // Create clinic reference with just the ID
        Clinic clinic = new Clinic();
        clinic.setId(requestDTO.getClinicId());
        staff.setClinic(clinic);
        
        return staffRepository.save(staff);
    }
    
    // Update staff
    public Staff updateStaff(Staff staff) {
        return staffRepository.save(staff);
    }
    
    // Update staff details by ID
    public Optional<Staff> updateStaffDetails(Long staffId, Staff updatedStaff) {
        return staffRepository.findById(staffId)
                .map(existingStaff -> {
                    // Update basic user information
                    if (updatedStaff.getEmail() != null && !updatedStaff.getEmail().equals(existingStaff.getEmail())) {
                        if (staffRepository.existsByEmail(updatedStaff.getEmail())) {
                            throw new IllegalArgumentException("Email " + updatedStaff.getEmail() + " is already in use");
                        }
                        existingStaff.setEmail(updatedStaff.getEmail());
                    }
                    if (updatedStaff.getFname() != null) {
                        existingStaff.setFname(updatedStaff.getFname());
                    }
                    if (updatedStaff.getLname() != null) {
                        existingStaff.setLname(updatedStaff.getLname());
                    }
                    if (updatedStaff.getRole() != null) {
                        existingStaff.setRole(updatedStaff.getRole());
                    }
                    
                    // Update staff-specific information
                    if (updatedStaff.getClinic() != null) {
                        existingStaff.setClinic(updatedStaff.getClinic());
                    }
                    
                    return staffRepository.save(existingStaff);
                });
    }
    
    // Update staff details by ID from DTO
    public Optional<Staff> updateStaffDetailsFromDTO(Long staffId, UpdateStaffRequestDTO requestDTO) {
        return staffRepository.findById(staffId)
                .map(existingStaff -> {
                    // Update basic user information
                    if (requestDTO.getEmail() != null && !requestDTO.getEmail().equals(existingStaff.getEmail())) {
                        if (staffRepository.existsByEmail(requestDTO.getEmail())) {
                            throw new IllegalArgumentException("Email " + requestDTO.getEmail() + " is already in use");
                        }
                        existingStaff.setEmail(requestDTO.getEmail());
                    }
                    if (requestDTO.getFname() != null) {
                        existingStaff.setFname(requestDTO.getFname());
                    }
                    if (requestDTO.getLname() != null) {
                        existingStaff.setLname(requestDTO.getLname());
                    }
                    if (requestDTO.getRole() != null) {
                        existingStaff.setRole(requestDTO.getRole());
                    }
                    
                    // Update clinic if provided
                    if (requestDTO.getClinicId() != null) {
                        Clinic clinic = new Clinic();
                        clinic.setId(requestDTO.getClinicId());
                        existingStaff.setClinic(clinic);
                    }
                    
                    return staffRepository.save(existingStaff);
                });
    }
    
    // Delete staff by ID
    public void deleteStaff(Long staffId) {
        staffRepository.deleteById(staffId);
    }
    
    // Check if staff exists by email
    public boolean staffExistsByEmail(String email) {
        return staffRepository.existsByEmail(email);
    }
    
    // Check if staff exists by user ID
    public boolean staffExistsByUserId(Long userId) {
        return staffRepository.existsByUserId(userId);
    }
    
    // Get staff count
    public long getStaffCount() {
        return staffRepository.count();
    }
    
    // Get staff count by clinic
    public long getStaffCountByClinic(Long clinicId) {
        return staffRepository.countByClinicId(clinicId);
    }
    
    // Transfer staff to different clinic
    public Optional<Staff> transferStaffToClinic(Long staffId, Long newClinicId) {
        return staffRepository.findById(staffId)
                .map(staff -> {
                    // Note: This assumes you have a way to get Clinic by ID
                    // You might need to inject ClinicRepository or ClinicService
                    // For now, we'll just update the clinic ID
                    // staff.getClinic().setId(newClinicId);
                    return staffRepository.save(staff);
                });
    }
}
