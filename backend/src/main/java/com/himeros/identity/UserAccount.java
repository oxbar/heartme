package com.himeros.identity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="user_accounts")
public class UserAccount {
 public enum Role { USER, ADMIN } public enum Status { ACTIVE, SUSPENDED, DELETED }
 @Id private UUID id; @Column(nullable=false,unique=true,length=320) private String email; @Column(name="password_hash",nullable=false) private String passwordHash;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private Role role; @Enumerated(EnumType.STRING) @Column(nullable=false) private Status status;
 @Column(name="email_verified",nullable=false) private boolean emailVerified; @Column(name="created_at",nullable=false) private Instant createdAt; @Column(name="updated_at",nullable=false) private Instant updatedAt;
 protected UserAccount(){}
 public UserAccount(UUID id,String email,String passwordHash){this.id=id;this.email=email.toLowerCase();this.passwordHash=passwordHash;this.role=Role.USER;this.status=Status.ACTIVE;this.createdAt=Instant.now();this.updatedAt=this.createdAt;}
 public UUID getId(){return id;} public String getEmail(){return email;} public String getPasswordHash(){return passwordHash;} public Role getRole(){return role;} public Status getStatus(){return status;} public boolean isEmailVerified(){return emailVerified;}
}
