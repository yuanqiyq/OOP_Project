package com.example.backend.model.clinic;

import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "clinic")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Clinic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "address", nullable = false, length = 255)
    private String address;

    @Column(name = "telephone_no", nullable = false, length = 20)
    private String telephoneNo;

    @Column(name = "region", length = 50)
    private String region;

    @Column(name = "area", length = 50)
    private String area;

    @Column(name = "specialty", length = 100)
    private String specialty;

    @Column(name = "clinic_type", length = 20)
    @Enumerated(EnumType.STRING)
    private ClinicType clinicType;

    @Column(name = "pcn", length = 100)
    private String pcn;

    @Column(name = "ihp_clinic_id", length = 20)
    private String ihpClinicId;

    @Column(name = "mon_fri_am_start")
    private LocalTime monFriAmStart;

    @Column(name = "mon_fri_am_end")
    private LocalTime monFriAmEnd;

    @Column(name = "mon_fri_pm_start")
    private LocalTime monFriPmStart;

    @Column(name = "mon_fri_pm_end")
    private LocalTime monFriPmEnd;

    @Column(name = "sat_am_start")
    private LocalTime satAmStart;

    @Column(name = "sat_am_end")
    private LocalTime satAmEnd;

    @Column(name = "sun_am_start")
    private LocalTime sunAmStart;

    @Column(name = "sun_am_end")
    private LocalTime sunAmEnd;

    @Column(name = "ph_am_start")
    private LocalTime phAmStart;

    @Column(name = "ph_am_end")
    private LocalTime phAmEnd;

    @Column(name = "remarks", length = 255)
    private String remarks;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
