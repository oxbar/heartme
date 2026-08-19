package com.himeros.shared.outbox;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

interface OutboxRepository extends JpaRepository<OutboxEvent, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from OutboxEvent e where e.status = :status order by e.occurredAt asc")
    List<OutboxEvent> lockPending(@Param("status") OutboxEvent.Status status, Pageable pageable);
}
