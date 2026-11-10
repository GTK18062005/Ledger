package com.ledgerline.controllers;

import com.ledgerline.dto.AuthResponse;
import com.ledgerline.dto.BootstrapAdminRequest;
import com.ledgerline.models.User;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.AdminBootstrapService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminBootstrapService adminBootstrapService;
    private final UserRepository userRepository;

    public AdminController(AdminBootstrapService adminBootstrapService, UserRepository userRepository) {
        this.adminBootstrapService = adminBootstrapService;
        this.userRepository = userRepository;
    }

    @PostMapping("/bootstrap")
    public ResponseEntity<AuthResponse> bootstrapAdmin(@Valid @RequestBody BootstrapAdminRequest request) {
        AuthResponse response = adminBootstrapService.bootstrapAdmin(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "email", u.getEmail(),
                        "role", u.getRole().name(),
                        "createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }
}
