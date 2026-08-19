package com.himeros.profile;
import java.util.*; import org.springframework.data.domain.*; import org.springframework.data.jpa.repository.JpaRepository;
interface ProfileRepository extends JpaRepository<Profile,UUID>{ Page<Profile> findByDiscoverableTrueAndUserIdNot(UUID userId,Pageable pageable); }
