package com.example.backend.model.appointments;

public enum AppointmentStatus {
    SCHEDULED("scheduled"),
    ARRIVED("arrived"),
    NO_SHOW("no-show"),
    CANCELLED("cancelled");

    private final String value;

    AppointmentStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    @Override
    public String toString() {
        return value;
    }

    // Helper method to get enum from string value
    public static AppointmentStatus fromValue(String value) {
        for (AppointmentStatus status : AppointmentStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid appointment status: " + value);
    }
}