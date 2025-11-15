# SingHealth Clinic Queue & Appointment Management System - Project Information

## Project Overview
A comprehensive healthcare clinic management system enabling patients to book appointments, check-in to queues, and track their position in real-time. Staff manage queues and patient flow. Admins oversee the entire system with analytics, user management, and backup/restore capabilities.

## Technology Stack

### Frontend
- **React 19.1.1** with Vite 7.1.7 build tool
- **Routing**: React Router DOM v7.9.5 (BrowserRouter)
- **State Management**: React Context (AuthContext) for global auth state
- **HTTP Client**: Native Fetch API with centralized `api.js` client
- **Authentication**: Supabase JWT tokens via `supabase.js` and `supabaseAdmin.js`
- **UI**: CSS-in-JS per component
- **Visualization**: Recharts for admin dashboard charts
- **Deployment**: Docker + Nginx

### Backend
- **Spring Boot 3.5.6** with Java 21 LTS
- **Build Tool**: Maven with pom.xml
- **ORM**: Hibernate 6+ with Spring Data JPA
- **Database**: PostgreSQL (Supabase-hosted, AWS Singapore)
- **Connection Pool**: HikariCP (max 5 connections)
- **Validation**: Jakarta Bean Validation
- **Documentation**: Swagger/OpenAPI 2.2.0
- **Email**: SendGrid API v4.10.2
- **PDF Generation**: iText7 v8.0.2
- **Real-time Updates**: Server-Sent Events (SSE)
- **Event Publishing**: Spring ApplicationEventPublisher
- **JSON Processing**: Jackson ObjectMapper
- **Async Support**: @EnableAsync configured

## System Architecture

### Layered Architecture Pattern
```
Frontend Layer (React)
    ↓
    API Layer (HTTP/REST via /api/*)
    ↓
Spring Boot Backend Layer
    ├─ Presentation Layer (11 Controllers)
    ├─ Business Logic Layer (12 Services)
    ├─ Data Access Layer (7 Repositories)
    └─ Models Layer (7 Entities + 2 Enums)
    ↓
PostgreSQL Database (8 Tables)
    ↓
External Services (Supabase Auth, SendGrid Email)
```

## Frontend Architecture

### Directory Structure: `frontend/src/`
```
├── pages/           (7 Role-based page components)
├── components/      (6 Reusable shared components)
├── contexts/        (AuthContext for global state)
├── lib/             (api.js, supabase.js, supabaseAdmin.js)
├── App.jsx          (BrowserRouter setup)
├── main.jsx         (Entry point)
└── index.css        (Global styles)
```

### Pages/Views (7 Total)
| Component | Role | Purpose |
|-----------|------|---------|
| **PatientView.jsx** | Patient | Dashboard, appointments, queue tracking (SSE), medical history |
| **PatientProfile.jsx** | Patient | Emergency contact, medical history, allergies, blood type |
| **StaffView.jsx** | Staff | Queue management, patient check-in (priority levels), doctor management, daily reports |
| **StaffDisplay.jsx** | Staff | Public queue display (TV/monitor), currently serving, waiting list, auto-refresh 5s |
| **AdminView.jsx** | Admin | System dashboard, user CRUD, clinic CRUD, doctor CRUD, reports, backup/restore |
| **AuthPage.jsx** | All | Sign in/up, patient self-registration with validation |
| **UnauthorizedPage.jsx** | All | Access denied error page |

### Shared Components (6 Total)
- **AuthContext.jsx**: Global auth state, JWT session, user role detection
- **ProtectedRoute.jsx**: Role-based route access control
- **Navbar.jsx**: Role-based navigation, auto-hide on scroll
- **Toast.jsx**: Success/error notifications with auto-dismiss
- **LoadingSpinner.jsx**: Loading state indicator
- **BackupManagement.jsx**: Backup create/list/download/restore/delete

### API Clients (3 Total)
- **api.js**: Centralized HTTP client, error handling, base URL configuration
- **supabase.js**: Supabase Auth client (public instance)
- **supabaseAdmin.js**: Supabase admin operations (server-side)

## Backend Architecture

### Directory Structure: `backend/src/main/java/com/example/backend/`
```
├── controller/      (11 REST Controllers)
├── service/         (12 Business Logic Services)
├── repo/            (7 Spring Data JPA Repositories)
├── model/           (7 JPA Entities + 2 Enums)
├── config/          (SwaggerConfig, SendGridConfig)
├── event/           (QueueChangedEvent)
├── exception/       (DoubleBookingException, QueueException, ShiftOverlapException)
└── common/          (DTOs, Utilities, ErrorResponse)
```

### Controllers (11 Total) - REST API Endpoints
| Controller | Mapping | Responsibility |
|------------|---------|-----------------|
| **AppointmentController** | `/api/appointments` | CRUD, slot validation (max 3/slot), double-booking prevention |
| **QueueController** | `/api/queue` | Check-in, position tracking, status updates, SSE streams, re-queue |
| **AdminController** | `/api/admin` | User CRUD (patients, staff), counts, transfers |
| **UserController** | `/api/users` | User CRUD, email lookup, auth integration |
| **ClinicController** | `/api/clinics` | Clinic CRUD, filtering (region, area, specialty, type) |
| **DoctorController** | `/api/doctors` | Doctor CRUD, shift validation, clinic assignment |
| **NotificationController** | `/api/notifications` | Email triggers (confirm, 3-away, your-turn) |
| **ReportController** | `/api/report` | Daily clinic PDF reports |
| **BackupController** | `/api/admin/backup` | Full backup create/list/restore/delete |
| **SystemUsageReportController** | `/api/report` | System-wide usage PDF reports (date range) |
| **HealthController** | `/api/health` | Health checks, database connectivity |

### Services (12 Total) - Business Logic with @Transactional
| Service | Key Responsibility |
|---------|-------------------|
| **AppointmentService** | CRUD, confirmation emails, slot capacity (max 3), double-booking prevention |
| **QueueService** | Check-in, position calculation, priority-based sorting (Emergency>Elderly>Normal), SSE events, notifications |
| **QueueSseService** | SSE emitter management, event listener for QueueChangedEvent |
| **NotificationService** | SendGrid email integration, HTML templates (3 types) |
| **PatientService** | Patient CRUD, IC validation, age range filtering |
| **StaffService** | Staff CRUD, clinic assignment, transfers, name search |
| **UserService** | User CRUD, email/UUID lookups |
| **ClinicService** | Clinic CRUD, filtering by region/area/specialty/type |
| **DoctorService** | Doctor CRUD, shift overlap validation, clinic assignment |
| **BackupService** | Full system backup (ZIP+JSON), metadata, restore operations |
| **ReportService** | Daily clinic reports (PDF), metrics calculation |
| **SystemUsageReportService** | System-wide metrics aggregation, date range filtering |

### Repositories (7 Total) - Spring Data JPA
- **AppointmentRepository**: Patient/clinic/doctor/status filtering, date range, slot count
- **QueueRepository**: Clinic queue with priority ordering, status management, currently-serving query
- **PatientRepository**: Email/IC lookups, gender/blood-type filtering
- **StaffRepository**: Email/clinic filtering, name search
- **UserRepository**: Email/UUID lookups
- **ClinicRepository**: Type/region/area filtering
- **DoctorRepository**: Clinic assignment lookup

### Entities (7 Total) - JPA with JOINED Inheritance

#### User (Abstract Base Entity)
```
- userId: Long (PK)
- authUuid: UUID (unique)
- email: String (unique)
- fname, lname: String
- role: String (PATIENT, STAFF, ADMIN)
- createdAt: LocalDateTime (@PrePersist)
```
**Subclasses**: Patient, Staff

#### Patient (extends User)
```
- patientIc: String (unique)
- dateOfBirth: LocalDate
- gender, bloodType: String
- emergencyContact, emergencyContactPhone: String
- medicalHistory, allergies: String
```

#### Staff (extends User)
```
- clinic: Clinic (@ManyToOne)
```

#### Doctor (Standalone Entity)
```
- id: Long (PK)
- fname, lname: String
- assignedClinic: Long (FK)
- shiftDays: List<Integer> (JSONB, 1-7 range)
- createdAt: LocalDateTime (@PrePersist)
```

#### Clinic
```
- id: Long (PK)
- name, address, telephoneNo, region, area, specialty: String
- clinicType: ClinicType (GP, SPECIALIST, etc.)
- Operating hours: Mon-Fri AM/PM, Sat, Sun, PH (LocalTime fields)
- apptIntervalMin: Long (default 15)
- createdAt, updatedAt: LocalDateTime (@PrePersist/@PreUpdate)
```

#### Appointment
```
- appointmentId: Long (PK)
- patientId, clinicId, doctorId: Long (FKs)
- dateTime: LocalDateTime
- apptStatus: AppointmentStatus (SCHEDULED, COMPLETED, CANCELLED, NO_SHOW, MISSED)
- treatmentSummary: String
- createdAt: LocalDateTime (@PrePersist)
```

#### QueueLog
```
- queueId: Long (PK)
- clinicId, appointmentId: Long (FKs)
- status: String (IN_QUEUE, CALLED, DONE, MISSED)
- priority: Integer (NORMAL=1, ELDERLY=2, EMERGENCY=3)
- createdAt, appointmentStart: LocalDateTime
- Static methods: isValidStatus(), isValidPriority(), isValidTransition()
```

### Enums (2 Total)
- **AppointmentStatus**: SCHEDULED, ARRIVED, NO_SHOW, MISSED, CANCELLED, COMPLETED
- **ClinicType**: GP, SPECIALIST (extensible)

## Key Design Patterns & Features

### 1. Queue Management Algorithm
- **Priority Ordering**: Emergency (3) > Elderly (2) > Normal (1)
- **Status State Machine**: IN_QUEUE → CALLED → DONE/MISSED
- **Missed Requeue**: Automatic re-queueing with event publishing
- **Real-time Updates**: SSE (Server-Sent Events) with ConcurrentHashMap for emitters

### 2. Appointment Slot Management
- **Double-Booking Prevention**: Max 3 appointments per slot
- **Custom Exception**: DoubleBookingException with validation

### 3. Event-Driven Architecture
- **QueueChangedEvent**: Published by QueueService on state changes
- **QueueSseService**: Listens to events, notifies connected SSE clients
- **Automatic Notifications**: 3-away alerts, your-turn alerts

### 4. Email Notifications (SendGrid Integration)
- **Appointment Confirmation**: Sent on booking
- **Queue Position**: "X patients away" at specific milestones
- **Your Turn Alert**: When patient is called
- **HTML Templates**: Professional email formatting

### 5. Backup & Restore System
- **Full System Backup**: ZIP file with JSON serialization of all entities
- **Metadata Tracking**: Backup timestamp, entity counts
- **Restore Operations**: Data replacement from JSON
- **File Management**: List, download, delete backups

### 6. Report Generation (iText7 PDF)
- **Daily Clinic Reports**: Patients seen, wait times, no-show rates
- **System Usage Reports**: Date-range filtering, system-wide metrics
- **Metrics Calculated**: Average wait time, no-show percentage, appointment stats

### 7. Role-Based Access Control
- **Frontend**: ProtectedRoute component with role validation
- **Backend**: Controllers validate user permissions (via JWT/AuthUuid)
- **Roles**: PATIENT, STAFF, ADMIN with distinct capabilities

## Database Schema (PostgreSQL)

### 8 Main Tables with JOINED Inheritance
```sql
-- User hierarchy (JOINED inheritance strategy)
user (userId, authUuid, email, fname, lname, role, createdAt)
patient (patient_id→user.userId, patientIc, dateOfBirth, gender, bloodType, medicalHistory, allergies, emergencyContact)
staff (staff_id→user.userId, clinic_id→clinic.id)

-- Independent entities
doctor (id, fname, lname, assignedClinic, shiftDays[JSONB], createdAt)
clinic (id, name, address, telephoneNo, region, area, specialty, clinicType, operating_hours..., apptIntervalMin, createdAt, updatedAt)
appointment (appointmentId, patientId, clinicId, doctorId, dateTime, apptStatus, treatmentSummary, createdAt)
queue_log (queueId, clinicId, appointmentId, status, priority, createdAt, appointmentStart)

-- Optional: reports (audit/history)
```

### Key Constraints
- Composite indexes on frequently queried columns (clinic+status, patient+dateTime)
- JSONB for doctor shift days (PostgreSQL-specific)
- Foreign key cascades for clinic deletions

## External Service Integrations

### Supabase Authentication
- **JWT Tokens**: Issued by Supabase Auth
- **Auth Users Table**: Synced with User entity
- **Session Management**: Handled by frontend AuthContext
- **Registration**: Patient self-registration via AuthPage

### SendGrid Email API
- **Base URL**: api.sendgrid.com
- **API Key**: Retrieved from environment variable
- **Endpoints Used**: Mail send (POST /mail/send)
- **Email Types**: 3 templates (confirmation, 3-away, your-turn)

## Configuration & Environment

### Application Properties (Spring Boot)
```properties
# Database
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.dialect=PostgreSQLDialect

# SendGrid
sendgrid.api.key=${SENDGRID_API_KEY}
sendgrid.sender.email=${SENDGRID_SENDER_EMAIL}

# Supabase
supabase.url=${SUPABASE_URL}
supabase.key=${SUPABASE_ANON_KEY}

# Backup
backup.directory=./backups/
```

### Frontend Environment
```javascript
// Vite env vars
VITE_API_URL=http://localhost:8080/api
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon_key]
```

## API Communication Flow

### Frontend → Backend
1. **Axios/Fetch via api.js**: Centralized HTTP client with error handling
2. **Headers**: Authorization (Bearer JWT), Content-Type: application/json
3. **Error Handling**: Global error response handler in api.js
4. **CORS**: Enabled globally on backend (@CrossOrigin)

### Real-time Queue Updates (SSE)
1. **Frontend**: `GET /api/queue/position/{appointmentId}/stream`
2. **Backend**: QueueController creates SseEmitter
3. **Event Trigger**: QueueService publishes QueueChangedEvent
4. **QueueSseService**: Listens and sends updates to connected emitters
5. **Long-lived Connection**: Timeout = Long.MAX_VALUE (persistent)

## Common Patterns & Best Practices

### DTOs Used
- CreatePatientRequestDTO, CreateStaffRequestDTO (input validation)
- AppointmentUpdateDTO, UpdateStaffRequestDTO (partial updates)
- QueueEntryDTO, QueuePositionDTO (response formatting)
- ErrorResponse (standardized error format)

### Exception Handling
- **DoubleBookingException**: When slot is full (>3 appointments)
- **QueueException**: Queue operation errors
- **ShiftOverlapException**: Doctor shift conflicts
- **Global @ExceptionHandler**: Returns ErrorResponse with HTTP status

### Validation
- **@Valid**: Bean Validation on request bodies
- **Custom validators**: ShiftDays (1-7), Priority (1-3), Status transitions
- **Double-booking check**: Service-level business rule enforcement

### Transactions
- **@Transactional**: Services ensure ACID compliance
- **Readability**: AppointmentService, QueueService, BackupService use explicit transactions
- **Rollback**: On exceptions, automatic rollback configured

## Important File References

### Documentation Files
- `backend/QUEUE_IMPLEMENTATION.md`: Queue algorithm details
- `backend/CLAUDE.md`: Java-pro agent instructions
- `frontend/README.md`: Frontend setup and deployment

### Configuration Files
- `backend/pom.xml`: Maven dependencies and build config
- `frontend/package.json`: npm dependencies
- `backend/src/main/resources/application.properties`: Spring Boot config

## Next Agent Instructions

**For Development Tasks**:
1. Refer to specific controller/service for API changes
2. Follow layered architecture: Controller → Service → Repository → Database
3. Use DTOs for input validation and response formatting
4. Add @Transactional to new service methods
5. Event-driven updates use ApplicationEventPublisher

**For Bug Fixes**:
1. Check service layer business logic first (transactions, validation)
2. Verify SSE connections in QueueSseService for real-time issues
3. Review repository queries for performance issues
4. Check exception handlers in controllers

**For New Features**:
1. Add new entity in model package
2. Create repository interface extending JpaRepository
3. Create service class with business logic (@Service, @Transactional)
4. Create controller with REST endpoints (@RestController, @RequestMapping)
5. Update frontend pages and API client accordingly
6. Add test cases and update documentation

---

**Last Updated**: Based on comprehensive codebase scan of backend (11 controllers, 12 services, 7 repositories) and frontend (7 pages, 6 components, 3 API clients)
