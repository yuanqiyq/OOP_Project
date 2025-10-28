package com.example.backend.dto;

import com.example.backend.model.Staff;
import com.example.backend.model.clinic.Clinic;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StaffDTO {
    
    private Long userId;
    private UUID authUuid;
    private String email;
    private String fname;
    private String lname;
    private String role;
    private LocalDateTime createdAt;
    
    // Clinic information (simplified)
    private Long clinicId;
    private String clinicName;
    private String clinicAddress;
    
    // Convert Staff entity to DTO
    public static StaffDTO fromStaff(Staff staff) {
        StaffDTO dto = new StaffDTO();
        dto.setUserId(staff.getUserId());
        dto.setAuthUuid(staff.getAuthUuid());
        dto.setEmail(staff.getEmail());
        dto.setFname(staff.getFname());
        dto.setLname(staff.getLname());
        dto.setRole(staff.getRole());
        dto.setCreatedAt(staff.getCreatedAt());
        
        if (staff.getClinic() != null) {
            dto.setClinicId(staff.getClinic().getId());
            dto.setClinicName(staff.getClinic().getName());
            dto.setClinicAddress(staff.getClinic().getAddress());
        }
        
        return dto;
    }
    
    // Convert DTO to Staff entity (for updates)
    public Staff toStaff() {
        Staff staff = new Staff();
        staff.setUserId(this.userId);
        staff.setAuthUuid(this.authUuid);
        staff.setEmail(this.email);
        staff.setFname(this.fname);
        staff.setLname(this.lname);
        staff.setRole(this.role);
        staff.setCreatedAt(this.createdAt);
        
        // Note: Clinic will need to be set separately using clinicId
        if (this.clinicId != null) {
            Clinic clinic = new Clinic();
            clinic.setId(this.clinicId);
            staff.setClinic(clinic);
        }
        
        return staff;
    }
}
