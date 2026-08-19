# Social Experience V2 — Match, Chat, Presence e Notificações

## Objetivo

Este documento descreve a evolução da experiência social do HeartMe após a Discovery Engine V2. O foco é tornar match e conversa perceptíveis, confiáveis e consistentes entre múltiplos browsers, melhorar feedback visual e garantir que um `UNMATCH` encerre o vínculo de forma efetiva.

## Match celebration

Quando uma interação `LIKE` ou `SUPER_LIKE` resulta em reciprocidade, o Discovery apresenta uma celebração em primeiro plano com:

- foto principal do usuário autenticado;
- foto principal do novo match;
- coração central animado;
- partículas/confetes com animação reduzida automaticamente quando `prefers-reduced-motion` estiver habilitado;
- CTA **Conversar agora**;
- CTA **Continuar descobrindo**.

O CTA de conversa procura a `Conversation` vinculada ao novo match. Como a conversa é criada de forma assíncrona a partir de `MatchCreated`, o frontend executa tentativas curtas de resolução e, se ainda não houver conversa, cai de forma segura para `/app/matches`.

## Match sidebar

A barra lateral passa a representar estado real:

- avatar do usuário sem contorno/quadrado branco artificial;
- indicador online posicionado dentro do card, sem overflow desalinhado;
- indicador online exibido somente quando a API de presença confirmar `online=true`;
- card de match direciona para a conversa quando já existe `Conversation`; caso contrário abre o perfil público.

## Mensagens e reações

### Reação de coração

Reações deixam de ser decorativas e passam a ser persistidas na tabela `message_reactions`.

Regras:

- uma reação de coração por usuário/mensagem;
- `PUT` funciona como toggle;
- a contagem é agregada no histórico;
- `heartReactedByMe` informa o estado do usuário atual;
- mudança é transmitida em tempo real para todos os participantes da conversa.

### Tópicos WebSocket

```text
/topic/conversations/{conversationId}
/topic/conversations/{conversationId}/receipts
/topic/conversations/{conversationId}/reactions
```

A autorização WebSocket valida a conversa antes de aceitar qualquer uma dessas subscriptions.

### Read receipts

Mensagens próprias exibem:

- um tick enquanto ainda não foram lidas;
- dois ticks quando `readAt` está preenchido.

Ao abrir/receber mensagens, o destinatário executa `markRead`. Quando mensagens são alteradas para lidas, o backend publica um `ReadReceipt` no tópico da conversa. O remetente atualiza os ticks sem reload.

## Online e visto por último

A presença é baseada em `profiles.last_active_at`.

Endpoints:

```http
POST /api/v1/profile/presence
GET  /api/v1/profile/{userId}/presence
```

Resposta:

```json
{
  "userId": "uuid",
  "online": true,
  "lastSeenAt": "2026-08-19T12:00:00Z"
}
```

O chat mantém a própria presença ativa e consulta a presença do outro participante a cada 30 segundos. A API considera online atividade dentro da janela de 90 segundos.

A interface mostra:

- `Online agora`; ou
- `Visto por último hoje às HH:mm`; ou
- data/hora compacta para datas anteriores.

## Unmatch

O painel lateral da conversa oferece **Desfazer match**.

Fluxo:

1. usuário confirma a ação;
2. frontend chama o endpoint existente de unmatch;
3. match deixa de ser `ACTIVE`;
4. usuário retorna para `/app/matches`;
5. `MessagingService` deixa de listar e de autorizar a conversa daquele par.

Mesmo conhecendo diretamente o UUID de uma conversa antiga, o backend rejeita histórico/envio se não existir mais match ativo entre os participantes.

## Notificações acionáveis

### Novo match

Notificação `MATCH` carrega:

```json
{"matchId":"uuid"}
```

Ao clicar, o frontend resolve a conversa correspondente e abre `/app/messages/{conversationId}`. Se a conversa ainda não estiver disponível, abre `/app/matches`.

### Nova mensagem

Cada mensagem dispara uma notificação `MESSAGE` para o destinatário com:

```json
{
  "conversationId":"uuid",
  "senderId":"uuid"
}
```

Clicar abre diretamente a conversa.

### Limpeza

```http
DELETE /api/v1/notifications
```

Remove exclusivamente as notificações do usuário autenticado. A tela oferece **Limpar** ao lado de **Atualizar** e mantém **Tudo lido** separado de exclusão.

## Banco de dados

Migration:

```text
V4__social_chat_ux.sql
```

Nova tabela:

```text
message_reactions
- message_id UUID FK messages(id)
- user_id    UUID FK user_accounts(id)
- reaction   VARCHAR(24)
- created_at TIMESTAMPTZ
- PK(message_id, user_id)
```

`ON DELETE CASCADE` impede reação órfã quando uma mensagem é removida.

## Regras de segurança

- somente participantes de conversa com match ativo podem acessar mensagens;
- reação exige acesso à conversa e a mensagem deve pertencer à conversa informada;
- presença respeita bloqueio bilateral;
- WebSocket valida autenticação JWT e autorização da conversa;
- limpeza de notificações é escopada pelo usuário autenticado;
- unmatch passa a bloquear também o uso da conversa antiga no backend.
