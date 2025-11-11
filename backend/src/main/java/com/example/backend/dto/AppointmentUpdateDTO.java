package com.example.backend.dto;

import java.time.LocalDateTime;

import com.example.backend.model.appointments.AppointmentStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO: AppointmentUpdateDTO
 *
 * Purpose: Data transfer object for appointment update operations (PUT endpoint)
 *
 * Key Features:
 * - Contains only updateable appointment fields
 * - Excludes auto-managed fields (appointmentId, createdAt)
 * - Flexible datetime format (accepts with/without milliseconds)
 * - Used for PUT /api/appointments/{id} endpoint
 *
 * Security:
 * - Prevents mass assignment of protected fields
 * - Explicit control over which fields can be modified
 *
 * Version: 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentUpdateDTO {

    /**
     * Patient ID for this appointment
     */
    private Long patientId;

    /**
     * Clinic ID where appointment is scheduled
     */
    private Long clinicId;

    /**
     * Doctor ID assigned to this appointment
     */
    private Long doctorId;

    /**
     * Appointment date and time
     * Accepts both formats:
     * - 2025-11-10T13:38:00 (without milliseconds)
     * - 2025-11-10T13:38:00.572Z (with milliseconds)
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime dateTime;

    /**
     * Appointment status
     * Valid values: SCHEDULED, ARRIVED, NO_SHOW, CANCELLED, COMPLETED
     */
    @JsonDeserialize(using = AppointmentStatusDeserializer.class)
    private AppointmentStatus apptStatus;

    /**
     * Treatment summary or notes
     * Plain text field for storing treatment information
     */
    private String treatmentSummary;
}
