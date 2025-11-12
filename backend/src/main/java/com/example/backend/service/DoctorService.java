package com.example.backend.service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.example.backend.exception.ShiftOverlapException;
import com.example.backend.model.Doctor;
import com.example.backend.repo.DoctorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;

    // Create a new doctor
    public Doctor createDoctor(Doctor doctor) {
        // Validate mandatory fields
        if (doctor.getFname() == null || doctor.getFname().isEmpty()) {
            throw new IllegalArgumentException("Doctor first name is required");
        }
        if (doctor.getLname() == null || doctor.getLname().isEmpty()) {
            throw new IllegalArgumentException("Doctor last name is required");
        }
        if (doctor.getAssignedClinic() == null) {
            throw new IllegalArgumentException("Doctor assigned clinic is required");
        }

        // Validate shift_days if provided
        if (doctor.getShiftDays() != null && !doctor.getShiftDays().isEmpty()) {
            validateShiftDays(doctor.getShiftDays());
            checkShiftOverlap(doctor.getAssignedClinic(), doctor.getShiftDays(), null);
        }

        return doctorRepository.save(doctor);
    }

    // Get doctor by ID
    public Optional<Doctor> getDoctorById(Long id) {
        return doctorRepository.findById(id);
    }

    // Get all doctors
    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    // Get doctors by clinic
    public List<Doctor> getDoctorsByClinic(Long clinicId) {
        return doctorRepository.findByAssignedClinic(clinicId);
    }

    // Update doctor
    public Optional<Doctor> updateDoctor(Long id, Doctor updatedDoctor) {
        return doctorRepository.findById(id)
                .map(existingDoctor -> {
                    // Determine the clinic to check (use updated clinic if provided, otherwise existing)
                    Long clinicToCheck = updatedDoctor.getAssignedClinic() != null 
                            ? updatedDoctor.getAssignedClinic() 
                            : existingDoctor.getAssignedClinic();
                    
                    // Determine the shift days to check (use updated shift days if provided, otherwise existing)
                    List<Integer> shiftDaysToCheck = updatedDoctor.getShiftDays() != null 
                            ? updatedDoctor.getShiftDays() 
                            : existingDoctor.getShiftDays();

                    // Validate shift_days if provided or if clinic is being changed
                    if (shiftDaysToCheck != null && !shiftDaysToCheck.isEmpty()) {
                        validateShiftDays(shiftDaysToCheck);
                        // Check overlap excluding the current doctor being updated
                        checkShiftOverlap(clinicToCheck, shiftDaysToCheck, id);
                    }

                    // Update fields
                    if (updatedDoctor.getFname() != null) {
                        existingDoctor.setFname(updatedDoctor.getFname());
                    }
                    if (updatedDoctor.getLname() != null) {
                        existingDoctor.setLname(updatedDoctor.getLname());
                    }
                    
                    // Determine if shiftDays is being updated
                    boolean shiftDaysBeingUpdated = updatedDoctor.getShiftDays() != null;
                    
                    // Handle assignedClinic
                    // If shiftDays is being updated and assignedClinic is null, assume assignedClinic wasn't provided
                    // and should be kept as-is (this prevents unassigning when only updating shift days)
                    // Only update assignedClinic if:
                    // 1. It's explicitly provided (non-null), OR
                    // 2. shiftDays is NOT being updated (meaning this might be a clinic-only update)
                    boolean shouldUpdateAssignedClinic = updatedDoctor.getAssignedClinic() != null || !shiftDaysBeingUpdated;
                    
                    if (shouldUpdateAssignedClinic) {
                        boolean isUnassigning = updatedDoctor.getAssignedClinic() == null && existingDoctor.getAssignedClinic() != null;
                        boolean isAssigning = updatedDoctor.getAssignedClinic() != null;
                        
                        if (isAssigning || isUnassigning) {
                            existingDoctor.setAssignedClinic(updatedDoctor.getAssignedClinic());
                            // If unassigning, also clear shift days
                            if (isUnassigning) {
                                existingDoctor.setShiftDays(null);
                            }
                        }
                    }
                    
                    // Update shift days if provided and not unassigning
                    boolean isUnassigning = shouldUpdateAssignedClinic && 
                                          updatedDoctor.getAssignedClinic() == null && 
                                          existingDoctor.getAssignedClinic() != null;
                    if (updatedDoctor.getShiftDays() != null && !isUnassigning) {
                        existingDoctor.setShiftDays(updatedDoctor.getShiftDays());
                    }

                    return doctorRepository.save(existingDoctor);
                });
    }

    // Delete doctor by ID
    public boolean deleteDoctor(Long id) {
        if (doctorRepository.existsById(id)) {
            doctorRepository.deleteById(id);
            return true;
        }
        return false;
    }

    /**
     * Validates that shift_days contains only integers in the range 1-7
     */
    private void validateShiftDays(List<Integer> shiftDays) {
        if (shiftDays == null) {
            return;
        }
        
        for (Integer day : shiftDays) {
            if (day == null || day < 1 || day > 7) {
                throw new IllegalArgumentException(
                    "Shift days must contain integers between 1 and 7 (representing days of the week). Invalid value: " + day);
            }
        }
    }

    /**
     * Checks if the given shift_days overlap with any existing doctor's shift_days in the same clinic
     * @param clinicId The clinic ID to check
     * @param newShiftDays The shift days to validate
     * @param excludeDoctorId The doctor ID to exclude from the check (null for create operations)
     */
    private void checkShiftOverlap(Long clinicId, List<Integer> newShiftDays, Long excludeDoctorId) {
        if (newShiftDays == null || newShiftDays.isEmpty()) {
            return; // No shift days means no overlap possible
        }

        // Get all doctors in the same clinic
        List<Doctor> doctorsInClinic = doctorRepository.findByAssignedClinic(clinicId);
        
        // Convert new shift days to a set for efficient lookup
        Set<Integer> newShiftDaysSet = new HashSet<>(newShiftDays);

        // Check each doctor's shift days for overlaps
        for (Doctor existingDoctor : doctorsInClinic) {
            // Skip the doctor being updated
            if (excludeDoctorId != null && existingDoctor.getId().equals(excludeDoctorId)) {
                continue;
            }

            // Skip doctors without shift days
            if (existingDoctor.getShiftDays() == null || existingDoctor.getShiftDays().isEmpty()) {
                continue;
            }

            // Check for any overlapping days
            Set<Integer> existingShiftDaysSet = new HashSet<>(existingDoctor.getShiftDays());
            Set<Integer> overlap = new HashSet<>(newShiftDaysSet);
            overlap.retainAll(existingShiftDaysSet);

            if (!overlap.isEmpty()) {
                String doctorName = existingDoctor.getFname() + " " + existingDoctor.getLname();
                throw new ShiftOverlapException(
                    String.format("Shift days overlap detected. Doctor '%s' (ID: %d) already works on day(s) %s. " +
                        "No two doctors can work on the same shift in the same clinic.",
                        doctorName, existingDoctor.getId(), overlap));
            }
        }
    }
}
