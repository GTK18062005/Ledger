package com.ledgerline.repositories;

import com.ledgerline.models.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    @Query("SELECT t FROM Transaction t JOIN FETCH t.initiatedBy u ORDER BY t.createdAt DESC")
    List<Transaction> findAllWithUserOrderByCreatedAtDesc();

    List<Transaction> findByIdempotencyKeyStartingWithOrderByCreatedAtDesc(String prefix);
}

