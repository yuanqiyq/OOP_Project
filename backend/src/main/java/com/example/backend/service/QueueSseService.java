package com.example.backend.service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.example.backend.dto.QueuePositionDTO;
import com.example.backend.event.QueueChangedEvent;
import com.example.backend.exception.QueueException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service: QueueSseService
 *
 * Purpose: Manages Server-Sent Events (SSE) connections for real-time queue
 * position updates
 *
 * Key Features:
 * - Maintains active SSE connections per appointment
 * - Event-driven updates (no polling)
 * - Broadcasts updates when queue changes
 * - Handles connection cleanup on disconnect
 * - Thread-safe connection management
 *
 * Version: 2.0
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QueueSseService {

    private final QueueService queueService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Map of appointmentId -> SseEmitter
    private final Map<Long, SseEmitter> activeConnections = new ConcurrentHashMap<>();

    /**
     * Create a new SSE connection for queue position updates
     * Sends initial position immediately, then waits for event-driven updates
     * 
     * @param appointmentId ID of the appointment to track
     * @return SseEmitter for the client connection
     */
    public SseEmitter createConnection(Long appointmentId) {
        // Remove any existing connection for this appointment
        SseEmitter existing = activeConnections.remove(appointmentId);
        if (existing != null) {
            try {
                existing.complete();
            } catch (Exception e) {
                log.debug("Closed existing connection for appointment {}", appointmentId);
            }
        }

        // Create new emitter with no timeout (long-lived connection)
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        activeConnections.put(appointmentId, emitter);

        // Set up completion and timeout handlers
        emitter.onCompletion(() -> {
            log.debug("SSE connection completed for appointment {}", appointmentId);
            activeConnections.remove(appointmentId);
        });

        emitter.onTimeout(() -> {
            log.debug("SSE connection timeout for appointment {}", appointmentId);
            activeConnections.remove(appointmentId);
            emitter.complete();
        });

        emitter.onError((ex) -> {
            log.error("SSE connection error for appointment {}: {}", appointmentId, ex.getMessage());
            activeConnections.remove(appointmentId);
            emitter.completeWithError(ex);
        });

        // Send initial position immediately
        try {
            QueuePositionDTO initialPosition = queueService.getQueuePosition(appointmentId);
            sendUpdate(appointmentId, initialPosition);
        } catch (QueueException e) {
            // Not in queue yet, that's ok - will update when they check in
            log.debug("Appointment {} not in queue yet", appointmentId);
        } catch (Exception e) {
            log.error("Error sending initial position: {}", e.getMessage());
        }

        return emitter;
    }

    /**
     * Send queue position update to a specific appointment
     */
    public void sendUpdate(Long appointmentId, QueuePositionDTO position) {
        SseEmitter emitter = activeConnections.get(appointmentId);
        if (emitter != null) {
            try {
                SseEmitter.SseEventBuilder event = SseEmitter.event()
                        .name("queue-update")
                        .data(objectMapper.writeValueAsString(position));
                emitter.send(event);
            } catch (IOException e) {
                log.error("Error sending SSE update for appointment {}: {}", appointmentId, e.getMessage());
                activeConnections.remove(appointmentId);
                emitter.completeWithError(e);
            }
        }
    }

    /**
     * Listen for queue change events and notify all connected clients
     * This is called automatically when queue status changes (check-in, done,
     * missed, requeue)
     */
    @EventListener
    public void handleQueueChanged(QueueChangedEvent event) {
        Long clinicId = event.getClinicId();
        notifyClinicQueueChanged(clinicId);
    }

    /**
     * Notify all appointments in a clinic that queue has changed
     * This is called when queue status changes (check-in, done, missed, requeue)
     */
    private void notifyClinicQueueChanged(Long clinicId) {
        // Get all appointments currently in queue for this clinic
        List<com.example.backend.model.queue.QueueLog> queueEntries = queueService.getClinicQueue(clinicId);

        // Update all connected clients for appointments in this clinic's queue
        for (com.example.backend.model.queue.QueueLog entry : queueEntries) {
            Long appointmentId = entry.getAppointmentId();
            if (activeConnections.containsKey(appointmentId)) {
                try {
                    QueuePositionDTO position = queueService.getQueuePosition(appointmentId);
                    sendUpdate(appointmentId, position);
                } catch (QueueException e) {
                    // Appointment no longer in queue, send error and close
                    SseEmitter emitter = activeConnections.get(appointmentId);
                    if (emitter != null) {
                        try {
                            SseEmitter.SseEventBuilder event = SseEmitter.event()
                                    .name("queue-update")
                                    .data("{\"error\":\"Not in queue\",\"appointmentId\":" + appointmentId + "}");
                            emitter.send(event);
                            activeConnections.remove(appointmentId);
                            emitter.complete();
                        } catch (IOException ioEx) {
                            log.error("Error sending error event: {}", ioEx.getMessage());
                            activeConnections.remove(appointmentId);
                            emitter.completeWithError(ioEx);
                        }
                    }
                } catch (Exception e) {
                    log.error("Error updating position for appointment {}: {}", appointmentId, e.getMessage());
                }
            }
        }
    }

    /**
     * Manually close connection for an appointment
     */
    public void closeConnection(Long appointmentId) {
        SseEmitter emitter = activeConnections.remove(appointmentId);
        if (emitter != null) {
            try {
                emitter.complete();
            } catch (Exception e) {
                log.debug("Error closing connection: {}", e.getMessage());
            }
        }
    }

    /**
     * Get count of active connections (for monitoring)
     */
    public int getActiveConnectionCount() {
        return activeConnections.size();
    }
}
