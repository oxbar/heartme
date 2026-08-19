package com.himeros.messaging;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class MessageReactionRepository {
    private static final String HEART = "HEART";
    private final JdbcTemplate jdbc;

    MessageReactionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    boolean hasHeart(UUID messageId, UUID userId) {
        Integer count = jdbc.queryForObject(
            "select count(*) from message_reactions where message_id=? and user_id=? and reaction=?",
            Integer.class, messageId, userId, HEART
        );
        return count != null && count > 0;
    }

    boolean addHeart(UUID messageId, UUID userId, Instant at) {
        return jdbc.update("""
            insert into message_reactions(message_id,user_id,reaction,created_at)
            values (?,?,?,?)
            on conflict (message_id,user_id) do update set reaction=excluded.reaction, created_at=excluded.created_at
            """, messageId, userId, HEART, at) > 0;
    }

    boolean removeHeart(UUID messageId, UUID userId) {
        return jdbc.update(
            "delete from message_reactions where message_id=? and user_id=? and reaction=?",
            messageId, userId, HEART
        ) > 0;
    }

    int heartCount(UUID messageId) {
        Integer count = jdbc.queryForObject(
            "select count(*) from message_reactions where message_id=? and reaction=?",
            Integer.class, messageId, HEART
        );
        return count == null ? 0 : count;
    }

    Map<UUID, ReactionSummary> summaries(Collection<UUID> messageIds, UUID viewer) {
        if (messageIds == null || messageIds.isEmpty()) return Map.of();
        String placeholders = String.join(",", Collections.nCopies(messageIds.size(), "?"));
        String sql = """
            select message_id,
                   count(*) filter (where reaction=?) as heart_count,
                   bool_or(user_id=? and reaction='HEART') as reacted_by_me
              from message_reactions
             where message_id in (%s)
             group by message_id
            """.formatted(placeholders);
        List<Object> args = new ArrayList<>();
        args.add(HEART);
        args.add(viewer);
        args.addAll(messageIds);
        Map<UUID, ReactionSummary> result = new HashMap<>();
        jdbc.query(sql, rs -> {
            ReactionSummary summary = map(rs);
            result.put(summary.messageId(), summary);
        }, args.toArray());
        return result;
    }

    private static ReactionSummary map(ResultSet rs) throws SQLException {
        return new ReactionSummary(
            rs.getObject("message_id", UUID.class),
            rs.getInt("heart_count"),
            rs.getBoolean("reacted_by_me")
        );
    }

    record ReactionSummary(UUID messageId, int heartCount, boolean reactedByMe) {}
}
