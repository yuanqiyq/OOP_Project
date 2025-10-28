package com.example.backend.service;

import com.example.backend.model.User;
import com.example.backend.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    
    // Get all users
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    // Get user by ID
    public Optional<User> getUserById(Long userId) {
        return userRepository.findById(userId);
    }
    
    // Get user by user ID (alternative method)
    public Optional<User> getUserByUserId(Long userId) {
        return Optional.ofNullable(userRepository.findByUserId(userId));
    }
    
    // Get user by email
    public Optional<User> getUserByEmail(String email) {
        return Optional.ofNullable(userRepository.findByEmail(email));
    }
    
    // Create a new user
    public User createUser(User user) {
        return userRepository.save(user);
    }
    
    // Update user
    public User updateUser(User user) {
        return userRepository.save(user);
    }
    
    // Update user details by ID
    public Optional<User> updateUserDetails(Long userId, User updatedUser) {
        return userRepository.findById(userId)
                .map(existingUser -> {
                    // Update only the editable fields
                    if (updatedUser.getEmail() != null) {
                        existingUser.setEmail(updatedUser.getEmail());
                    }
                    if (updatedUser.getFname() != null) {
                        existingUser.setFname(updatedUser.getFname());
                    }
                    if (updatedUser.getLname() != null) {
                        existingUser.setLname(updatedUser.getLname());
                    }
                    if (updatedUser.getRole() != null) {
                        existingUser.setRole(updatedUser.getRole());
                    }
                    // Note: authUuid and createdAt are not updated as they should remain unchanged
                    return userRepository.save(existingUser);
                });
    }
    
    // Delete user by ID
    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }
    
    // Check if user exists by email
    public boolean userExistsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
    
    // Check if user exists by user ID
    public boolean userExistsByUserId(Long userId) {
        return userRepository.existsByUserId(userId);
    }
}
