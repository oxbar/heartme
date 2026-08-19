package com.himeros.notification;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.himeros.messaging.MessageSent;
import com.himeros.shared.idempotency.IdempotencyService;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class NotificationServiceTest {

    @Test
    void messageCreatesActionableNotificationForRecipient() {
        NotificationRepository repo = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repo, mock(IdempotencyService.class), new ObjectMapper());
        UUID recipient = UUID.randomUUID();
        UUID conversationId = UUID.randomUUID();

        service.onMessage(new MessageSent(UUID.randomUUID(), conversationId, UUID.randomUUID(), recipient, Instant.now()));

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(repo).save(captor.capture());
        Notification notification = captor.getValue();
        assertEquals(recipient, notification.user());
        assertEquals("MESSAGE", notification.type());
        assertTrue(notification.data().contains(conversationId.toString()));
    }

    @Test
    void clearDeletesOnlyCurrentUsersNotifications() {
        NotificationRepository repo = mock(NotificationRepository.class);
        NotificationService service = new NotificationService(repo, mock(IdempotencyService.class), new ObjectMapper());
        UUID user = UUID.randomUUID();
        when(repo.deleteByUserId(user)).thenReturn(4L);

        assertEquals(4L, service.clear(user));
        verify(repo).deleteByUserId(user);
    }
}
