package com.example.backend.common;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

/**
 * Database connection class for Supabase PostgreSQL database.
 * Provides connection establishment, management, and proper teardown.
 */
@Component
public class DatabaseConnection {
    
    private static final Logger logger = LoggerFactory.getLogger(DatabaseConnection.class);
    
    @Value("${spring.datasource.url}")
    private String dbUrl;
    
    @Value("${spring.datasource.username}")
    private String dbUsername;
    
    @Value("${spring.datasource.password}")
    private String dbPassword;
    
    private Connection connection;
    
    /**
     * Initialize the database connection after bean construction
     */
    @PostConstruct
    public void initialize() {
        try {
            establishConnection();
            logger.info("Database connection initialized successfully");
        } catch (Exception e) {
            logger.error("Failed to initialize database connection", e);
            throw new RuntimeException("Database connection initialization failed", e);
        }
    }
    
    /**
     * Establish connection to PostgreSQL database
     */
    private void establishConnection() throws SQLException {
        if (dbUrl == null || dbUrl.isEmpty()) {
            throw new IllegalStateException("Database URL is not configured");
        }
        
        Properties props = new Properties();
        props.setProperty("user", dbUsername);
        props.setProperty("password", dbPassword);
        props.setProperty("ssl", "true");
        props.setProperty("sslmode", "require");
        
        this.connection = DriverManager.getConnection(dbUrl, props);
        
        // Test the connection
        if (!connection.isValid(5)) {
            throw new SQLException("Failed to establish valid connection to database");
        }
        
        logger.info("Successfully connected to PostgreSQL database");
    }
    
    /**
     * Get the current database connection
     * @return Active database connection
     * @throws SQLException if connection is not available
     */
    public Connection getConnection() throws SQLException {
        if (connection == null || connection.isClosed()) {
            logger.warn("Connection is closed, attempting to reconnect...");
            establishConnection();
        }
        return connection;
    }
    
    
    /**
     * Check if the connection is valid and active
     * @return true if connection is valid, false otherwise
     */
    public boolean isConnectionValid() {
        try {
            return connection != null && !connection.isClosed() && connection.isValid(3);
        } catch (SQLException e) {
            logger.warn("Error checking connection validity", e);
            return false;
        }
    }
    
    /**
     * Reconnect to the database if connection is lost
     * @throws SQLException if reconnection fails
     */
    public void reconnect() throws SQLException {
        logger.info("Attempting to reconnect to Supabase database...");
        closeConnection();
        establishConnection();
    }
    
    /**
     * Close the database connection
     */
    private void closeConnection() {
        if (connection != null) {
            try {
                connection.close();
                logger.info("Database connection closed");
            } catch (SQLException e) {
                logger.warn("Error closing database connection", e);
            } finally {
                connection = null;
            }
        }
    }
    
    /**
     * Cleanup resources when bean is destroyed
     */
    @PreDestroy
    public void cleanup() {
        logger.info("Cleaning up database connection resources...");
        closeConnection();
        logger.info("Database connection cleanup completed");
    }
    
    /**
     * Get connection statistics for monitoring
     * @return Connection status information
     */
    public String getConnectionStatus() {
        try {
            if (connection == null) {
                return "Connection: Not initialized";
            } else if (connection.isClosed()) {
                return "Connection: Closed";
            } else if (connection.isValid(3)) {
                return "Connection: Active and valid";
            } else {
                return "Connection: Invalid";
            }
        } catch (SQLException e) {
            return "Connection: Error - " + e.getMessage();
        }
    }
}
