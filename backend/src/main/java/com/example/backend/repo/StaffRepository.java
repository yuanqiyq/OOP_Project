package com.example.backend.repo;

import com.example.backend.model.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StaffRepository extends JpaRepository<Staff, Long> {
    
    // Find staff by user ID
    Staff findByUserId(Long userId);
    
    // Find staff by email
    Staff findByEmail(String email);
    
    // Find staff by clinic ID
    List<Staff> findByClinicId(Long clinicId);
    
    // Find staff by clinic
    List<Staff> findByClinicIdOrderByFnameAsc(Long clinicId);
    
    // Check if staff exists by email
    boolean existsByEmail(String email);
    
    // Check if staff exists by user ID
    boolean existsByUserId(Long userId);
    
    // Find staff by role
    List<Staff> findByRole(String role);
    
    // Find staff by role and clinic
    List<Staff> findByRoleAndClinicId(String role, Long clinicId);
    
    // Count staff by clinic
    long countByClinicId(Long clinicId);
    
    // Find staff with specific first name pattern
    List<Staff> findByFnameContainingIgnoreCase(String fname);
    
    // Find staff with specific last name pattern
    List<Staff> findByLnameContainingIgnoreCase(String lname);
    
    // Find staff by name (first or last name contains)
    @Query("SELECT s FROM Staff s WHERE LOWER(s.fname) LIKE LOWER(CONCAT('%', :name, '%')) OR LOWER(s.lname) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Staff> findByNameContainingIgnoreCase(@Param("name") String name);
    
    // Find staff by clinic and name
    @Query("SELECT s FROM Staff s WHERE s.clinic.id = :clinicId AND (LOWER(s.fname) LIKE LOWER(CONCAT('%', :name, '%')) OR LOWER(s.lname) LIKE LOWER(CONCAT('%', :name, '%')))")
    List<Staff> findByClinicIdAndNameContainingIgnoreCase(@Param("clinicId") Long clinicId, @Param("name") String name);
}
