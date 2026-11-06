package com.ledgerline.services;

import com.ledgerline.config.JwtTokenProvider;
import com.ledgerline.dto.AuthRequest;
import com.ledgerline.dto.AuthResponse;
import com.ledgerline.models.User;
import com.ledgerline.repositories.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider, AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            auditService.recordAudit(user.getId(), user.getRole().name(), "LOGIN_FAILURE", user.getEmail(), "UNAUTHORIZED", "Password mismatch");
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        auditService.recordAudit(user.getId(), user.getRole().name(), "LOGIN_SUCCESS", user.getEmail(), "SUCCESS", "User authenticated successfully");

        return new AuthResponse(token, user.getId(), user.getEmail(), user.getRole());
    }
}

