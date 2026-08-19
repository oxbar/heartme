package com.himeros.profile;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.himeros.identity.IdentityLookup;
import com.himeros.shared.outbox.OutboxService;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;

class ProfileServiceTest {
 @Test void rejectsUnderageProfile(){
   ProfileRepository repo=mock(ProfileRepository.class); IdentityLookup identity=mock(IdentityLookup.class); OutboxService outbox=mock(OutboxService.class);
   when(identity.exists(any())).thenReturn(true); ProfileService service=new ProfileService(repo,identity,outbox);
   var cmd=new ProfileService.UpsertCommand("Minor",null,LocalDate.now().minusYears(17),Gender.OTHER,null,null,null,null,null,null,18,99,100,false,false,true,false,false,Set.of(),Set.of(Gender.OTHER),Set.of());
   assertThrows(IllegalArgumentException.class,()->service.upsert(UUID.randomUUID(),cmd));
 }
}
