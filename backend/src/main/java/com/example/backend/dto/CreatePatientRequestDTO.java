package com.example.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePatientRequestDTO {
    
    @NotNull(message = "Auth UUID is required")
    private UUID authUuid;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    @NotBlank(message = "First name is required")
    private String fname;
    
    @NotBlank(message = "Last name is required")
    private String lname;
    
    @NotBlank(message = "Role is required")
    private String role;
    
    @NotBlank(message = "Patient IC is required")
    private String patientIc;
    
    @NotNull(message = "Date of birth is required")
    private LocalDate dateOfBirth;
    
    @NotBlank(message = "Gender is required")
    @Pattern(regexp = "^(Male|Female|Other)$", message = "Gender must be Male, Female, or Other")
    private String gender;
    
    // Optional fields
    private String emergencyContact;
    
    private String emergencyContactPhone;
    
    private String medicalHistory;
    
    private String allergies;
    
    private String bloodType;
}

