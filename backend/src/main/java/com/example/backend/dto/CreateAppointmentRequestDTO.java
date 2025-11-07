package com.example.backend.dto;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateAppointmentRequestDTO {

    @NotNull(message = "Patient ID is required")
    private Long patientId;

    @NotNull(message = "Clinic ID is required")
    private Long clinicId;

    @NotNull(message = "Doctor ID is required")
    private Long doctorId;

    @NotNull(message = "Date and time is required")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][XXX][X]")
    private OffsetDateTime dateTime;
}
