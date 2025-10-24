package com.example.backend.repo;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Appointment;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    
    // Find appointments by patient ID
    List<Appointment> findByPatientId(Long patientId);
    
    // Find appointments by clinic ID
    List<Appointment> findByClinicId(Long clinicId);
    
    // Find appointments by doctor ID
    List<Appointment> findByDoctorId(Long doctorId);
    
    // Find appointments by status
    List<Appointment> findByApptStatus(String apptStatus);
    
    // Find appointments by patient ID and status
    List<Appointment> findByPatientIdAndApptStatus(Long patientId, String apptStatus);
    
    // Find appointments by clinic ID and status
    List<Appointment> findByClinicIdAndApptStatus(Long clinicId, String apptStatus);
    
    // Find appointments by date range
    @Query("SELECT a FROM Appointment a WHERE a.dateTime BETWEEN :startDate AND :endDate")
    List<Appointment> findByDateTimeBetween(@Param("startDate") LocalDateTime startDate, 
                                          @Param("endDate") LocalDateTime endDate);
    
    // Find appointments by patient ID and date range
    @Query("SELECT a FROM Appointment a WHERE a.patientId = :patientId AND a.dateTime BETWEEN :startDate AND :endDate")
    List<Appointment> findByPatientIdAndDateTimeBetween(@Param("patientId") Long patientId,
                                                       @Param("startDate") LocalDateTime startDate,
                                                       @Param("endDate") LocalDateTime endDate);
    
    // Find appointments by clinic ID and date range
    @Query("SELECT a FROM Appointment a WHERE a.clinicId = :clinicId AND a.dateTime BETWEEN :startDate AND :endDate")
    List<Appointment> findByClinicIdAndDateTimeBetween(@Param("clinicId") Long clinicId,
                                                      @Param("startDate") LocalDateTime startDate,
                                                      @Param("endDate") LocalDateTime endDate);
    
    // Check if appointment exists by patient ID and date time
    boolean existsByPatientIdAndDateTime(Long patientId, LocalDateTime dateTime);
    
    // Check if appointment exists by clinic ID and date time
    boolean existsByClinicIdAndDateTime(Long clinicId, LocalDateTime dateTime);
}
