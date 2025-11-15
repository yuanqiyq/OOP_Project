# SingHealth Clinic Queue & Appointment Management System

A comprehensive healthcare clinic management system enabling patients to book appointments, check-in to queues, and track their position in real-time. Staff manage queues and patient flow. Admins oversee the entire system with analytics, user management, and backup/restore capabilities.

## Key Features

- **Appointment Management**: Create, update, delete, and retrieve appointments with double-booking prevention (max 3 per slot)
- **Queue Management**: Real-time queue tracking with priority-based ordering (Emergency > Elderly > Normal)
- **Role-Based Access**: Distinct interfaces for Patients, Staff, and Admins with granular permission control
- **Real-time Updates**: Server-Sent Events (SSE) for live queue position tracking
- **Email Notifications**: SendGrid integration for appointment confirmations and queue alerts (3-away, your-turn)
- **PDF Reports**: Daily clinic and system-wide usage reports with metrics calculation
- **Backup & Restore**: Full system backup with automatic metadata tracking
- **User Management**: Patient self-registration with validation, staff and admin management

## Environment Variables

Before running the application, you need to set up the following environment variables for both backend and frontend.

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```properties
# Database Configuration (PostgreSQL/Supabase)
DB_URL=jdbc:postgresql://your-supabase-host:5432/postgres
DB_USERNAME=your_database_username
DB_PASSWORD=your_database_password

# SendGrid Email Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
NOTIFICATION_SENDER_EMAIL=your_sender_email@example.com
``` 

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```properties
# Backend API URL
VITE_API_URL=http://localhost:8080

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Setting Environment Variables

**Option 1: Create `.env` files** (Recommended)
Create `.env` files in both `backend/` and `frontend/` directories with the variables listed above.

**Option 2: Export in Terminal**
```bash
# Backend variables
export DB_URL="jdbc:postgresql://..."
export DB_USERNAME="..."
export DB_PASSWORD="..."
export SENDGRID_API_KEY="..."
export NOTIFICATION_SENDER_EMAIL="..."

# Frontend variables (for Vite)
export VITE_API_URL="http://localhost:8080"
export VITE_SUPABASE_URL="..."
export VITE_SUPABASE_ANON_KEY="..."
export VITE_SUPABASE_SERVICE_ROLE_KEY="..."
```

**Option 3: Set in IDE**
Configure environment variables in your IDE's run configuration for the backend and frontend servers.

## Getting Started

### Prerequisites

- **Java 21 or higher** (for backend)
- **Node.js 18+** (for frontend)
- **PostgreSQL** database or Supabase account
- **Maven** (or use the included Maven wrapper)
- **npm** (for frontend)

### Running the Application

#### Backend Setup & Running

1. **Clone the repository**
   ```bash
   git clone https://github.com/yuanqiyq/OOP_Project.git
   cd OOP_Project/backend
   ```

2. **Set up environment variables** (see Environment Variables section above)
   ```bash
   # Create backend/.env with database and SendGrid credentials
   ```

3. **Run the backend**
   ```bash
   ./mvnw spring-boot:run
   ```

4. **Backend is ready at:**
   - API Base URL: `http://localhost:8080/api`
   - Swagger UI: `http://localhost:8080/swagger-ui.html`
   - Health Check: `http://localhost:8080/api/health`

#### Frontend Setup & Running

1. **Install dependencies**
   ```bash
   cd OOP_Project/frontend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Create frontend/.env with Supabase and API URL (see Environment Variables section above)
   ```

3. **Run the frontend development server**
   ```bash
   npm run dev
   ```

4. **Frontend is ready at:**
   - Application: `http://localhost:5173` (default Vite port)

### Full Application Access

Once both backend and frontend are running:
- **Patient Interface**: `http://localhost:5173` (register/login required)
- **Staff Interface**: `http://localhost:5173` (staff credentials)
- **Admin Dashboard**: `http://localhost:5173` (admin credentials)
- **API Documentation**: `http://localhost:8080/swagger-ui.html`

## Appointments API

The application provides a comprehensive appointment management system with the following capabilities:

### Key Features
- **Create Appointments**: Schedule new appointments with automatic status assignment
- **Double Booking Prevention**: System prevents scheduling conflicts for the same doctor, clinic, and time
- **Status Management**: Track and update appointment statuses throughout the workflow
- **Search & Filter**: Find appointments by patient, doctor, clinic, status, or date range
- **Validation**: Comprehensive input validation and error handling

### Sample Appointment Creation

```bash
curl -X POST http://localhost:8080/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": 1,
    "doctorId": 2,
    "clinicId": 1,
    "dateTime": "2025-10-25T14:30:00"
  }'
```

### Error Handling
- **409 Conflict**: Returned when attempting to create a double booking
- **400 Bad Request**: Invalid or missing required fields
- **404 Not Found**: Appointment not found
- **500 Internal Server Error**: Unexpected server errors

### Complete API Documentation
For detailed information about all available endpoints, request/response formats, and interactive testing, visit the **Swagger UI** at:

🔗 **[http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)**

The Swagger documentation includes:
- All available endpoints with descriptions
- Request/response schemas
- Interactive API testing
- Error response examples
- Authentication requirements (if applicable)

## Project Structure

```
OOP_Project/
├── backend/                          # Spring Boot backend
│   ├── src/main/java/com/example/backend/
│   │   ├── controller/               # 11 REST API controllers
│   │   ├── service/                  # 12 Business logic services
│   │   ├── model/                    # 7 JPA entities + 2 enums
│   │   ├── repo/                     # 7 Spring Data JPA repositories
│   │   ├── event/                    # QueueChangedEvent
│   │   ├── exception/                # Custom exceptions
│   │   ├── config/                   # Swagger & SendGrid config
│   │   └── common/                   # DTOs, utilities, error responses
│   ├── src/main/resources/
│   │   └── application.properties    # Spring Boot configuration
│   ├── .env                          # Backend environment variables
│   └── pom.xml                       # Maven dependencies
│
├── frontend/                         # React 19 frontend
│   ├── src/
│   │   ├── pages/                    # 7 Role-based page components
│   │   ├── components/               # 6 Reusable shared components
│   │   ├── contexts/                 # AuthContext for global state
│   │   ├── lib/                      # API clients & Supabase config
│   │   ├── App.jsx                   # React Router setup
│   │   ├── main.jsx                  # Entry point
│   │   └── index.css                 # Global styles
│   ├── .env                          # Frontend environment variables
│   ├── package.json                  # npm dependencies
│   └── vite.config.js                # Vite configuration
│
├── PROJECTINFO.md                    # Detailed project documentation
└── README.md                         # This file
```

## Technology Stack

### Backend
- **Framework**: Spring Boot 3.5.6 with Java 21 LTS
- **ORM**: Hibernate 6+ with Spring Data JPA
- **Database**: PostgreSQL (Supabase-hosted, AWS Singapore)
- **Build Tool**: Maven with HikariCP connection pooling (max 5 connections)
- **API Documentation**: Swagger/OpenAPI 2.2.0
- **Email**: SendGrid API v4.10.2
- **PDF Generation**: iText7 v8.0.2
- **Real-time**: Server-Sent Events (SSE) with ConcurrentHashMap emitters
- **Events**: Spring ApplicationEventPublisher for event-driven architecture
- **JSON**: Jackson ObjectMapper
- **Async**: @EnableAsync configured

### Frontend
- **Framework**: React 19.1.1 with Vite 7.1.7 build tool
- **Routing**: React Router DOM v7.9.5 (BrowserRouter)
- **State Management**: React Context API (AuthContext)
- **HTTP Client**: Native Fetch API with centralized api.js
- **Authentication**: Supabase JWT tokens
- **Charts**: Recharts for admin dashboard visualization
- **UI**: CSS-in-JS per component
- **Deployment**: Docker + Nginx

## Architecture & Design Patterns

This project follows a **layered architecture pattern** with event-driven updates:

- **Frontend → Backend**: REST API via centralized HTTP client
- **Real-time Updates**: Server-Sent Events (SSE) for queue position tracking
- **Event-Driven**: QueueChangedEvent published by QueueService, listened by QueueSseService
- **Priority Queue Algorithm**: Emergency (3) > Elderly (2) > Normal (1)
- **Transaction Management**: @Transactional services ensure ACID compliance
- **Role-Based Access Control**: Frontend ProtectedRoute + Backend JWT validation

For detailed architecture, entity relationships, API design patterns, and more, refer to [PROJECTINFO.md](PROJECTINFO.md).

## Database Schema

The system uses **8 PostgreSQL tables** with JOINED inheritance for user hierarchy:
- `user` (base entity)
- `patient` (extends user)
- `staff` (extends user)
- `doctor`, `clinic`, `appointment`, `queue_log`

HikariCP manages the connection pool (max 5 connections, optimized for Supabase).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/appointments`)
3. Commit your changes (`git commit -am 'Add appointment features'`)
4. Push to the branch (`git push origin feature/appointments`)
5. Create a Pull Request
