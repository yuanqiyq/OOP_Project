package com.example.backend.dto;

import java.time.OffsetDateTime;

import com.example.backend.model.appointments.AppointmentStatus;
import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAppointmentRequestDTO {

    private Long patientId;

    private Long clinicId;

    private Long doctorId;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss[.SSS][XXX][X]")
    private OffsetDateTime dateTime;

    private AppointmentStatus apptStatus;
}
