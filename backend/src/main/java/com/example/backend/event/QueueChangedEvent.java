package com.example.backend.event;

import lombok.Getter;

/**
 * Event published when queue changes (check-in, status update, requeue)
 */
@Getter
public class QueueChangedEvent {
    private final Long clinicId;

    public QueueChangedEvent(Long clinicId) {
        this.clinicId = clinicId;
    }
}

