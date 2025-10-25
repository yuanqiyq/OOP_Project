package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO: CheckInRequestDTO
 *
 * Purpose: Data transfer object for patient check-in requests
 *
 * Key Features:
 * - Encapsulates check-in request parameters
 * - Validates appointment and priority
 * - Used for POST /api/queue/check-in endpoint
 *
 * Version: 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequestDTO {

    /**
     * Appointment ID of the patient checking in
     * Links to Appointment entity
     */
    private Long appointmentId;

    /**
     * Priority level for queue ordering
     * Values: 1 (Normal), 2 (Elderly), 3 (Emergency)
     */
    private Integer priority;
}
