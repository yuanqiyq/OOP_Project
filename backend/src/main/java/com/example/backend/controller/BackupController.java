package com.example.backend.controller;

import com.example.backend.dto.ErrorResponse;
import com.example.backend.service.BackupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for backup and restore operations.
 * Admin-only endpoints for data backup and recovery.
 */
@RestController
@RequestMapping("/api/admin/backup")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Backup Management", description = "Admin endpoints for backup and restore operations")
@Slf4j
public class BackupController {

    private final BackupService backupService;

    /**
     * Create a new backup of all system data
     */
    @PostMapping("/create")
    @Operation(summary = "Create backup", description = "Creates a full backup of all system data as a ZIP file")
    public ResponseEntity<?> createBackup() {
        try {
            log.info("Backup creation requested");
            String backupPath = backupService.createBackup();
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Backup created successfully");
            response.put("backupPath", backupPath);
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            log.error("Failed to create backup", e);
            ErrorResponse errorResponse = new ErrorResponse(
                500,
                "Internal Server Error",
                "Failed to create backup: " + e.getMessage(),
                "/api/admin/backup/create"
            );
            return ResponseEntity.status(500).body(errorResponse);
        } catch (Exception e) {
            log.error("Unexpected error creating backup", e);
            ErrorResponse errorResponse = new ErrorResponse(
                500,
                "Internal Server Error",
                "An unexpected error occurred: " + e.getMessage(),
                "/api/admin/backup/create"
            );
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * List all available backups
     */
    @GetMapping("/list")
    @Operation(summary = "List backups", description = "Returns a list of all available backup files")
    public ResponseEntity<?> listBackups() {
        try {
            List<BackupService.BackupInfo> backups = backupService.listBackups();
            return ResponseEntity.ok(backups);
        } catch (IOException e) {
            log.error("Failed to list backups", e);
            ErrorResponse errorResponse = new ErrorResponse(
                500,
                "Internal Server Error",
                "Failed to list backups: " + e.getMessage(),
                "/api/admin/backup/list"
            );
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Get detailed information about a specific backup
     */
    @GetMapping("/details/{fileName}")
    @Operation(summary = "Get backup details", description = "Returns detailed information about a specific backup file")
    public ResponseEntity<?> getBackupDetails(@PathVariable String fileName) {
        try {
            BackupService.BackupDetails details = backupService.getBackupDetails(fileName);
            return ResponseEntity.ok(details);
        } catch (FileNotFoundException e) {
            ErrorResponse errorResponse = new ErrorResponse(
                404,
                "Not Found",
                "Backup file not found: " + fileName,
                "/api/admin/backup/details/" + fileName
            );
            return ResponseEntity.status(404).body(errorResponse);
        } catch (IOException e) {
            log.error("Failed to get backup details", e);
            ErrorResponse errorResponse = new ErrorResponse(
                500,
                "Internal Server Error",
                "Failed to get backup details: " + e.getMessage(),
                "/api/admin/backup/details/" + fileName
            );
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Download a backup file
     */
    @GetMapping("/download/{fileName}")
    @Operation(summary = "Download backup", description = "Downloads a backup file")
    public ResponseEntity<?> downloadBackup(@PathVariable String fileName) {
        try {
            BackupService.BackupDetails details = backupService.getBackupDetails(fileName);
            Resource resource = new FileSystemResource(details.getFilePath());
            
            if (!resource.exists()) {
                ErrorResponse errorResponse = new ErrorResponse(
                    404,
                    "Not Found",
                    "Backup file not found: " + fileName,
                    "/api/admin/backup/download/" + fileName
                );
                return ResponseEntity.status(404).body(errorResponse);
            }

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(details.getFileSize())
                .body(resource);
                
        } catch (FileNotFoundException e) {
            ErrorResponse errorResponse = new ErrorResponse(
                404,
                "Not Found",
                "Backup file not found: " + fileName,
                "/api/admin/backup/download/" + fileName
            );
            return ResponseEntity.status(404).body(errorResponse);
        } catch (IOException e) {
            log.error("Failed to download backup", e);
            ErrorResponse errorResponse = new ErrorResponse(
                500,
                "Internal Server Error",
                "Failed to download backup: " + e.getMessage(),
                "/api/admin/backup/download/" + fileName
            );
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Restore data from a backup
     * WARNING: This will delete existing data!
     */
    @PostMapping("/restore/{fileName}")
    @Operation(
        summary = "Restore from backup", 
        description = "Restores system data from a backup file. WARNING: This will delete all existing data!"
    )
    public ResponseEntity<?> restoreBackup(@PathVariable String fileName) {
        try {
            log.warn("Restore requested for backup: {}", fileName);
            backupService.restoreBackup(fileName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Data restored successfully from backup: " + fileName);
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.ok(response);
        } catch (FileNotFoundException e) {
            ErrorResponse errorResponse = new ErrorResponse(
                404,
                "Not Found",
                "Backup file not found: " + fileName,
                "/api/admin/backup/restore/" + fileName
            );
            return ResponseEntity.status(404).body(errorResponse);
        } catch (IllegalArgumentException e) {
            ErrorResponse errorResponse = new ErrorResponse(
                400,
                "Bad Request",
                "Invalid backup file: " + e.getMessage(),
                "/api/admin/backup/restore/" + fileName
            );
            return ResponseEntity.status(400).body(errorResponse);
        } catch (IOException e) {
            log.error("Failed to restore backup", e);
            ErrorResponse errorResponse = new ErrorResponse(
                500,
                "Internal Server Error",
                "Failed to restore backup: " + e.getMessage(),
                "/api/admin/backup/restore/" + fileName
            );
            return ResponseEntity.status(500).body(errorResponse);
        } catch (Exception e) {
            log.error("Unexpected error restoring backup", e);
            ErrorResponse errorResponse = new ErrorResponse(
                500,
                "Internal Server Error",
                "An unexpected error occurred: " + e.getMessage(),
                "/api/admin/backup/restore/" + fileName
            );
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Delete a backup file
     */
    @DeleteMapping("/delete/{fileName}")
    @Operation(summary = "Delete backup", description = "Deletes a backup file permanently")
    public ResponseEntity<?> deleteBackup(@PathVariable String fileName) {
        try {
            backupService.deleteBackup(fileName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Backup deleted successfully: " + fileName);
            
            return ResponseEntity.ok(response);
        } catch (FileNotFoundException e) {
            ErrorResponse errorResponse = new ErrorResponse(
                404,
                "Not Found",
                "Backup file not found: " + fileName,
                "/api/admin/backup/delete/" + fileName
            );
            return ResponseEntity.status(404).body(errorResponse);
        } catch (IOException e) {
            log.error("Failed to delete backup", e);
            ErrorResponse errorResponse = new ErrorResponse(
                500,
                "Internal Server Error",
                "Failed to delete backup: " + e.getMessage(),
                "/api/admin/backup/delete/" + fileName
            );
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Health check for backup system
     */
    @GetMapping("/health")
    @Operation(summary = "Backup system health check")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("message", "Backup service is running");
        response.put("timestamp", java.time.LocalDateTime.now());
        return ResponseEntity.ok(response);
    }
}
