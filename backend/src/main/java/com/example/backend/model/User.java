package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;
    
    @Column(name = "auth_uuid", unique = true, nullable = false)
    private UUID authUuid;
    
    @Column(name = "email", nullable = true, unique = true)
    private String email;

    @Column(name = "fname", nullable = true)
    private String fname;

    @Column(name = "lname", nullable = true)
    private String lname;

    @Column(name = "role", nullable = true)
    private String role;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
