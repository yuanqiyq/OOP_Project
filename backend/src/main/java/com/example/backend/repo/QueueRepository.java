package com.example.backend.repo;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.model.queue.QueueLog;

/**
 * Repository: QueueRepository
 *
 * Purpose: Data access layer for QueueLog entity
 *
 * Key Features:
 * - CRUD operations for queue entries
 * - Custom queries for queue filtering and sorting
 * - Position calculation queries
 * - Validation and existence checks
 *
 * Dependencies:
 * - JpaRepository<QueueLog, Long>
 *
 * Version: 1.0
 */
@Repository
public interface QueueRepository extends JpaRepository<QueueLog, Long> {

    /**
     * Get active queue for a clinic, sorted by priority DESC then created_at ASC
     * Only includes entries with status = 'IN_QUEUE'
     */
    List<QueueLog> findByClinicIdAndStatusOrderByPriorityDescCreatedAtAsc(
            Long clinicId,
            String status);

    /**
     * Get all queue entries for a clinic regardless of status
     */
    List<QueueLog> findByClinicId(Long clinicId);

    /**
     * Find queue entry by appointment ID and status
     */
    Optional<QueueLog> findByAppointmentIdAndStatus(Long appointmentId, String status);

    /**
     * Check if an appointment already has an active IN_QUEUE entry
     */
    boolean existsByAppointmentIdAndStatus(Long appointmentId, String status);

    /**
     * Get all queue entries for an appointment (for audit/history)
     */
    List<QueueLog> findByAppointmentId(Long appointmentId);

    /**
     * Count queue entries created before a specific time for position calculation
     * Used to determine queue position for a specific appointment
     */
    @Query("SELECT COUNT(q) FROM QueueLog q WHERE q.clinicId = :clinicId " +
           "AND q.status = :status AND q.createdAt < :createdAt " +
           "ORDER BY q.priority DESC, q.createdAt ASC")
    long countByClinicIdAndStatusAndCreatedAtBefore(
            @Param("clinicId") Long clinicId,
            @Param("status") String status,
            @Param("createdAt") LocalDateTime createdAt);

    /**
     * Calculate position by counting higher priority entries and earlier entries with same priority
     */
    @Query("SELECT COUNT(q) FROM QueueLog q WHERE q.clinicId = :clinicId " +
           "AND q.status = 'IN_QUEUE' AND (" +
           "q.priority > (SELECT q2.priority FROM QueueLog q2 WHERE q2.queueId = :queueId) OR " +
           "(q.priority = (SELECT q2.priority FROM QueueLog q2 WHERE q2.queueId = :queueId) " +
           "AND q.createdAt < (SELECT q2.createdAt FROM QueueLog q2 WHERE q2.queueId = :queueId)))")
    long getQueuePosition(@Param("queueId") Long queueId, @Param("clinicId") Long clinicId);

    /**
     * Get total count of IN_QUEUE entries for a clinic
     */
    long countByClinicIdAndStatus(Long clinicId, String status);

    /**
     * Find queue entries by clinic and status
     */
    List<QueueLog> findByClinicIdAndStatus(Long clinicId, String status);

    /**
     * Check if any IN_QUEUE entry exists for clinic
     */
    boolean existsByClinicIdAndStatus(Long clinicId, String status);

    /**
     * Find the currently serving (CALLED status) queue entry for a clinic
     * Returns the patient with status = 'CALLED' (being served by doctor)
     */
    @Query(value = "SELECT * FROM queue_log WHERE clinic_id = :clinicId AND status = 'CALLED' " +
           "LIMIT 1", nativeQuery = true)
    Optional<QueueLog> findCurrentlyServing(@Param("clinicId") Long clinicId);
}
