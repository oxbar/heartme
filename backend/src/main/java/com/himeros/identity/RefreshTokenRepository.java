package com.himeros.identity;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
interface RefreshTokenRepository extends JpaRepository<RefreshToken,UUID>{ Optional<RefreshToken> findByTokenHash(String tokenHash); List<RefreshToken> findAllByUserIdAndRevokedAtIsNull(UUID userId); }
