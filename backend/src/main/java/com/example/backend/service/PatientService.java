package com.example.backend.service;

import com.example.backend.model.Patient;
import com.example.backend.repo.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PatientService {
    
    private final PatientRepository patientRepository;
    
    // Get all patients
    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }
    
    // Get patient by ID
    public Optional<Patient> getPatientById(Long patientId) {
        return patientRepository.findById(patientId);
    }
    
    // Get patient by user ID
    public Optional<Patient> getPatientByUserId(Long userId) {
        return Optional.ofNullable(patientRepository.findByUserId(userId));
    }
    
    // Get patient by email
    public Optional<Patient> getPatientByEmail(String email) {
        return Optional.ofNullable(patientRepository.findByEmail(email));
    }
    
    // Get patient by patient IC
    public Optional<Patient> getPatientByPatientIc(String patientIc) {
        return Optional.ofNullable(patientRepository.findByPatientIc(patientIc));
    }
    
    // Get patients by gender
    public List<Patient> getPatientsByGender(String gender) {
        return patientRepository.findByGender(gender);
    }
    
    // Get patients by blood type
    public List<Patient> getPatientsByBloodType(String bloodType) {
        return patientRepository.findByBloodType(bloodType);
    }
    
    // // Search patients by medical history
    // public List<Patient> searchPatientsByMedicalHistory(String medicalHistory) {
    //     return patientRepository.findByMedicalHistoryContainingIgnoreCase(medicalHistory);
    // }
    
    // // Search patients by allergies
    // public List<Patient> searchPatientsByAllergies(String allergies) {
    //     return patientRepository.findByAllergiesContainingIgnoreCase(allergies);
    // }
    
    // Create a new patient
    public Patient createPatient(Patient patient) {
        // Validate required fields
        if (patient.getEmail() != null && patientRepository.existsByEmail(patient.getEmail())) {
            throw new IllegalArgumentException("Patient with email " + patient.getEmail() + " already exists");
        }
        
        if (patient.getPatientIc() != null && patientRepository.existsByPatientIc(patient.getPatientIc())) {
            throw new IllegalArgumentException("Patient with IC " + patient.getPatientIc() + " already exists");
        }
        
        return patientRepository.save(patient);
    }
    
    // Update patient
    public Patient updatePatient(Patient patient) {
        return patientRepository.save(patient);
    }
    
    // Update patient details by ID
    public Optional<Patient> updatePatientDetails(Long patientId, Patient updatedPatient) {
        return patientRepository.findById(patientId)
                .map(existingPatient -> {
                    // Update basic user information
                    if (updatedPatient.getEmail() != null && !updatedPatient.getEmail().equals(existingPatient.getEmail())) {
                        if (patientRepository.existsByEmail(updatedPatient.getEmail())) {
                            throw new IllegalArgumentException("Email " + updatedPatient.getEmail() + " is already in use");
                        }
                        existingPatient.setEmail(updatedPatient.getEmail());
                    }
                    if (updatedPatient.getFname() != null) {
                        existingPatient.setFname(updatedPatient.getFname());
                    }
                    if (updatedPatient.getLname() != null) {
                        existingPatient.setLname(updatedPatient.getLname());
                    }
                    if (updatedPatient.getRole() != null) {
                        existingPatient.setRole(updatedPatient.getRole());
                    }
                    
                    // Update patient-specific information
                    if (updatedPatient.getPatientIc() != null && !updatedPatient.getPatientIc().equals(existingPatient.getPatientIc())) {
                        if (patientRepository.existsByPatientIc(updatedPatient.getPatientIc())) {
                            throw new IllegalArgumentException("Patient IC " + updatedPatient.getPatientIc() + " is already in use");
                        }
                        existingPatient.setPatientIc(updatedPatient.getPatientIc());
                    }
                    if (updatedPatient.getDateOfBirth() != null) {
                        existingPatient.setDateOfBirth(updatedPatient.getDateOfBirth());
                    }
                    if (updatedPatient.getGender() != null) {
                        existingPatient.setGender(updatedPatient.getGender());
                    }
                    if (updatedPatient.getEmergencyContact() != null) {
                        existingPatient.setEmergencyContact(updatedPatient.getEmergencyContact());
                    }
                    if (updatedPatient.getEmergencyContactPhone() != null) {
                        existingPatient.setEmergencyContactPhone(updatedPatient.getEmergencyContactPhone());
                    }
                    if (updatedPatient.getMedicalHistory() != null) {
                        existingPatient.setMedicalHistory(updatedPatient.getMedicalHistory());
                    }
                    if (updatedPatient.getAllergies() != null) {
                        existingPatient.setAllergies(updatedPatient.getAllergies());
                    }
                    if (updatedPatient.getBloodType() != null) {
                        existingPatient.setBloodType(updatedPatient.getBloodType());
                    }
                    
                    return patientRepository.save(existingPatient);
                });
    }
    
    // Delete patient by ID
    public void deletePatient(Long patientId) {
        patientRepository.deleteById(patientId);
    }
    
    // // Check if patient exists by email
    // public boolean patientExistsByEmail(String email) {
    //     return patientRepository.existsByEmail(email);
    // }
    
    // // Check if patient exists by user ID
    // public boolean patientExistsByUserId(Long userId) {
    //     return patientRepository.existsByUserId(userId);
    // }
    
    // // Check if patient exists by patient IC
    // public boolean patientExistsByPatientIc(String patientIc) {
    //     return patientRepository.existsByPatientIc(patientIc);
    // }
    
    // Get patient count
    public long getPatientCount() {
        return patientRepository.count();
    }
    
    // Get patients by age range (calculated from date of birth)
    public List<Patient> getPatientsByAgeRange(int minAge, int maxAge) {
        LocalDate maxBirthDate = LocalDate.now().minusYears(minAge);
        LocalDate minBirthDate = LocalDate.now().minusYears(maxAge + 1);
        
        return patientRepository.findAll().stream()
                .filter(patient -> patient.getDateOfBirth() != null)
                .filter(patient -> {
                    LocalDate birthDate = patient.getDateOfBirth();
                    return !birthDate.isAfter(maxBirthDate) && !birthDate.isBefore(minBirthDate);
                })
                .toList();
    }
}
