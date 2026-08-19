package com.himeros.trustsafety;

import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface ReportRepository extends JpaRepository<Report, UUID> {
    @Query("select r.reported from Report r where r.reporter=:u") Set<UUID> reportedBy(@Param("u") UUID userId);
    @Query("select r.reporter from Report r where r.reported=:u") Set<UUID> reportedMe(@Param("u") UUID userId);
    @Query("select r from Report r where r.reporter=:u order by r.created desc") List<Report> recordsBy(@Param("u") UUID userId, Pageable pageable);
}
