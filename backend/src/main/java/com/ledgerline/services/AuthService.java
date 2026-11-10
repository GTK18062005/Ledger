package com.ledgerline.services;

import com.ledgerline.config.JwtTokenProvider;
import com.ledgerline.dto.AuthRequest;
import com.ledgerline.dto.AuthResponse;
import com.ledgerline.dto.RegisterRequest;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.models.Account;
import com.ledgerline.models.Role;
import com.ledgerline.models.User;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository,
                       AccountRepository accountRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            auditService.recordAudit(user.getId(), user.getRole().name(), "LOGIN_FAILURE", user.getEmail(), "UNAUTHORIZED", "Password mismatch");
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        auditService.recordAudit(user.getId(), user.getRole().name(), "LOGIN_SUCCESS", user.getEmail(), "SUCCESS", "User authenticated successfully");

        List<Account> accounts = accountRepository.findByOwner(user);
        UUID primaryId = accounts.isEmpty() ? null : accounts.get(0).getId();
        String primaryNum = accounts.isEmpty() ? null : accounts.get(0).getAccountNumber();

        return new AuthResponse(token, user.getId(), user.getEmail(), user.getRole(), primaryId, primaryNum);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.findByEmail(cleanEmail).isPresent()) {
            throw new InvalidTransactionException("An account with email " + cleanEmail + " is already registered.");
        }

        // 1. Create and persist User
        User user = new User(cleanEmail, passwordEncoder.encode(request.getPassword()), Role.ACCOUNT_HOLDER);
        user = userRepository.save(user);

        // 2. Automatically onboard primary Account
        String currency = (request.getInitialCurrency() != null && !request.getInitialCurrency().isBlank())
                ? request.getInitialCurrency().trim().toUpperCase()
                : "INR";

        String randomSuffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String accountNumber = "ACC-USR-" + randomSuffix;

        Account account = new Account(accountNumber, user, BigDecimal.ZERO, currency);
        account = accountRepository.save(account);

        // 3. Issue Token & Audit
        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
        auditService.recordAudit(user.getId(), user.getRole().name(), "USER_REGISTERED", user.getEmail(), "SUCCESS",
                "New user registered and provisioned primary account: " + accountNumber + " (" + currency + ")");

        return new AuthResponse(token, user.getId(), user.getEmail(), user.getRole(), account.getId(), account.getAccountNumber());
    }
}
