package com.example.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patient")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@PrimaryKeyJoinColumn(name = "patient_id", referencedColumnName = "user_id")
public class Patient extends User {
    
    @Column(name = "patient_ic", nullable = true, unique = true)
    @Size(max = 20, message = "Patient IC must not exceed 20 characters")
    private String patientIc;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "date_of_birth", nullable = true)
    private LocalDate dateOfBirth;
    
    @Column(name = "gender", nullable = true)
    @Pattern(regexp = "^(Male|Female|Other)$", message = "Gender must be Male, Female, or Other")
    private String gender;
    
    @Column(name = "emergency_contact", nullable = true)
    @Size(max = 100, message = "Emergency contact name must not exceed 100 characters")
    private String emergencyContact;
    
    @Column(name = "emergency_contact_phone", nullable = true)
    @Pattern(regexp = "^[+]?[0-9\\s\\-()]{8,20}$", message = "Invalid phone number format")
    private String emergencyContactPhone;
    
    @Column(name = "medical_history", columnDefinition = "TEXT", nullable = true)
    @Size(max = 2000, message = "Medical history must not exceed 2000 characters")
    private String medicalHistory;
    
    @Column(name = "allergies", columnDefinition = "TEXT", nullable = true)
    @Size(max = 1000, message = "Allergies information must not exceed 1000 characters")
    private String allergies;
    
    @Column(name = "blood_type", nullable = true)
    @Pattern(regexp = "^(A\\+|A\\-|B\\+|B\\-|AB\\+|AB\\-|O\\+|O\\-)$", message = "Invalid blood type format")
    private String bloodType;
}
