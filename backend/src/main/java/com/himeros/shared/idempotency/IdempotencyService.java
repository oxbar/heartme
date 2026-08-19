package com.himeros.shared.idempotency;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdempotencyService {
 private final ProcessedEventRepository repo;
 public IdempotencyService(ProcessedEventRepository repo){this.repo=repo;}
 @Transactional
 public boolean executeOnce(UUID eventId,String consumer,Runnable action){
   String id=consumer+":"+eventId;
   if(repo.claim(id,eventId,consumer)==0) return false;
   action.run();
   return true;
 }
}
