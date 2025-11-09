package com.example.backend.service;

import com.example.backend.model.notification.NotificationRequest;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Notification Service
 * 
 * Handles sending email notifications to patients using SendGrid API.
 * Implements notification templates as specified in Appendix A.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SendGrid sendGrid;

    @Value("${NOTIFICATION_SENDER_EMAIL:notifications@singhealth-clinic.sg}")
    private String senderEmail;

    private static final String EMAIL_SUBJECT = "Appointment & Queue Update – SingHealth Clinic";

    /**
     * Sends "3 patients away" notification email
     * 
     * @param request notification details
     * @throws IOException if SendGrid API call fails
     */
    public void sendThreePatientsAwayEmail(NotificationRequest request) throws IOException {
        String emailBody = buildThreePatientsAwayMessage(request);
        sendEmail(request.getToEmail(), emailBody);
        log.info("Sent '3 patients away' notification to: {}", request.getToEmail());
    }

    /**
     * Sends "your turn" notification email
     * 
     * @param request notification details including room number
     * @throws IOException if SendGrid API call fails
     */
    public void sendYourTurnEmail(NotificationRequest request) throws IOException {
        String emailBody = buildYourTurnMessage(request);
        sendEmail(request.getToEmail(), emailBody);
        log.info("Sent 'your turn' notification to: {}", request.getToEmail());
    }

    /**
     * Sends appointment confirmation email
     * 
     * @param request notification details
     * @throws IOException if SendGrid API call fails
     */
    public void sendAppointmentConfirmationEmail(NotificationRequest request) throws IOException {
        String emailBody = buildAppointmentConfirmationMessage(request);
        sendEmail(request.getToEmail(), emailBody);
        log.info("Sent appointment confirmation to: {}", request.getToEmail());
    }

    /**
     * Builds email message for "3 patients away" notification
     * Format follows Appendix A specification
     */
    private String buildThreePatientsAwayMessage(NotificationRequest request) {
        return String.format(
                """
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { color: #2c5f8d; margin-bottom: 20px; }
                                table { width: 100%%; border-collapse: collapse; margin: 20px 0; }
                                td { padding: 10px; border: 1px solid #ddd; }
                                .label { font-weight: bold; background-color: #f5f5f5; width: 40%%; }
                                .alert { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                                .footer { margin-top: 30px; color: #666; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <p>Dear <strong>%s</strong>,</p>

                                <p>Thank you for booking your appointment at <strong>%s</strong>.</p>

                                <table>
                                    <tr>
                                        <td class="label">Appointment Number:</td>
                                        <td><strong>%d</strong></td>
                                    </tr>
                                    <tr>
                                        <td class="label">Doctor:</td>
                                        <td>%s</td>
                                    </tr>
                                    <tr>
                                        <td class="label">Date & Time:</td>
                                        <td>%s</td>
                                    </tr>
                                    <tr>
                                        <td class="label">Queue Number:</td>
                                        <td><strong>%d</strong></td>
                                    </tr>
                                </table>

                                <p>
                                    We will notify you again when your turn is approaching. Please be present at the clinic when your queue number is called.
                                </p>

                                <div class="alert">
                                    <strong>Queue Update Notification:</strong><br>
                                    You are currently <strong>3 patients away</strong>. Please proceed closer to the consultation venue.
                                </div>

                                <div class="footer">
                                    <p>We look forward to serving you!</p>
                                    </br>
                                    <p>Warm regards,<br>
                                    <strong>SingHealth Clinic Team</strong></p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """,
                request.getPatientName(),
                request.getClinicName(),
                request.getAppointmentNumber() != null ? request.getAppointmentNumber() : 0,
                request.getDoctorName(),
                request.getAppointmentDateTime(),
                request.getQueueNumber());
    }

    /**
     * Builds email message for "your turn" notification
     * Format follows Appendix A specification
     */
    private String buildYourTurnMessage(NotificationRequest request) {
        String roomInfo = request.getRoomNumber() != null
                ? String.format("Kindly enter Room <strong>%s</strong>.", request.getRoomNumber())
                : "Kindly proceed to the consultation venue.";

        return String.format(
                """
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { color: #2c5f8d; margin-bottom: 20px; }
                                table { width: 100%%; border-collapse: collapse; margin: 20px 0; }
                                td { padding: 10px; border: 1px solid #ddd; }
                                .label { font-weight: bold; background-color: #f5f5f5; width: 40%%; }
                                .alert { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
                                .footer { margin-top: 30px; color: #666; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <p>Dear <strong>%s</strong>,</p>

                                <p>Thank you for booking your appointment at <strong>%s</strong>.</p>

                                <table>
                                    <tr>
                                        <td class="label">Appointment Number:</td>
                                        <td><strong>%d</strong></td>
                                    </tr>
                                    <tr>
                                        <td class="label">Doctor:</td>
                                        <td>%s</td>
                                    </tr>
                                    <tr>
                                        <td class="label">Date & Time:</td>
                                        <td>%s</td>
                                    </tr>
                                    <tr>
                                        <td class="label">Queue Number:</td>
                                        <td><strong>%d</strong></td>
                                    </tr>
                                </table>

                                <div class="alert">
                                    <strong>Queue Update Notification:</strong><br>
                                    <strong>It's your turn.</strong> %s
                                </div>

                                <div class="footer">
                                    <p>We look forward to serving you!</p>
                                    </br>
                                    <p>Warm regards,<br>
                                    <strong>SingHealth Clinic Team</strong></p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """,
                request.getPatientName(),
                request.getClinicName(),
                request.getAppointmentNumber(),
                request.getDoctorName(),
                request.getAppointmentDateTime(),
                request.getQueueNumber(),
                roomInfo);
    }

    /**
     * Builds email message for appointment confirmation
     * Format follows Appendix A specification
     */
    private String buildAppointmentConfirmationMessage(NotificationRequest request) {
        return String.format(
                """
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { color: #2c5f8d; margin-bottom: 20px; }
                                table { width: 100%%; border-collapse: collapse; margin: 20px 0; }
                                td { padding: 10px; border: 1px solid #ddd; }
                                .label { font-weight: bold; background-color: #f5f5f5; width: 40%%; }
                                .confirmation { background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }
                                .footer { margin-top: 30px; color: #666; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <p>Dear <strong>%s</strong>,</p>

                                <p>Thank you for booking your appointment at <strong>%s</strong>.</p>

                                <table>
                                    <tr>
                                        <td class="label">Appointment Number:</td>
                                        <td><strong>%d</strong></td>
                                    </tr>
                                    <tr>
                                        <td class="label">Doctor:</td>
                                        <td>%s</td>
                                    </tr>
                                    <tr>
                                        <td class="label">Date & Time:</td>
                                        <td>%s</td>
                                    </tr>
                                </table>

                                <div class="confirmation">
                                    Your appointment has been confirmed. Please arrive on time.
                                </div>

                                <div class="footer">
                                    <p>Warm regards,<br>
                                    <strong>SingHealth Clinic Team</strong></p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """,
                request.getPatientName(),
                request.getClinicName(),
                request.getAppointmentNumber() != null ? request.getAppointmentNumber() : 0,
                request.getDoctorName(),
                request.getAppointmentDateTime());
    }

    /**
     * Sends email using SendGrid API
     * 
     * @param toEmail recipient email address
     * @param body    email message body
     * @throws IOException if SendGrid API call fails
     */
    private void sendEmail(String toEmail, String body) throws IOException {
        Email from = new Email(senderEmail);
        Email to = new Email(toEmail);
        Content content = new Content("text/html", body);
        Mail mail = new Mail(from, EMAIL_SUBJECT, to, content);

        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sendGrid.api(request);

            if (response.getStatusCode() >= 400) {
                log.error("SendGrid API error: Status={}, Body={}",
                        response.getStatusCode(), response.getBody());
                throw new IOException("Failed to send email: HTTP " + response.getStatusCode());
            }

            log.debug("Email sent successfully. Status: {}", response.getStatusCode());

        } catch (IOException e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage());
            throw e;
        }
    }
}
