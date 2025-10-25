package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO: QueuePositionDTO
 *
 * Purpose: Data transfer object for queue position responses
 *
 * Key Features:
 * - Returns patient's current position in queue
 * - Includes queue context information
 * - Used for GET /api/queue/position/{appointmentId} endpoint
 * - Provides estimated wait time
 *
 * Version: 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueuePositionDTO {

    /**
     * Appointment ID for which position is requested
     */
    private Long appointmentId;

    /**
     * Current queue position (1-indexed)
     * Position 1 means patient is currently being served
     */
    private Integer position;

    /**
     * Current status of the queue entry
     * Values: IN_QUEUE, DONE, MISSED
     */
    private String status;

    /**
     * Priority level of this patient
     * 1 = Normal, 2 = Elderly, 3 = Emergency
     */
    private Integer priority;

    /**
     * Total number of patients in queue (excluding this patient if checking their position)
     */
    private Integer totalInQueue;

    /**
     * Estimated wait time in minutes before patient is served
     * Can be null if no historical data available
     */
    private Integer estimatedWaitTimeMinutes;

    /**
     * Message for patient (e.g., "You are next", "5 patients ahead")
     */
    private String message;

    /**
     * Whether this patient has an active queue entry
     */
    private Boolean isQueued;
}
