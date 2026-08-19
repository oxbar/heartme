package com.himeros.premium;
import java.time.Instant;import java.util.*;import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;
interface SubscriptionRepository extends JpaRepository<Subscription,UUID>{
 @Query("select s from Subscription s where s.userId=:u and s.status=:status and s.endsAt>:now order by s.endsAt desc")
 List<Subscription> active(@Param("u")UUID u,@Param("status")Subscription.Status status,@Param("now")Instant now);
}
