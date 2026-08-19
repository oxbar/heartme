package com.himeros.messaging;

import com.himeros.shared.CorsProperties;
import java.util.*;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private static final String CONVERSATION_TOPIC = "/topic/conversations/";

    private final JwtDecoder decoder;
    private final ConversationAccess access;
    private final CorsProperties cors;

    public WebSocketConfig(JwtDecoder decoder, ConversationAccess access, CorsProperties cors) {
        this.decoder = decoder;
        this.access = access;
        this.cors = cors;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(cors.allowedOrigins().toArray(String[]::new));
    }

    @Override
    public void configureClientInboundChannel(org.springframework.messaging.simp.config.ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public org.springframework.messaging.Message<?> preSend(
                org.springframework.messaging.Message<?> message,
                MessageChannel channel
            ) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) return message;

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    authenticate(accessor);
                }

                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    authorizeSubscription(accessor);
                }

                return message;
            }
        });
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing WebSocket bearer token");
        }
        Jwt jwt = decoder.decode(authorization.substring(7));
        accessor.setUser(new UsernamePasswordAuthenticationToken(
            jwt.getSubject(),
            "",
            List.of(new SimpleGrantedAuthority("ROLE_USER"))
        ));
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(CONVERSATION_TOPIC)) {
            throw new IllegalArgumentException("Unsupported subscription destination");
        }
        if (accessor.getUser() == null) {
            throw new IllegalArgumentException("Unauthenticated WebSocket subscription");
        }

        String rawId = destination.substring(CONVERSATION_TOPIC.length());
        UUID conversationId;
        UUID userId;
        try {
            conversationId = UUID.fromString(rawId);
            userId = UUID.fromString(accessor.getUser().getName());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid conversation subscription", ex);
        }

        if (!access.canAccess(userId, conversationId)) {
            throw new IllegalArgumentException("Forbidden conversation subscription");
        }
    }
}
