package com.example.backend.model;

import com.example.backend.model.clinic.Clinic;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "staff")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@PrimaryKeyJoinColumn(name = "staff_id", referencedColumnName = "user_id")
public class Staff extends User {
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "clinic_id", referencedColumnName = "id", nullable = false)
    @NotNull(message = "Clinic assignment is required for staff")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Clinic clinic;
}
