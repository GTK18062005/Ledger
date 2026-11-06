package com.ledgerline.repositories;

import com.ledgerline.models.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    @Query("SELECT l FROM LedgerEntry l JOIN FETCH l.transaction t JOIN FETCH t.initiatedBy u WHERE l.account.id = :accountId ORDER BY l.createdAt ASC, l.id ASC")
    List<LedgerEntry> findStatementEntriesByAccountId(@Param("accountId") UUID accountId);

    List<LedgerEntry> findByTransactionId(UUID transactionId);
}

