package com.example.backend.model.appointments;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AppointmentStatus {
    SCHEDULED("scheduled"),
    ARRIVED("arrived"),
    NO_SHOW("no-show"),
    CANCELLED("cancelled");

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
    @JsonCreator
    public static AppointmentStatus fromValue(String value) {
        for (AppointmentStatus status : AppointmentStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid appointment status: " + value);
    }
}