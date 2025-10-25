package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO: QueueStatusUpdateDTO
 *
 * Purpose: Data transfer object for queue status update requests
 *
 * Key Features:
 * - Encapsulates status change request parameters
 * - Validates new status value
 * - Used for PATCH /api/queue/{queueId}/status endpoint
 *
 * Version: 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QueueStatusUpdateDTO {

    /**
     * New status for the queue entry
     * Valid values: DONE, MISSED
     * (Can only transition FROM IN_QUEUE TO DONE or MISSED)
     */
    private String status;
}
