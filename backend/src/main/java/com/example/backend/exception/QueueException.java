package com.example.backend.exception;

/**
 * Exception: QueueException
 *
 * Purpose: Custom exception for queue-specific errors
 *
 * Key Features:
 * - Indicates queue operation failures
 * - Provides meaningful error messages for debugging
 * - Handles duplicate entries, invalid transitions, and access violations
 *
 * Version: 1.0
 */
public class QueueException extends RuntimeException {

    /**
     * Constructor with message only
     */
    public QueueException(String message) {
        super(message);
    }

    /**
     * Constructor with message and cause
     */
    public QueueException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Constructor with cause only
     */
    public QueueException(Throwable cause) {
        super(cause);
    }
}
