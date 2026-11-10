package com.ledgerline.config;

import com.ledgerline.models.*;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.LedgerEntryRepository;
import com.ledgerline.repositories.TransactionRepository;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.SystemAccountService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
@Profile({"dev", "test", "supabase"})
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final PasswordEncoder passwordEncoder;
    private final SystemAccountService systemAccountService;

    public DataSeeder(
            UserRepository userRepository,
            AccountRepository accountRepository,
            TransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository,
            PasswordEncoder passwordEncoder,
            SystemAccountService systemAccountService) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.passwordEncoder = passwordEncoder;
        this.systemAccountService = systemAccountService;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded. Skipping initial seeding.");
            return;
        }

        log.info("Seeding LedgerLine demo users, accounts, and balanced double-entry ledgers...");

        String defaultPass = passwordEncoder.encode("Password123!");

        // 1. Admin
        User adminUser = new User("admin@ledgerline.io", defaultPass, Role.ADMIN);
        adminUser.setFullName("System Administrator");
        User admin = userRepository.save(adminUser);

        // 2. Account Holder 1 (Alice)
        User aliceUser = new User("alice@ledgerline.io", defaultPass, Role.ACCOUNT_HOLDER);
        aliceUser.setFullName("Alice Vance");
        User alice = userRepository.save(aliceUser);

        // 3. Account Holder 2 (Bob)
        User bobUser = new User("bob@ledgerline.io", defaultPass, Role.ACCOUNT_HOLDER);
        bobUser.setFullName("Bob Smith");
        User bob = userRepository.save(bobUser);

        // 4. Auditor
        User auditorUser = new User("auditor@ledgerline.io", defaultPass, Role.AUDITOR);
        auditorUser.setFullName("Compliance Auditor");
        User auditor = userRepository.save(auditorUser);

        // 5. System Funding & Settlement Accounts
        Account fundingAcc = systemAccountService.getOrCreateFundingAccount();
        systemAccountService.getOrCreateSettlementAccount();

        // Seed Alice's Account with double-entry funding from SYSTEM_FUNDING
        BigDecimal aliceInitial = new BigDecimal("10000.00");
        Account aliceAcc = accountRepository.save(new Account("ACC-ALICE-1001", alice, BigDecimal.ZERO, "INR"));

        fundingAcc.setBalance(fundingAcc.getBalance().subtract(aliceInitial));
        aliceAcc.setBalance(aliceInitial);
        accountRepository.save(fundingAcc);
        accountRepository.save(aliceAcc);

        Transaction aliceInitTx = transactionRepository.save(new Transaction(
                TransactionType.DEPOSIT,
                "INITIAL-SEED-ALICE",
                admin,
                TransactionStatus.COMPLETED,
                null,
                aliceInitial
        ));
        ledgerEntryRepository.save(new LedgerEntry(
                aliceInitTx,
                fundingAcc,
                EntryType.DEBIT,
                aliceInitial,
                fundingAcc.getBalance()
        ));
        ledgerEntryRepository.save(new LedgerEntry(
                aliceInitTx,
                aliceAcc,
                EntryType.CREDIT,
                aliceInitial,
                aliceAcc.getBalance()
        ));

        // Seed Bob's Account with double-entry funding from SYSTEM_FUNDING
        BigDecimal bobInitial = new BigDecimal("5000.00");
        Account bobAcc = accountRepository.save(new Account("ACC-BOB-2002", bob, BigDecimal.ZERO, "INR"));

        fundingAcc.setBalance(fundingAcc.getBalance().subtract(bobInitial));
        bobAcc.setBalance(bobInitial);
        accountRepository.save(fundingAcc);
        accountRepository.save(bobAcc);

        Transaction bobInitTx = transactionRepository.save(new Transaction(
                TransactionType.DEPOSIT,
                "INITIAL-SEED-BOB",
                admin,
                TransactionStatus.COMPLETED,
                null,
                bobInitial
        ));
        ledgerEntryRepository.save(new LedgerEntry(
                bobInitTx,
                fundingAcc,
                EntryType.DEBIT,
                bobInitial,
                fundingAcc.getBalance()
        ));
        ledgerEntryRepository.save(new LedgerEntry(
                bobInitTx,
                bobAcc,
                EntryType.CREDIT,
                bobInitial,
                bobAcc.getBalance()
        ));

        log.info("LedgerLine data seeding completed with zero-sum balanced double-entry entries.");
    }
}
