package com.example.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

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
                    // Update fields
                    if (updatedDoctor.getFname() != null) {
                        existingDoctor.setFname(updatedDoctor.getFname());
                    }
                    if (updatedDoctor.getLname() != null) {
                        existingDoctor.setLname(updatedDoctor.getLname());
                    }
                    if (updatedDoctor.getAssignedClinic() != null) {
                        existingDoctor.setAssignedClinic(updatedDoctor.getAssignedClinic());
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
}
