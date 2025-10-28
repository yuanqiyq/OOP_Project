package com.example.backend.dto;

import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStaffRequestDTO {
    
    @Email(message = "Email must be valid")
    private String email;
    
    private String fname;
    private String lname;
    private String role;
    private Long clinicId;
}
