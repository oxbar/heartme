package com.himeros.profile;
import java.util.*;
public interface ProfileQuery { Optional<ProfileView> find(UUID userId); List<ProfileView> candidatePool(UUID excluding,int limit); record ProfileView(UUID userId,String displayName,String bio,java.time.LocalDate birthDate,Gender gender,String city,String state,String country,Double latitude,Double longitude,int minAge,int maxAge,int maxDistanceKm,boolean discoverable,Set<String> interests,Set<Gender> lookingFor){} }
