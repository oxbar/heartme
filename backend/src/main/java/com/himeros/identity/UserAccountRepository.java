package com.himeros.identity;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
interface UserAccountRepository extends JpaRepository<UserAccount,UUID>{ Optional<UserAccount> findByEmailIgnoreCase(String email); boolean existsByEmailIgnoreCase(String email); }
