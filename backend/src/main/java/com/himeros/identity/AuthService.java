package com.himeros.identity;

import com.himeros.shared.*; import com.himeros.shared.outbox.OutboxService;
import java.nio.charset.StandardCharsets; import java.security.MessageDigest; import java.security.SecureRandom; import java.time.*; import java.util.*;
import org.springframework.security.authentication.*; import org.springframework.security.core.AuthenticationException; import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm; import org.springframework.security.oauth2.jwt.*; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService implements IdentityLookup {
 private final UserAccountRepository users; private final RefreshTokenRepository refresh; private final PasswordEncoder encoder; private final AuthenticationManager authManager; private final JwtEncoder jwtEncoder; private final SecurityProperties props; private final OutboxService outbox; private final SecureRandom random=new SecureRandom();
 public AuthService(UserAccountRepository users,RefreshTokenRepository refresh,PasswordEncoder encoder,AuthenticationManager authManager,JwtEncoder jwtEncoder,SecurityProperties props,OutboxService outbox){this.users=users;this.refresh=refresh;this.encoder=encoder;this.authManager=authManager;this.jwtEncoder=jwtEncoder;this.props=props;this.outbox=outbox;}

 @Transactional public UserView register(String email,String password){
   String normalized=email.trim().toLowerCase(); if(users.existsByEmailIgnoreCase(normalized)) throw new ConflictException("Email already registered");
   UserAccount u=users.save(new UserAccount(UUID.randomUUID(),normalized,encoder.encode(password)));
   outbox.append("User",u.getId(),"himeros.identity.user-registered.v1","himeros.identity.events.v1",u.getId(),Map.of("userId",u.getId(),"email",u.getEmail())); return view(u);
 }

 @Transactional public TokenPair login(String email,String password,String device){
   try { authManager.authenticate(new UsernamePasswordAuthenticationToken(email.toLowerCase(),password)); }
   catch(AuthenticationException ex){ throw new IllegalArgumentException("Invalid credentials"); }
   UserAccount u=users.findByEmailIgnoreCase(email).orElseThrow(); return issue(u,device,null);
 }

 @Transactional public TokenPair rotate(String raw,String device){
   String oldHash=hash(raw); RefreshToken token=refresh.findByTokenHash(oldHash).orElseThrow(()->new IllegalArgumentException("Invalid refresh token"));
   if(!token.usable()){ if(token.rotated()) refresh.findAllByUserIdAndRevokedAtIsNull(token.userId()).forEach(RefreshToken::revoke); throw new IllegalArgumentException("Refresh token expired, revoked or reused"); }
   UserAccount u=users.findById(token.userId()).orElseThrow(()->new ResourceNotFoundException("User not found"));
   return issue(u,device,token);
 }

 @Transactional public void logout(String raw){ refresh.findByTokenHash(hash(raw)).ifPresent(RefreshToken::revoke); }
 @Transactional public void logoutAll(UUID userId){ refresh.findAllByUserIdAndRevokedAtIsNull(userId).forEach(RefreshToken::revoke); }

 private TokenPair issue(UserAccount u,String device,RefreshToken rotated){
   Instant now=Instant.now(), exp=now.plus(Duration.ofMinutes(props.accessTokenMinutes()));
   JwtClaimsSet claims=JwtClaimsSet.builder().issuer("himeros").issuedAt(now).expiresAt(exp).subject(u.getId().toString()).claim("roles",List.of("ROLE_"+u.getRole().name())).build();
   String access=jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
   String raw=randomToken(), newHash=hash(raw); refresh.save(new RefreshToken(UUID.randomUUID(),u.getId(),newHash,now.plus(Duration.ofDays(props.refreshTokenDays())),device)); if(rotated!=null) rotated.rotateTo(newHash);
   return new TokenPair(access,raw,"Bearer",exp,props.refreshTokenDays()*86400);
 }
 private String randomToken(){byte[] b=new byte[48];random.nextBytes(b);return Base64.getUrlEncoder().withoutPadding().encodeToString(b);} private String hash(String raw){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 @Override public boolean exists(UUID userId){return users.existsById(userId);} private static UserView view(UserAccount u){return new UserView(u.getId(),u.getEmail(),u.getRole().name(),u.isEmailVerified());}
 public record UserView(UUID id,String email,String role,boolean emailVerified){} public record TokenPair(String accessToken,String refreshToken,String tokenType,Instant accessExpiresAt,long refreshExpiresInSeconds){}
}
