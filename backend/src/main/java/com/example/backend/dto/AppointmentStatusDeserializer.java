package com.example.backend.dto;

import java.io.IOException;

import com.example.backend.model.appointments.AppointmentStatus;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

public class AppointmentStatusDeserializer extends JsonDeserializer<AppointmentStatus> {
    
    @Override
    public AppointmentStatus deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String value = p.getText();
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return AppointmentStatus.fromValue(value);
    }
}

