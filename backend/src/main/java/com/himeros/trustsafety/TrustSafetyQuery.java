package com.himeros.trustsafety;import java.util.*;public interface TrustSafetyQuery{boolean blockedEitherWay(UUID a,UUID b);Set<UUID> excluded(UUID user);}
