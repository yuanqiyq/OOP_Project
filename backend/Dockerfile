# Multi-stage build for Spring Boot Maven application

# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-21-alpine AS build

# Set working directory
WORKDIR /app

# Copy Maven wrapper and pom.xml first for dependency caching
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies (this layer will be cached if pom.xml doesn't change)
RUN ./mvnw dependency:go-offline -B

# Copy the source code
COPY src ./src

# Build the application (skip tests for faster builds)
RUN ./mvnw clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create a non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring

# Set working directory
WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Change ownership to non-root user
RUN chown spring:spring app.jar

# Switch to non-root user
USER spring:spring

# Expose the application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
