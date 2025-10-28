package com.example.backend.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    
    @Autowired
    private DataSource dataSource;
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now());
        response.put("service", "Backend API");
        response.put("version", "1.0.0");
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/database")
    public ResponseEntity<Map<String, Object>> databaseHealthCheck() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Test database connection using DataSource
            try (var connection = dataSource.getConnection()) {
                boolean isConnected = connection.isValid(5);
                String connectionStatus = isConnected ? "Active and valid" : "Invalid";
                
                response.put("status", isConnected ? "UP" : "DOWN");
                response.put("timestamp", LocalDateTime.now());
                response.put("database_connection", connectionStatus);
                response.put("connection_valid", isConnected);
                
                if (isConnected) {
                    return ResponseEntity.ok(response);
                } else {
                    return ResponseEntity.status(503).body(response);
                }
            }
        } catch (Exception e) {
            response.put("status", "DOWN");
            response.put("timestamp", LocalDateTime.now());
            response.put("error", e.getMessage());
            response.put("database_connection", "Error");
            response.put("connection_valid", false);
            
            return ResponseEntity.status(503).body(response);
        }
    }
    
    @GetMapping("/database/test")
    public ResponseEntity<Map<String, Object>> testDatabaseQuery() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Test a simple query using DataSource
            try (var connection = dataSource.getConnection();
                 var statement = connection.createStatement();
                 var resultSet = statement.executeQuery("SELECT 1 as test_value, NOW() as current_time")) {
                
                if (resultSet.next()) {
                    response.put("status", "UP");
                    response.put("timestamp", LocalDateTime.now());
                    response.put("test_query_result", resultSet.getInt("test_value"));
                    response.put("database_time", resultSet.getTimestamp("current_time"));
                    response.put("message", "Database query successful");
                    
                    return ResponseEntity.ok(response);
                } else {
                    response.put("status", "DOWN");
                    response.put("error", "No results from test query");
                    return ResponseEntity.status(503).body(response);
                }
            }
        } catch (Exception e) {
            response.put("status", "DOWN");
            response.put("timestamp", LocalDateTime.now());
            response.put("error", e.getMessage());
            response.put("message", "Database query failed");
            
            return ResponseEntity.status(503).body(response);
        }
    }
}
