package com.example.backend.model.clinic;

public enum ClinicType {
    GP("gp"),
    SPECIALIST("specialist");

    private final String value;

    ClinicType(String value) {
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
    public static ClinicType fromValue(String value) {
        for (ClinicType type : ClinicType.values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Invalid clinic type: " + value);
    }
}
