package com.example.backend.controller;

import com.example.backend.dto.ErrorResponse;
import com.example.backend.model.notification.NotificationRequest;
import com.example.backend.service.NotificationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

/**
 * Notification Controller
 * 
 * Provides REST endpoints for triggering patient email notifications.
 * Supports "3 patients away" and "your turn" queue alerts.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notifications", description = "Patient email notification endpoints")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Health check endpoint
     * 
     * @return service status message
     */
    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Returns notification service status")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Notification service is running!");
    }

    /**
     * Sends "3 patients away" notification
     * 
     * @param request notification details (patient info, clinic, doctor, queue number)
     * @return success message or error response
     */
    @PostMapping("/three-away")
    @Operation(
        summary = "Send '3 patients away' notification",
        description = "Triggers email notification when patient is 3 positions away in queue"
    )
    public ResponseEntity<?> sendThreePatientsAwayNotification(@RequestBody NotificationRequest request) {
        try {
            validateNotificationRequest(request);
            notificationService.sendThreePatientsAwayEmail(request);
            return ResponseEntity.ok("'3 patients away' notification sent successfully to " + request.getToEmail());
            
        } catch (IllegalArgumentException e) {
            log.error("Validation error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                new ErrorResponse(400, "Bad Request", e.getMessage(), "/api/notifications/three-away")
            );
            
        } catch (IOException e) {
            log.error("SendGrid API error: {}", e.getMessage());
            return ResponseEntity.status(500).body(
                new ErrorResponse(500, "Internal Server Error", 
                    "Failed to send notification: " + e.getMessage(), 
                    "/api/notifications/three-away")
            );
        }
    }

    /**
     * Sends "your turn" notification
     * 
     * @param request notification details including room number
     * @return success message or error response
     */
    @PostMapping("/your-turn")
    @Operation(
        summary = "Send 'your turn' notification",
        description = "Triggers email notification when it's patient's turn in queue"
    )
    public ResponseEntity<?> sendYourTurnNotification(@RequestBody NotificationRequest request) {
        try {
            validateNotificationRequest(request);
            notificationService.sendYourTurnEmail(request);
            return ResponseEntity.ok("'Your turn' notification sent successfully to " + request.getToEmail());
            
        } catch (IllegalArgumentException e) {
            log.error("Validation error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                new ErrorResponse(400, "Bad Request", e.getMessage(), "/api/notifications/your-turn")
            );
            
        } catch (IOException e) {
            log.error("SendGrid API error: {}", e.getMessage());
            return ResponseEntity.status(500).body(
                new ErrorResponse(500, "Internal Server Error", 
                    "Failed to send notification: " + e.getMessage(), 
                    "/api/notifications/your-turn")
            );
        }
    }

    /**
     * Sends appointment confirmation notification
     * 
     * @param request notification details
     * @return success message or error response
     */
    @PostMapping("/appointment-confirmation")
    @Operation(
        summary = "Send appointment confirmation",
        description = "Triggers email notification confirming appointment booking"
    )
    public ResponseEntity<?> sendAppointmentConfirmation(@RequestBody NotificationRequest request) {
        try {
            validateNotificationRequest(request);
            notificationService.sendAppointmentConfirmationEmail(request);
            return ResponseEntity.ok("Appointment confirmation sent successfully to " + request.getToEmail());
            
        } catch (IllegalArgumentException e) {
            log.error("Validation error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                new ErrorResponse(400, "Bad Request", e.getMessage(), "/api/notifications/appointment-confirmation")
            );
            
        } catch (IOException e) {
            log.error("SendGrid API error: {}", e.getMessage());
            return ResponseEntity.status(500).body(
                new ErrorResponse(500, "Internal Server Error", 
                    "Failed to send notification: " + e.getMessage(), 
                    "/api/notifications/appointment-confirmation")
            );
        }
    }

    /**
     * Validates notification request data
     * 
     * @param request the notification request to validate
     * @throws IllegalArgumentException if required fields are missing
     */
    private void validateNotificationRequest(NotificationRequest request) {
        if (request.getToEmail() == null || request.getToEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient email is required");
        }
        if (request.getPatientName() == null || request.getPatientName().trim().isEmpty()) {
            throw new IllegalArgumentException("Patient name is required");
        }
        if (request.getClinicName() == null || request.getClinicName().trim().isEmpty()) {
            throw new IllegalArgumentException("Clinic name is required");
        }
        if (request.getDoctorName() == null || request.getDoctorName().trim().isEmpty()) {
            throw new IllegalArgumentException("Doctor name is required");
        }
        if (request.getAppointmentDateTime() == null || request.getAppointmentDateTime().trim().isEmpty()) {
            throw new IllegalArgumentException("Appointment date/time is required");
        }
        if (request.getQueueNumber() <= 0) {
            throw new IllegalArgumentException("Queue number must be positive");
        }
    }
}
