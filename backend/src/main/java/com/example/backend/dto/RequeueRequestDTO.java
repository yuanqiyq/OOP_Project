package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO: RequeueRequestDTO
 *
 * Purpose: Data transfer object for missed patient requeue requests
 *
 * Key Features:
 * - Encapsulates requeue request parameters
 * - Specifies new priority for re-queued patient
 * - Used for POST /api/queue/requeue/{appointmentId} endpoint
 *
 * Version: 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequeueRequestDTO {

    /**
     * New priority level for the re-queued patient
     * Values: 1 (Normal), 2 (Elderly), 3 (Emergency)
     */
    private Integer priority;
}
