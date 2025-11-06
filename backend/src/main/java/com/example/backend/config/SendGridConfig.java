package com.example.backend.config;

import com.sendgrid.SendGrid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * SendGrid Configuration
 * 
 * Configures SendGrid client for sending email notifications.
 * API key is injected from environment variables (SENDGRID_API_KEY).
 */
@Configuration
public class SendGridConfig {

    @Value("${SENDGRID_API_KEY}")
    private String sendGridApiKey;

    /**
     * Creates and configures SendGrid client bean
     * 
     * @return configured SendGrid instance
     */
    @Bean
    public SendGrid sendGrid() {
        return new SendGrid(sendGridApiKey);
    }
}
