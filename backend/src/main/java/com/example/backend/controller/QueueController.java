package com.example.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.example.backend.dto.QueueEntryDTO;
import com.example.backend.dto.QueuePositionDTO;
import com.example.backend.dto.QueueStatusUpdateDTO;
import com.example.backend.dto.RequeueRequestDTO;
import com.example.backend.exception.QueueException;
import com.example.backend.model.queue.QueueLog;
import com.example.backend.service.QueueService;
import com.example.backend.service.QueueSseService;

import lombok.RequiredArgsConstructor;

/**
 * Controller: QueueController
 *
 * Purpose: REST API endpoints for queue management operations
 *
 * Key Features:
 * - Patient check-in endpoint
 * - Queue viewing and filtering
 * - Queue position tracking
 * - Status updates and transitions
 * - Missed patient handling
 * - Health check endpoint
 *
 * Dependencies:
 * - QueueService: Business logic for queue operations
 *
 * API Base Path: /api/queue
 *
 * Version: 1.0
 */
@RestController
@RequestMapping("/api/queue")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;
    private final QueueSseService queueSseService;

    /**
     * Check in a patient - create a new queue entry
     *
     * @param appointmentId ID of the appointment
     * @param priority Priority level for queue ordering (1=Normal, 2=Elderly, 3=Emergency)
     * @return ResponseEntity with created QueueLog or error
     *
     * POST /api/queue/check-in?appointmentId=1&priority=1
     */
    @PostMapping("/check-in")
    public ResponseEntity<?> checkInPatient(
            @RequestParam Long appointmentId,
            @RequestParam Integer priority) {
        try {
            // Validate request
            if (appointmentId == null || priority == null) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse(400, "Bad Request",
                        "appointmentId and priority are required"));
            }

            // Create queue entry
            QueueLog queueEntry = queueService.checkInPatient(appointmentId, priority);

            return ResponseEntity.status(HttpStatus.CREATED).body(queueEntry);

        } catch (QueueException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(409, "Queue Error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "Internal Server Error", e.getMessage()));
        }
    }

    /**
     * Get the active queue for a clinic with patient details
     * Returns only IN_QUEUE entries, sorted by priority DESC, created_at ASC
     *
     * @param clinicId ID of the clinic
     * @return ResponseEntity with list of queue entries or error
     *
     * GET /api/queue/clinic/{clinicId}
     */
    @GetMapping("/clinic/{clinicId}")
    public ResponseEntity<?> getClinicQueue(@PathVariable Long clinicId) {
        try {
            List<QueueEntryDTO> queueEntries = queueService.getClinicQueueWithDetails(clinicId);

            Map<String, Object> response = new HashMap<>();
            response.put("clinicId", clinicId);
            response.put("totalInQueue", queueEntries.size());
            response.put("queue", queueEntries);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "Internal Server Error", e.getMessage()));
        }
    }

    /**
     * Get queue position for a specific appointment
     * Returns patient's current position in queue
     *
     * @param appointmentId ID of the appointment
     * @return ResponseEntity with position information or error
     *
     * GET /api/queue/position/{appointmentId}
     */
    @GetMapping("/position/{appointmentId}")
    public ResponseEntity<?> getQueuePosition(@PathVariable Long appointmentId) {
        try {
            QueuePositionDTO position = queueService.getQueuePosition(appointmentId);
            return ResponseEntity.ok(position);

        } catch (QueueException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(404, "Not Found", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "Internal Server Error", e.getMessage()));
        }
    }

    /**
     * Stream queue position updates via Server-Sent Events (SSE)
     * Returns real-time queue position updates for a specific appointment
     *
     * @param appointmentId ID of the appointment to track
     * @return SseEmitter for streaming queue position updates
     *
     * GET /api/queue/position/{appointmentId}/stream
     */
    @GetMapping(value = "/position/{appointmentId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamQueuePosition(@PathVariable Long appointmentId) {
        return queueSseService.createConnection(appointmentId);
    }

    /**
     * Update queue entry status
     * Valid transitions: IN_QUEUE → DONE or MISSED
     *
     * @param queueId ID of the queue entry
     * @param statusUpdate DTO containing new status
     * @return ResponseEntity with updated QueueLog or error
     *
     * PATCH /api/queue/{queueId}/status
     * Request body:
     * {
     *   "status": "DONE"
     * }
     */
    @PatchMapping("/{queueId}/status")
    public ResponseEntity<?> updateQueueStatus(
            @PathVariable Long queueId,
            @RequestBody QueueStatusUpdateDTO statusUpdate) {
        try {
            // Validate request
            if (statusUpdate.getStatus() == null || statusUpdate.getStatus().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse(400, "Bad Request", "status is required"));
            }

            // Update status
            QueueLog updatedEntry = queueService.updateQueueStatus(queueId, statusUpdate.getStatus());

            return ResponseEntity.ok(updatedEntry);

        } catch (QueueException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(409, "Queue Error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "Internal Server Error", e.getMessage()));
        }
    }

    /**
     * Re-queue a missed patient
     * Creates a new IN_QUEUE entry while keeping original MISSED entry for audit
     *
     * @param appointmentId ID of the original appointment
     * @param requeueRequest DTO containing new priority
     * @return ResponseEntity with newly created QueueLog or error
     *
     * POST /api/queue/requeue/{appointmentId}
     * Request body:
     * {
     *   "priority": 1
     * }
     */
    @PostMapping("/requeue/{appointmentId}")
    public ResponseEntity<?> requeueMissedPatient(
            @PathVariable Long appointmentId,
            @RequestBody RequeueRequestDTO requeueRequest) {
        try {
            // Validate request
            if (requeueRequest.getPriority() == null) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse(400, "Bad Request", "priority is required"));
            }

            // Re-queue patient
            QueueLog newEntry = queueService.handleMissedPatientReturn(appointmentId, requeueRequest.getPriority());

            return ResponseEntity.status(HttpStatus.CREATED).body(newEntry);

        } catch (QueueException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(404, "Not Found", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "Internal Server Error", e.getMessage()));
        }
    }

    /**
     * Get queue entry by appointment ID
     * Returns queue history for an appointment
     *
     * @param appointmentId ID of the appointment
     * @return ResponseEntity with queue entries or error
     *
     * GET /api/queue/appointment/{appointmentId}
     */
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<?> getAppointmentQueueHistory(@PathVariable Long appointmentId) {
        try {
            List<QueueLog> queueHistory = queueService.getAppointmentQueueHistory(appointmentId);

            if (queueHistory.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(404, "Not Found",
                        "No queue entries found for appointment: " + appointmentId));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("appointmentId", appointmentId);
            response.put("totalEntries", queueHistory.size());
            response.put("history", queueHistory);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "Internal Server Error", e.getMessage()));
        }
    }

    /**
     * Get currently serving patient for a clinic
     * Returns the patient at position #1 (priority DESC, created_at ASC)
     *
     * @param clinicId ID of the clinic
     * @return ResponseEntity with current patient or empty
     *
     * GET /api/queue/clinic/{clinicId}/currently-serving
     */
    @GetMapping("/clinic/{clinicId}/currently-serving")
    public ResponseEntity<?> getCurrentlyServing(@PathVariable Long clinicId) {
        try {
            var currentPatient = queueService.getCurrentlyServing(clinicId);

            Map<String, Object> response = new HashMap<>();
            response.put("clinicId", clinicId);
            if (currentPatient.isPresent()) {
                response.put("queueId", currentPatient.get().getQueueId());
                response.put("appointmentId", currentPatient.get().getAppointmentId());
                response.put("status", "SERVING");
            } else {
                response.put("status", "QUEUE_EMPTY");
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "Internal Server Error", e.getMessage()));
        }
    }

    /**
     * Get all missed queue entries for a clinic
     * Returns patients who didn't show when called and can be re-queued
     *
     * @param clinicId ID of the clinic
     * @return ResponseEntity with list of missed queue entries
     *
     * GET /api/queue/clinic/{clinicId}/missed
     */
    @GetMapping("/clinic/{clinicId}/missed")
    public ResponseEntity<?> getMissedQueueEntries(@PathVariable Long clinicId) {
        try {
            List<QueueLog> missedEntries = queueService.getMissedQueueEntries(clinicId);

            Map<String, Object> response = new HashMap<>();
            response.put("clinicId", clinicId);
            response.put("totalMissed", missedEntries.size());
            response.put("missedPatients", missedEntries);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "Internal Server Error", e.getMessage()));
        }
    }

    /**
     * Health check endpoint for queue service
     *
     * @return ResponseEntity with status message
     *
     * GET /api/queue/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Queue Service");
        response.put("message", "Queue management service is running");
        return ResponseEntity.ok(response);
    }

    /**
     * Inner class for standardized error responses
     */
    private static class ErrorResponse {
        private int status;
        private String error;
        private String message;

        public ErrorResponse(int status, String error, String message) {
            this.status = status;
            this.error = error;
            this.message = message;
        }

        public int getStatus() {
            return status;
        }

        public String getError() {
            return error;
        }

        public String getMessage() {
            return message;
        }
    }
}
