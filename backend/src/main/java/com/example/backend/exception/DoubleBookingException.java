package com.example.backend.exception;

public class DoubleBookingException extends RuntimeException {

    public DoubleBookingException(String message) {
        super(message);
    }

    public DoubleBookingException(String message, Throwable cause) {
        super(message, cause);
    }
}