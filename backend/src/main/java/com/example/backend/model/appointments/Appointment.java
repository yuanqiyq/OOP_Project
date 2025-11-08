package com.example.backend.model.appointments;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "appointment")
@Data
@NoArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "appointment_id")
    private Long appointmentId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "clinic_id", nullable = false)
    private Long clinicId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "date_time", nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateTime;

    @Column(name = "appt_status")
    @Enumerated(EnumType.STRING)
    private AppointmentStatus apptStatus;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Constructor with required fields
    public Appointment(Long patientId, Long clinicId, LocalDateTime dateTime) {
        this.patientId = patientId;
        this.clinicId = clinicId;
        this.dateTime = dateTime;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

}
