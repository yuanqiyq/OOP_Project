package com.example.backend.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.model.clinic.Clinic;
import com.example.backend.model.clinic.ClinicType;

@Repository
public interface ClinicRepository extends JpaRepository<Clinic, Long> {

    // Find clinics by region
    List<Clinic> findByRegion(String region);

    // Find clinics by specialty
    List<Clinic> findBySpecialty(String specialty);

    // Find clinics by area
    List<Clinic> findByArea(String area);

    // Find clinics by clinic type
    List<Clinic> findByClinicType(ClinicType clinicType);
}
