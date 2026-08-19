package com.himeros.identity;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="refresh_tokens")
class RefreshToken {
 @Id private UUID id; @Column(name="user_id",nullable=false) private UUID userId; @Column(name="token_hash",nullable=false,unique=true,length=64) private String tokenHash; @Column(name="expires_at",nullable=false) private Instant expiresAt; @Column(name="revoked_at") private Instant revokedAt; @Column(name="replaced_by_hash",length=64) private String replacedByHash; @Column(name="device_info",length=500) private String deviceInfo; @Column(name="created_at",nullable=false) private Instant createdAt;
 protected RefreshToken(){} RefreshToken(UUID id,UUID userId,String hash,Instant expiresAt,String device){this.id=id;this.userId=userId;this.tokenHash=hash;this.expiresAt=expiresAt;this.deviceInfo=device;this.createdAt=Instant.now();}
 UUID userId(){return userId;} String hash(){return tokenHash;} boolean usable(){return revokedAt==null&&expiresAt.isAfter(Instant.now());} boolean rotated(){return replacedByHash!=null;} void rotateTo(String replacement){this.revokedAt=Instant.now();this.replacedByHash=replacement;} void revoke(){this.revokedAt=Instant.now();}
}
