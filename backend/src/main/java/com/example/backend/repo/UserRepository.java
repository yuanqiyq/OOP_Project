package com.example.backend.repo;

import com.example.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Find user by user ID
    User findByUserId(Long userId);
    
    // Find user by email
    User findByEmail(String email);
    
    // Check if user exists by email
    boolean existsByEmail(String email);
    
    // Check if user exists by user ID
    boolean existsByUserId(Long userId);
}
