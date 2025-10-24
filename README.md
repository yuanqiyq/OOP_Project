# OOP Project - Appointment Management System

A Spring Boot-based appointment management system that allows managing appointments for patients, doctors, and clinics with advanced features like double booking prevention.

## Features

- **Appointment Management**: Create, update, delete, and retrieve appointments

## Environment Variables

Before running the application, you need to set up the following environment variables:

### Required Environment Variables

```bash
# Database Configuration
DB_URL=jdbc:postgresql://localhost:5432/your_database_name
DB_USERNAME=your_database_username
DB_PASSWORD=your_database_password
```

### Setting Environment Variables

**Option 1: Create a `.env` file** (Recommended)
Create a `.env` file in the `backend` directory:
```properties
DB_URL=jdbc:postgresql://localhost:5432/your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

**Option 2: Export in Terminal**
```bash
export DB_URL="jdbc:postgresql://localhost:5432/your_database_name"
export DB_USERNAME="your_username"
export DB_PASSWORD="your_password"
```

**Option 3: Set in IDE**
Configure environment variables in your IDE's run configuration.

## Getting Started

### Prerequisites

- Java 21 or higher
- PostgreSQL database
- Maven (or use the included Maven wrapper)

### Running the Application

1. **Clone the repository**
   ```bash
   git clone https://github.com/yuanqiyq/OOP_Project.git
   cd OOP_Project/backend
   ```

2. **Set up environment variables** (see Environment Variables section above)

3. **Run the application**
   ```bash
   ./mvnw spring-boot:run
   ```

4. **Access the application**
   - API Base URL: `http://localhost:8080`
   - Swagger UI: `http://localhost:8080/swagger-ui.html`

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
backend/
├── src/main/java/com/example/backend/
│   ├── controller/          # REST API controllers
│   ├── service/            # Business logic layer
│   ├── model/              # JPA entities
│   │   └── appointments/   # Appointment-related models
│   ├── repo/               # Data access layer
│   ├── dto/                # Data transfer objects
│   ├── exception/          # Custom exceptions
│   └── common/             # Common utilities and config
├── src/main/resources/
│   └── application.properties
└── pom.xml
```

## Technology Stack

- **Backend Framework**: Spring Boot 3.5.6
- **Database**: PostgreSQL
- **ORM**: JPA/Hibernate
- **Build Tool**: Maven
- **API Documentation**: Swagger/OpenAPI 3
- **Java Version**: 21

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/appointments`)
3. Commit your changes (`git commit -am 'Add appointment features'`)
4. Push to the branch (`git push origin feature/appointments`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.