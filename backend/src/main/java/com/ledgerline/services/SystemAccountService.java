package com.ledgerline.services;

import com.ledgerline.models.Account;
import com.ledgerline.models.Role;
import com.ledgerline.models.User;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class SystemAccountService {

    public static final String SYSTEM_FUNDING_ACCOUNT = "ACC-SYSTEM-FUNDING";
    public static final String SYSTEM_SETTLEMENT_ACCOUNT = "ACC-SYSTEM-SETTLEMENT";

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public SystemAccountService(AccountRepository accountRepository, UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Account getOrCreateFundingAccount() {
        return accountRepository.findByAccountNumber(SYSTEM_FUNDING_ACCOUNT)
                .orElseGet(() -> {
                    User systemUser = getOrCreateSystemUser();
                    Account funding = new Account(SYSTEM_FUNDING_ACCOUNT, systemUser, BigDecimal.ZERO, "INR", true);
                    return accountRepository.save(funding);
                });
    }

    @Transactional
    public Account getOrCreateSettlementAccount() {
        return accountRepository.findByAccountNumber(SYSTEM_SETTLEMENT_ACCOUNT)
                .orElseGet(() -> {
                    User systemUser = getOrCreateSystemUser();
                    Account settlement = new Account(SYSTEM_SETTLEMENT_ACCOUNT, systemUser, BigDecimal.ZERO, "INR", true);
                    return accountRepository.save(settlement);
                });
    }

    private User getOrCreateSystemUser() {
        return userRepository.findByEmail("system@ledgerline.io")
                .orElseGet(() -> {
                    User user = new User("system@ledgerline.io", "$2a$10$SystemInternalHashedPasswordPlaceHolder", Role.ADMIN);
                    return userRepository.save(user);
                });
    }
}

