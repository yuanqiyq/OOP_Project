package com.example.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateStaffRequestDTO {
    
    @NotNull(message = "Auth UUID is required")
    private UUID authUuid;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    @NotBlank(message = "First name is required")
    private String fname;
    
    @NotBlank(message = "Last name is required")
    private String lname;
    
    private String role;
    
    @NotNull(message = "Clinic ID is required")
    private Long clinicId;
}
