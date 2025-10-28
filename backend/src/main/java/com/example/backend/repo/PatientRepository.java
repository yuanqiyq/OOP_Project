package com.example.backend.repo;

import com.example.backend.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    
    // Find patient by patient ID
    Patient findByUserId(Long userId);
    
    // Find patient by email
    Patient findByEmail(String email);
    
    // Find patient by patient IC
    Patient findByPatientIc(String patientIc);
    
    // Find patients by gender
    List<Patient> findByGender(String gender);
    
    // Find patients by blood type
    List<Patient> findByBloodType(String bloodType);
    
    // Check if patient exists by email
    boolean existsByEmail(String email);
    
    // Check if patient exists by patient ID
    boolean existsByUserId(Long userId);
    
    // Check if patient exists by patient IC
    boolean existsByPatientIc(String patientIc);
    
}
