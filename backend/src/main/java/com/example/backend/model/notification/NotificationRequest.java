package com.example.backend.model.notification;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for Notification Requests
 * 
 * Contains all information needed to send patient notification emails
 * according to Appendix A specifications.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    
    /**
     * Patient's email address
     */
    private String toEmail;
    
    /**
     * Patient's full name
     */
    private String patientName;
    
    /**
     * Clinic name where appointment is scheduled
     */
    private String clinicName;
    
    /**
     * Doctor's name
     */
    private String doctorName;
    
    /**
     * Appointment date and time (formatted string)
     */
    private String appointmentDateTime;
    
    /**
     * Patient's queue number
     */
    private int queueNumber;
    
    /**
     * Consultation room number (optional, used for "your turn" notifications)
     */
    private String roomNumber;
}
