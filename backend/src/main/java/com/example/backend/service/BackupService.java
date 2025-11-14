package com.example.backend.service;

import com.example.backend.model.*;
import com.example.backend.model.appointments.Appointment;
import com.example.backend.model.clinic.Clinic;
import com.example.backend.model.queue.QueueLog;
import com.example.backend.repo.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/**
 * Service for backing up and restoring system data.
 * Creates JSON-based backups of all database entities.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BackupService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final StaffRepository staffRepository;
    private final DoctorRepository doctorRepository;
    private final ClinicRepository clinicRepository;
    private final AppointmentRepository appointmentRepository;
    private final QueueRepository queueRepository;

    @Value("${backup.directory:./backups}")
    private String backupDirectory;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .enable(SerializationFeature.INDENT_OUTPUT)
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    /**
     * Creates a full backup of all system data
     * @return Path to the backup file
     */
    @Transactional(readOnly = true)
    public String createBackup() throws IOException {
        log.info("Starting full system backup...");
        
        // Create backup directory if it doesn't exist
        Path backupDir = Paths.get(backupDirectory);
        if (!Files.exists(backupDir)) {
            Files.createDirectories(backupDir);
        }

        // Generate backup filename with timestamp
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String backupFileName = String.format("backup_%s.zip", timestamp);
        Path backupFilePath = backupDir.resolve(backupFileName);

        // Create ZIP file with all data
        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(backupFilePath.toFile()))) {
            
            // Backup metadata
            BackupMetadata metadata = new BackupMetadata();
            metadata.setTimestamp(LocalDateTime.now());
            metadata.setVersion("1.0");
            writeToZip(zos, "metadata.json", objectMapper.writeValueAsString(metadata));

            // Backup all entities
            log.info("Backing up users...");
            List<User> users = userRepository.findAll();
            writeToZip(zos, "users.json", objectMapper.writeValueAsString(users));

            log.info("Backing up patients...");
            List<Patient> patients = patientRepository.findAll();
            writeToZip(zos, "patients.json", objectMapper.writeValueAsString(patients));

            log.info("Backing up staff...");
            List<Staff> staff = staffRepository.findAll();
            writeToZip(zos, "staff.json", objectMapper.writeValueAsString(staff));

            log.info("Backing up doctors...");
            List<Doctor> doctors = doctorRepository.findAll();
            writeToZip(zos, "doctors.json", objectMapper.writeValueAsString(doctors));

            log.info("Backing up clinics...");
            List<Clinic> clinics = clinicRepository.findAll();
            writeToZip(zos, "clinics.json", objectMapper.writeValueAsString(clinics));

            log.info("Backing up appointments...");
            List<Appointment> appointments = appointmentRepository.findAll();
            writeToZip(zos, "appointments.json", objectMapper.writeValueAsString(appointments));

            log.info("Backing up queue logs...");
            List<QueueLog> queueLogs = queueRepository.findAll();
            writeToZip(zos, "queue_logs.json", objectMapper.writeValueAsString(queueLogs));
        }

        log.info("Backup completed successfully: {}", backupFilePath);
        return backupFilePath.toString();
    }

    /**
     * Lists all available backups
     */
    public List<BackupInfo> listBackups() throws IOException {
        Path backupDir = Paths.get(backupDirectory);
        if (!Files.exists(backupDir)) {
            return Collections.emptyList();
        }

        List<BackupInfo> backups = new ArrayList<>();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(backupDir, "backup_*.zip")) {
            for (Path entry : stream) {
                BackupInfo info = new BackupInfo();
                info.setFileName(entry.getFileName().toString());
                info.setFilePath(entry.toString());
                info.setFileSize(Files.size(entry));
                info.setCreatedDate(Files.getLastModifiedTime(entry).toInstant());
                backups.add(info);
            }
        }

        // Sort by creation date descending
        backups.sort((a, b) -> b.getCreatedDate().compareTo(a.getCreatedDate()));
        return backups;
    }

    /**
     * Restores data from a backup file
     * WARNING: This will delete existing data!
     */
    @Transactional
    public void restoreBackup(String backupFileName) throws IOException {
        log.warn("Starting restore from backup: {}", backupFileName);
        
        Path backupFilePath = Paths.get(backupDirectory, backupFileName);
        if (!Files.exists(backupFilePath)) {
            throw new FileNotFoundException("Backup file not found: " + backupFileName);
        }

        // Read backup file
        Map<String, String> backupData = new HashMap<>();
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(backupFilePath.toFile()))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String content = new String(zis.readAllBytes());
                backupData.put(entry.getName(), content);
                zis.closeEntry();
            }
        }

        // Verify metadata
        if (!backupData.containsKey("metadata.json")) {
            throw new IllegalArgumentException("Invalid backup file: missing metadata");
        }

        log.info("Clearing existing data...");
        // Delete in correct order to respect foreign key constraints
        queueRepository.deleteAll();
        appointmentRepository.deleteAll();
        staffRepository.deleteAll();
        patientRepository.deleteAll();
        userRepository.deleteAll();
        // Note: Keep clinics and doctors as they might be reference data

        log.info("Restoring data from backup...");
        
        // Restore in correct order
        if (backupData.containsKey("users.json")) {
            List<User> users = objectMapper.readValue(backupData.get("users.json"), 
                objectMapper.getTypeFactory().constructCollectionType(List.class, User.class));
            userRepository.saveAll(users);
            log.info("Restored {} users", users.size());
        }

        if (backupData.containsKey("patients.json")) {
            List<Patient> patients = objectMapper.readValue(backupData.get("patients.json"), 
                objectMapper.getTypeFactory().constructCollectionType(List.class, Patient.class));
            patientRepository.saveAll(patients);
            log.info("Restored {} patients", patients.size());
        }

        if (backupData.containsKey("staff.json")) {
            List<Staff> staff = objectMapper.readValue(backupData.get("staff.json"), 
                objectMapper.getTypeFactory().constructCollectionType(List.class, Staff.class));
            staffRepository.saveAll(staff);
            log.info("Restored {} staff", staff.size());
        }

        if (backupData.containsKey("doctors.json")) {
            List<Doctor> doctors = objectMapper.readValue(backupData.get("doctors.json"), 
                objectMapper.getTypeFactory().constructCollectionType(List.class, Doctor.class));
            doctorRepository.saveAll(doctors);
            log.info("Restored {} doctors", doctors.size());
        }

        if (backupData.containsKey("clinics.json")) {
            List<Clinic> clinics = objectMapper.readValue(backupData.get("clinics.json"), 
                objectMapper.getTypeFactory().constructCollectionType(List.class, Clinic.class));
            clinicRepository.saveAll(clinics);
            log.info("Restored {} clinics", clinics.size());
        }

        if (backupData.containsKey("appointments.json")) {
            List<Appointment> appointments = objectMapper.readValue(backupData.get("appointments.json"), 
                objectMapper.getTypeFactory().constructCollectionType(List.class, Appointment.class));
            appointmentRepository.saveAll(appointments);
            log.info("Restored {} appointments", appointments.size());
        }

        if (backupData.containsKey("queue_logs.json")) {
            List<QueueLog> queueLogs = objectMapper.readValue(backupData.get("queue_logs.json"), 
                objectMapper.getTypeFactory().constructCollectionType(List.class, QueueLog.class));
            queueRepository.saveAll(queueLogs);
            log.info("Restored {} queue logs", queueLogs.size());
        }

        log.info("Restore completed successfully");
    }

    /**
     * Deletes a backup file
     */
    public void deleteBackup(String backupFileName) throws IOException {
        Path backupFilePath = Paths.get(backupDirectory, backupFileName);
        if (!Files.exists(backupFilePath)) {
            throw new FileNotFoundException("Backup file not found: " + backupFileName);
        }
        
        Files.delete(backupFilePath);
        log.info("Deleted backup: {}", backupFileName);
    }

    /**
     * Gets detailed information about a backup file
     */
    public BackupDetails getBackupDetails(String backupFileName) throws IOException {
        Path backupFilePath = Paths.get(backupDirectory, backupFileName);
        if (!Files.exists(backupFilePath)) {
            throw new FileNotFoundException("Backup file not found: " + backupFileName);
        }

        BackupDetails details = new BackupDetails();
        details.setFileName(backupFileName);
        details.setFilePath(backupFilePath.toString());
        details.setFileSize(Files.size(backupFilePath));
        details.setCreatedDate(Files.getLastModifiedTime(backupFilePath).toInstant());

        // Read entity counts from backup
        Map<String, Integer> entityCounts = new HashMap<>();
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(backupFilePath.toFile()))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.getName().endsWith(".json") && !entry.getName().equals("metadata.json")) {
                    String content = new String(zis.readAllBytes());
                    // Simple array size check
                    int count = objectMapper.readTree(content).size();
                    String entityType = entry.getName().replace(".json", "");
                    entityCounts.put(entityType, count);
                }
                zis.closeEntry();
            }
        }
        details.setEntityCounts(entityCounts);

        return details;
    }

    private void writeToZip(ZipOutputStream zos, String fileName, String content) throws IOException {
        ZipEntry entry = new ZipEntry(fileName);
        zos.putNextEntry(entry);
        zos.write(content.getBytes());
        zos.closeEntry();
    }

    // Helper classes
    public static class BackupMetadata {
        private LocalDateTime timestamp;
        private String version;

        public LocalDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }
    }

    public static class BackupInfo {
        private String fileName;
        private String filePath;
        private long fileSize;
        private java.time.Instant createdDate;

        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }
        public String getFilePath() { return filePath; }
        public void setFilePath(String filePath) { this.filePath = filePath; }
        public long getFileSize() { return fileSize; }
        public void setFileSize(long fileSize) { this.fileSize = fileSize; }
        public java.time.Instant getCreatedDate() { return createdDate; }
        public void setCreatedDate(java.time.Instant createdDate) { this.createdDate = createdDate; }
    }

    public static class BackupDetails extends BackupInfo {
        private Map<String, Integer> entityCounts;

        public Map<String, Integer> getEntityCounts() { return entityCounts; }
        public void setEntityCounts(Map<String, Integer> entityCounts) { this.entityCounts = entityCounts; }
    }
}
