package com.himeros.media;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

interface PhotoRepository extends JpaRepository<Photo, UUID> {
    List<Photo> findAllByUserIdOrderByPositionAsc(UUID userId);
    List<Photo> findAllByUserIdIn(Collection<UUID> userIds);
    long countByUserId(UUID userId);
}
