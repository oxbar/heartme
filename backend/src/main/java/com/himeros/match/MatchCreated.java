package com.himeros.match; import java.time.Instant; import java.util.UUID; public record MatchCreated(UUID matchId,UUID userA,UUID userB,Instant occurredAt){}
