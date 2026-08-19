package com.himeros.profile;
import com.himeros.identity.IdentityLookup; import com.himeros.shared.ResourceNotFoundException; import com.himeros.shared.outbox.OutboxService; import java.time.*; import java.util.*; import org.springframework.data.domain.*; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
@Service
public class ProfileService implements ProfileQuery {
 private final ProfileRepository repo; private final IdentityLookup identity; private final OutboxService outbox;
 public ProfileService(ProfileRepository repo,IdentityLookup identity,OutboxService outbox){this.repo=repo;this.identity=identity;this.outbox=outbox;}
 @Transactional public ProfileView upsert(UUID userId,UpsertCommand c){
   if(!identity.exists(userId)) throw new ResourceNotFoundException("User not found"); validateAge(c.birthDate());
   Profile p=repo.findById(userId).orElseGet(()->new Profile(userId,c.displayName(),c.birthDate(),c.gender()));
   p.update(c.displayName(),c.bio(),c.birthDate(),c.gender(),c.city(),c.state(),c.country(),c.latitude(),c.longitude(),c.minAge(),c.maxAge(),c.maxDistanceKm(),c.discoverable(),c.interests(),c.lookingFor()); repo.save(p);
   outbox.append("Profile",userId,"himeros.profile.updated.v1","himeros.profile.events.v1",userId,Map.of("userId",userId,"displayName",p.getDisplayName())); return view(p);
 }
 @Override @Transactional(readOnly=true) public Optional<ProfileView> find(UUID id){return repo.findById(id).map(ProfileService::view);}
 @Override @Transactional(readOnly=true) public List<ProfileView> candidatePool(UUID excluding,int limit){return repo.findByDiscoverableTrueAndUserIdNot(excluding,PageRequest.of(0,Math.min(limit,500))).stream().map(ProfileService::view).toList();}
 private static void validateAge(LocalDate birth){if(birth==null||Period.between(birth,LocalDate.now()).getYears()<18)throw new IllegalArgumentException("Users must be at least 18 years old");}
 private static ProfileView view(Profile p){return new ProfileView(p.getUserId(),p.getDisplayName(),p.getBio(),p.getBirthDate(),p.getGender(),p.getCity(),p.getState(),p.getCountry(),p.getLatitude(),p.getLongitude(),p.getMinAge(),p.getMaxAge(),p.getMaxDistanceKm(),p.isDiscoverable(),p.getInterests(),p.getLookingFor());}
 public record UpsertCommand(String displayName,String bio,LocalDate birthDate,Gender gender,String city,String state,String country,Double latitude,Double longitude,int minAge,int maxAge,int maxDistanceKm,boolean discoverable,Set<String> interests,Set<Gender> lookingFor){}
}
