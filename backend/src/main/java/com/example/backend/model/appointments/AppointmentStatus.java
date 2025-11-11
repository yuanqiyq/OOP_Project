package com.example.backend.model.appointments;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AppointmentStatus {
    SCHEDULED("scheduled"),
    ARRIVED("arrived"),
    NO_SHOW("no-show"),
    CANCELLED("cancelled"),
    COMPLETED("completed");

    private final String value;

    AppointmentStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @Override
    public String toString() {
        return value;
    }

    // Helper method to get enum from string value
    // Using DELEGATING mode to handle both enum name and value string
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static AppointmentStatus fromValue(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Appointment status cannot be null");
        }
        String normalizedValue = value.toLowerCase().trim();
        // First try to match by enum name (case-insensitive)
        for (AppointmentStatus status : AppointmentStatus.values()) {
            if (status.name().equalsIgnoreCase(value)) {
                return status;
            }
        }
        // Then try to match by value (lowercase)
        for (AppointmentStatus status : AppointmentStatus.values()) {
            if (status.value.equals(normalizedValue)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid appointment status: " + value);
    }
}