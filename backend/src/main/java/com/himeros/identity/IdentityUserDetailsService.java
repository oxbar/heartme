package com.himeros.identity;

import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class IdentityUserDetailsService implements UserDetailsService {
 private final UserAccountRepository users;
 public IdentityUserDetailsService(UserAccountRepository users){this.users=users;}
 @Override public UserDetails loadUserByUsername(String email){
   UserAccount u=users.findByEmailIgnoreCase(email).orElseThrow(()->new UsernameNotFoundException("Not found"));
   return new User(u.getEmail(),u.getPasswordHash(),u.getStatus()==UserAccount.Status.ACTIVE,true,true,true,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole().name())));
 }
}
