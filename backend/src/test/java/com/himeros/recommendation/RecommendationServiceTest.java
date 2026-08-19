package com.himeros.recommendation;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.himeros.interaction.InteractionQuery;
import com.himeros.profile.*;
import com.himeros.trustsafety.TrustSafetyQuery;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;

class RecommendationServiceTest {
 @Test void excludesAlreadySeenUsers(){
   ProfileQuery profiles=mock(ProfileQuery.class); InteractionQuery interactions=mock(InteractionQuery.class); TrustSafetyQuery safety=mock(TrustSafetyQuery.class); UUID me=UUID.randomUUID(), seen=UUID.randomUUID(), fresh=UUID.randomUUID();
   var pMe=p(me,"Me",Gender.MAN,Set.of(Gender.WOMAN),Set.of("java")); var pSeen=p(seen,"Seen",Gender.WOMAN,Set.of(Gender.MAN),Set.of("java")); var pFresh=p(fresh,"Fresh",Gender.WOMAN,Set.of(Gender.MAN),Set.of("java"));
   when(profiles.find(me)).thenReturn(Optional.of(pMe)); when(profiles.candidatePool(eq(me),anyInt())).thenReturn(List.of(pSeen,pFresh)); when(interactions.seenBy(me)).thenReturn(Set.of(seen)); when(safety.excluded(me)).thenReturn(Set.of());
   var result=new RecommendationService(profiles,interactions,safety).discover(me,20); assertEquals(1,result.size()); assertEquals(fresh,result.getFirst().profile().userId());
 }
 private static ProfileQuery.ProfileView p(UUID id,String name,Gender gender,Set<Gender> looking,Set<String> interests){return new ProfileQuery.ProfileView(id,name,null,LocalDate.now().minusYears(30),gender,"Blumenau","SC","BR",-26.9,-49.0,18,60,100,true,interests,looking);}
}
