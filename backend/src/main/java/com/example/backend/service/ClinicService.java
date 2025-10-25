package com.example.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.example.backend.model.clinic.Clinic;
import com.example.backend.model.clinic.ClinicType;
import com.example.backend.repo.ClinicRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClinicService {

    private final ClinicRepository clinicRepository;

    // Create a new clinic
    public Clinic createClinic(Clinic clinic) {
        // Validate mandatory fields
        if (clinic.getName() == null || clinic.getName().isEmpty()) {
            throw new IllegalArgumentException("Clinic name is required");
        }
        if (clinic.getAddress() == null || clinic.getAddress().isEmpty()) {
            throw new IllegalArgumentException("Clinic address is required");
        }
        if (clinic.getTelephoneNo() == null || clinic.getTelephoneNo().isEmpty()) {
            throw new IllegalArgumentException("Clinic telephone number is required");
        }

        return clinicRepository.save(clinic);
    }

    // Get clinic by ID
    public Optional<Clinic> getClinicById(Long id) {
        return clinicRepository.findById(id);
    }

    // Get all clinics
    public List<Clinic> getAllClinics() {
        return clinicRepository.findAll();
    }

    // Get clinics by region
    public List<Clinic> getClinicsByRegion(String region) {
        return clinicRepository.findByRegion(region);
    }

    // Get clinics by specialty
    public List<Clinic> getClinicsBySpecialty(String specialty) {
        return clinicRepository.findBySpecialty(specialty);
    }

    // Get clinics by area
    public List<Clinic> getClinicsByArea(String area) {
        return clinicRepository.findByArea(area);
    }

    // Get clinics by clinic type
    public List<Clinic> getClinicsByClinicType(String clinicType) {
        // Convert string to enum using fromValue() method
        ClinicType type = ClinicType.fromValue(clinicType);
        return clinicRepository.findByClinicType(type);
    }

    // Update clinic
    public Optional<Clinic> updateClinic(Long id, Clinic updatedClinic) {
        return clinicRepository.findById(id)
                .map(existingClinic -> {
                    // Update fields
                    if (updatedClinic.getName() != null) {
                        existingClinic.setName(updatedClinic.getName());
                    }
                    if (updatedClinic.getAddress() != null) {
                        existingClinic.setAddress(updatedClinic.getAddress());
                    }
                    if (updatedClinic.getTelephoneNo() != null) {
                        existingClinic.setTelephoneNo(updatedClinic.getTelephoneNo());
                    }
                    if (updatedClinic.getRegion() != null) {
                        existingClinic.setRegion(updatedClinic.getRegion());
                    }
                    if (updatedClinic.getArea() != null) {
                        existingClinic.setArea(updatedClinic.getArea());
                    }
                    if (updatedClinic.getSpecialty() != null) {
                        existingClinic.setSpecialty(updatedClinic.getSpecialty());
                    }
                    if (updatedClinic.getClinicType() != null) {
                        existingClinic.setClinicType(updatedClinic.getClinicType());
                    }
                    if (updatedClinic.getPcn() != null) {
                        existingClinic.setPcn(updatedClinic.getPcn());
                    }
                    if (updatedClinic.getIhpClinicId() != null) {
                        existingClinic.setIhpClinicId(updatedClinic.getIhpClinicId());
                    }
                    if (updatedClinic.getMonFriAmStart() != null) {
                        existingClinic.setMonFriAmStart(updatedClinic.getMonFriAmStart());
                    }
                    if (updatedClinic.getMonFriAmEnd() != null) {
                        existingClinic.setMonFriAmEnd(updatedClinic.getMonFriAmEnd());
                    }
                    if (updatedClinic.getMonFriPmStart() != null) {
                        existingClinic.setMonFriPmStart(updatedClinic.getMonFriPmStart());
                    }
                    if (updatedClinic.getMonFriPmEnd() != null) {
                        existingClinic.setMonFriPmEnd(updatedClinic.getMonFriPmEnd());
                    }
                    if (updatedClinic.getSatAmStart() != null) {
                        existingClinic.setSatAmStart(updatedClinic.getSatAmStart());
                    }
                    if (updatedClinic.getSatAmEnd() != null) {
                        existingClinic.setSatAmEnd(updatedClinic.getSatAmEnd());
                    }
                    if (updatedClinic.getSunAmStart() != null) {
                        existingClinic.setSunAmStart(updatedClinic.getSunAmStart());
                    }
                    if (updatedClinic.getSunAmEnd() != null) {
                        existingClinic.setSunAmEnd(updatedClinic.getSunAmEnd());
                    }
                    if (updatedClinic.getPhAmStart() != null) {
                        existingClinic.setPhAmStart(updatedClinic.getPhAmStart());
                    }
                    if (updatedClinic.getPhAmEnd() != null) {
                        existingClinic.setPhAmEnd(updatedClinic.getPhAmEnd());
                    }
                    if (updatedClinic.getRemarks() != null) {
                        existingClinic.setRemarks(updatedClinic.getRemarks());
                    }

                    // @PreUpdate will automatically set updatedAt
                    return clinicRepository.save(existingClinic);
                });
    }

    // Delete clinic by ID
    public boolean deleteClinic(Long id) {
        if (clinicRepository.existsById(id)) {
            clinicRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
