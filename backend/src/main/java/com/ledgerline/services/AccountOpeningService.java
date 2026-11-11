package com.ledgerline.services;

import com.ledgerline.dto.AccountOpeningResponse;
import com.ledgerline.dto.CreateAccountOpeningDto;
import com.ledgerline.dto.ReviewDepositApprovalDto;
import com.ledgerline.exceptions.AccountNotFoundException;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.*;
import com.ledgerline.repositories.AccountOpeningRequestRepository;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AccountOpeningService {

    private final AccountOpeningRequestRepository requestRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public AccountOpeningService(
            AccountOpeningRequestRepository requestRepository,
            AccountRepository accountRepository,
            UserRepository userRepository,
            AuditService auditService) {
        this.requestRepository = requestRepository;
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    public AccountOpeningResponse createRequest(UUID userId, CreateAccountOpeningDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AccountNotFoundException("User not found: " + userId));

        String cleanType = dto.getAccountType() != null
                ? dto.getAccountType().trim().toUpperCase().replaceAll("\\s+", "_")
                : "PERSONAL";

        if (requestRepository.existsByUserIdAndAccountTypeIgnoreCaseAndStatus(userId, cleanType, DepositApprovalStatus.PENDING)) {
            throw new InvalidTransactionException("A pending account request already exists for " + cleanType.replace("_", " "));
        }

        String cleanCurrency = (dto.getCurrency() != null && !dto.getCurrency().isBlank())
                ? dto.getCurrency().trim().toUpperCase()
                : ("INTERNATIONAL_CURRENCY".equals(cleanType) ? "USD" : "INR");

        String reason = (dto.getReason() != null && !dto.getReason().isBlank())
                ? dto.getReason().trim()
                : "New " + cleanType.replace("_", " ") + " vault onboarding request";

        AccountOpeningRequest req = new AccountOpeningRequest(user, cleanType, cleanCurrency, reason);
        AccountOpeningRequest saved = requestRepository.save(req);

        auditService.recordAudit(
                userId,
                user.getRole().name(),
                "ACCOUNT_OPENING_REQUESTED",
                saved.getId().toString(),
                "PENDING",
                "Submitted " + cleanType + " (" + cleanCurrency + ") account request."
        );

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AccountOpeningResponse> getUserRequests(UUID userId) {
        return requestRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AccountOpeningResponse> getAllRequests(DepositApprovalStatus status) {
        List<AccountOpeningRequest> list = (status != null)
                ? requestRepository.findByStatusOrderByCreatedAtDesc(status)
                : requestRepository.findAllByOrderByCreatedAtDesc();
        return list.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AccountOpeningResponse approveRequest(UUID requestId, UUID adminId, ReviewDepositApprovalDto reviewDto) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedAccessException("Administrator user not found."));
        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedAccessException("Access denied: Only administrators may approve account requests.");
        }

        AccountOpeningRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new InvalidTransactionException("Account request not found: " + requestId));

        if (req.getStatus() != DepositApprovalStatus.PENDING) {
            throw new InvalidTransactionException("Account request has already been processed with status: " + req.getStatus());
        }

        String prefix = resolvePrefix(req.getAccountType(), req.getCurrency());
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String accountNumber = prefix + "-" + suffix;

        while (accountRepository.existsByAccountNumber(accountNumber)) {
            suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            accountNumber = prefix + "-" + suffix;
        }

        Account newAccount = new Account(accountNumber, req.getUser(), BigDecimal.ZERO, req.getCurrency());
        Account savedAccount = accountRepository.save(newAccount);

        req.setStatus(DepositApprovalStatus.APPROVED);
        req.setReviewedBy(admin);
        req.setCreatedAccount(savedAccount);
        req.setAdminNotes(reviewDto != null && reviewDto.getAdminNotes() != null && !reviewDto.getAdminNotes().isBlank()
                ? reviewDto.getAdminNotes().trim()
                : "Approved and provisioned vault " + accountNumber);

        AccountOpeningRequest updated = requestRepository.save(req);

        auditService.recordAudit(
                adminId,
                Role.ADMIN.name(),
                "ACCOUNT_OPENING_APPROVED",
                savedAccount.getAccountNumber(),
                "SUCCESS",
                "Approved " + req.getAccountType() + " request for " + req.getUser().getEmail() + ". Provisioned " + accountNumber
        );

        return mapToResponse(updated);
    }

    @Transactional
    public AccountOpeningResponse rejectRequest(UUID requestId, UUID adminId, ReviewDepositApprovalDto reviewDto) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedAccessException("Administrator user not found."));
        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedAccessException("Access denied: Only administrators may reject account requests.");
        }

        AccountOpeningRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new InvalidTransactionException("Account request not found: " + requestId));

        if (req.getStatus() != DepositApprovalStatus.PENDING) {
            throw new InvalidTransactionException("Account request has already been processed with status: " + req.getStatus());
        }

        req.setStatus(DepositApprovalStatus.REJECTED);
        req.setReviewedBy(admin);
        req.setAdminNotes(reviewDto != null && reviewDto.getAdminNotes() != null && !reviewDto.getAdminNotes().isBlank()
                ? reviewDto.getAdminNotes().trim()
                : "Declined by treasury administration during onboarding compliance check.");

        AccountOpeningRequest updated = requestRepository.save(req);

        auditService.recordAudit(
                adminId,
                Role.ADMIN.name(),
                "ACCOUNT_OPENING_REJECTED",
                req.getId().toString(),
                "REFUSED",
                "Rejected " + req.getAccountType() + " request for " + req.getUser().getEmail() + ". Reason: " + req.getAdminNotes()
        );

        return mapToResponse(updated);
    }

    private String resolvePrefix(String accountType, String currency) {
        if (accountType == null) return "ACC-USR";
        if (accountType.contains("BUSINESS")) return "ACC-BIZ";
        if (accountType.contains("TREASURY")) return "ACC-TRS";
        if ("USD".equalsIgnoreCase(currency) || accountType.contains("INTERNATIONAL")) return "ACC-FX";
        return "ACC-PER";
    }

    private AccountOpeningResponse mapToResponse(AccountOpeningRequest req) {
        return new AccountOpeningResponse(
                req.getId(),
                req.getUser().getId(),
                req.getUser().getEmail(),
                req.getUser().getFullName(),
                req.getAccountType(),
                req.getCurrency(),
                req.getReason(),
                req.getStatus().name(),
                req.getReviewedBy() != null ? req.getReviewedBy().getEmail() : null,
                req.getAdminNotes(),
                req.getCreatedAccount() != null ? req.getCreatedAccount().getId() : null,
                req.getCreatedAccount() != null ? req.getCreatedAccount().getAccountNumber() : null,
                req.getCreatedAt(),
                req.getUpdatedAt()
        );
    }
}

