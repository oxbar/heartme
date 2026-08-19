package com.himeros.recommendation;

import com.himeros.interaction.InteractionQuery;
import com.himeros.profile.ProfileQuery;
import java.time.*;
import java.util.*;

record RecommendationContext(
    ProfileQuery.ProfileView me,
    Instant now,
    LocalDate today,
    Map<UUID, InteractionQuery.InteractionView> lastInteractionByTarget,
    Set<UUID> safetyExcluded,
    Set<UUID> activeMatches,
    Set<UUID> recentlyUnmatched,
    ImplicitPreferenceService.ImplicitPreferenceModel implicitPreferences
) {}
