package com.example.backend.exception;

public class ShiftOverlapException extends RuntimeException {

    public ShiftOverlapException(String message) {
        super(message);
    }

    public ShiftOverlapException(String message, Throwable cause) {
        super(message, cause);
    }
}

