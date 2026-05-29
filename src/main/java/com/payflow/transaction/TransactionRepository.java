package com.payflow.transaction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    /** All transactions where wallet is either sender or receiver. */
    @Query("""
           select t from Transaction t
           where t.senderWallet.id = :walletId
              or t.receiverWallet.id = :walletId
           order by t.createdAt desc
           """)
    Page<Transaction> findByWalletId(@Param("walletId") Long walletId, Pageable pageable);
}
