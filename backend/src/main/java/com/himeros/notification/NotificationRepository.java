package com.himeros.notification;

import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

interface NotificationRepository extends JpaRepository<Notification,UUID> {
    @Query("select n from Notification n where n.userId=:u order by n.createdAt desc")
    List<Notification> list(@Param("u") UUID u,Pageable pageable);
}
