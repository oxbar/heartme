# Social UX V2 — API Contract Addendum

Este documento complementa `04-api-contract.md` com os endpoints adicionados para presença, reação, notificações acionáveis e localização.

## Presence

### POST `/api/v1/profile/presence`

Atualiza a atividade do usuário autenticado com throttling no banco e retorna o estado calculado.

### GET `/api/v1/profile/{userId}/presence`

```json
{
  "userId": "uuid",
  "online": false,
  "lastSeenAt": "2026-08-19T11:40:00Z"
}
```

Pode responder 404 quando o perfil não existe ou está bloqueado bilateralmente.

## Message reaction

### PUT `/api/v1/conversations/{conversationId}/messages/{messageId}/heart`

Toggle da reação de coração do usuário atual.

```json
{
  "messageId": "uuid",
  "heartReactionCount": 2,
  "heartReactedByMe": true
}
```

Erros esperados:

- 404: mensagem/conversa inexistente;
- 403: conversa não pertence ao usuário ou match não está mais ativo.

## Message view extension

`MessageView` passa a conter:

```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "senderId": "uuid",
  "content": "Olá",
  "sentAt": "...",
  "readAt": null,
  "heartReactionCount": 1,
  "heartReactedByMe": false
}
```

## WebSocket

### New message

```text
/topic/conversations/{conversationId}
```

Payload: `MessageView`.

### Read receipt

```text
/topic/conversations/{conversationId}/receipts
```

```json
{
  "conversationId":"uuid",
  "readerId":"uuid",
  "readAt":"..."
}
```

### Reaction event

```text
/topic/conversations/{conversationId}/reactions
```

```json
{
  "conversationId":"uuid",
  "messageId":"uuid",
  "actorId":"uuid",
  "active":true,
  "heartReactionCount":2,
  "at":"..."
}
```

## Notifications

### DELETE `/api/v1/notifications`

```json
{"deleted": 7}
```

A exclusão é sempre escopada pelo usuário autenticado.

Notificação `MATCH` utiliza `dataJson.matchId`. Notificação `MESSAGE` utiliza `dataJson.conversationId` e `dataJson.senderId`.

## Brazil location

### GET `/api/v1/locations/states`

Retorna estados brasileiros ordenados por nome.

### GET `/api/v1/locations/states/{state}/cities`

Retorna municípios do estado. `{state}` aceita nome ou UF.

Exemplo:

```http
GET /api/v1/locations/states/SC/cities
```

```json
[
  {"id": 4202008, "name": "Balneário Camboriú"},
  {"id": 4202404, "name": "Blumenau"}
]
```

## Unmatch enforcement

O endpoint de unmatch já existente permanece o contrato oficial. A mudança nesta versão é de autorização: uma `Conversation` ligada a match não ativo deixa de ser retornada/listável e chamadas de history/send/read/reaction são rejeitadas.
