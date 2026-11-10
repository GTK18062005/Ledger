package com.ledgerline.services;

import com.ledgerline.config.JwtTokenProvider;
import com.ledgerline.dto.AuthResponse;
import com.ledgerline.dto.BootstrapAdminRequest;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.Role;
import com.ledgerline.models.User;
import com.ledgerline.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminBootstrapService {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditService auditService;

    @Value("${admin.bootstrap.secret:${ADMIN_BOOTSTRAP_SECRET:}}")
    private String configuredBootstrapSecret;

    public AdminBootstrapService(UserRepository userRepository,
                                 PasswordEncoder passwordEncoder,
                                 JwtTokenProvider jwtTokenProvider,
                                 AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditService = auditService;
    }

    @Transactional
    public AuthResponse bootstrapAdmin(BootstrapAdminRequest request) {
        long existingAdminCount = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN)
                .count();

        // If an admin already exists, bootstrap is strictly locked unless the master bootstrap secret matches
        if (existingAdminCount > 0) {
            if (configuredBootstrapSecret == null || configuredBootstrapSecret.isBlank() ||
                    !configuredBootstrapSecret.equals(request.getBootstrapSecret())) {
                log.warn("Blocked attempt to bootstrap admin: System already has {} administrator(s).", existingAdminCount);
                throw new UnauthorizedAccessException("Administrator bootstrap is locked: an administrator already exists.");
            }
        } else {
            // No admin exists yet: if an environment secret is configured, require it
            if (configuredBootstrapSecret != null && !configuredBootstrapSecret.isBlank()) {
                if (!configuredBootstrapSecret.equals(request.getBootstrapSecret())) {
                    throw new UnauthorizedAccessException("Invalid bootstrap secret provided.");
                }
            }
        }

        String cleanEmail = request.getEmail().trim().toLowerCase();
        User adminUser = userRepository.findByEmail(cleanEmail).orElseGet(() -> new User(cleanEmail, "", Role.ADMIN));
        adminUser.setEmail(cleanEmail);
        adminUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        adminUser.setRole(Role.ADMIN);
        adminUser = userRepository.save(adminUser);

        auditService.recordAudit(
                adminUser.getId(),
                "ADMIN",
                "ADMIN_BOOTSTRAP",
                adminUser.getEmail(),
                "SUCCESS",
                "System administrator successfully bootstrapped into production."
        );

        log.info("Successfully bootstrapped administrator: {}", adminUser.getEmail());

        String token = jwtTokenProvider.generateToken(adminUser.getId(), adminUser.getEmail(), adminUser.getRole());
        return new AuthResponse(token, adminUser.getId(), adminUser.getEmail(), adminUser.getRole());
    }
}

