# Profile UX V2 — Autosave, Interesses e Localização Brasil

## Objetivo

Eliminar fricção na edição do perfil e reduzir dados inconsistentes. Alterações válidas devem ser salvas automaticamente, interesses devem ser selecionáveis visualmente e localização brasileira deve oferecer estado/cidade assistidos.

## Autosave

`/app/profile/edit` deixa de depender do botão **Salvar perfil** no final da página.

Comportamento:

1. o perfil carregado define um fingerprint inicial;
2. qualquer mudança no modelo, interesses, gêneros procurados ou tipos físicos procurados altera o fingerprint;
3. mudanças são agrupadas com debounce de 700 ms;
4. somente formulário válido é persistido;
5. uma gravação em andamento nunca é executada em paralelo com outra;
6. se houver nova alteração durante o request, uma nova gravação é agendada depois da resposta;
7. o `ProfileStore` é atualizado depois de gravação bem-sucedida.

Estados visuais:

```text
idle -> saving -> saved
                -> error
```

A tela mostra pill discreto no cabeçalho e toast profissional no canto da interface.

Fotos continuam sendo persistidas imediatamente e usam o mesmo padrão de toast para upload/remoção.

## Interesses pré-definidos

O usuário não precisa mais digitar cada interesse e apertar Enter.

Categorias iniciais:

### Estilo de vida

Academia, Viagens, Trilhas, Praia, Gastronomia, Café, Pets, Natureza.

### Cultura

Música, Cinema, Séries, Livros, Fotografia, Arte, Museus, Teatro.

### Social

Amigos, Família, Festas, Bares, Shows, Festivais, Churrasco, Eventos.

### Esportes & hobbies

Corrida, Ciclismo, Futebol, Dança, Games, Tecnologia, Culinária, Yoga.

Cada opção funciona como chip toggle. O campo **Outro interesse** continua disponível para casos não contemplados pelo catálogo.

Regras:

- comparação case/accent-insensitive evita duplicatas como `Música` e `musica`;
- limite continua em 30 interesses por perfil;
- onboarding e profile edit compartilham o mesmo modelo de interação.

## Estados brasileiros

O backend contém catálogo dos 27 estados/DF para que a seleção de estado não dependa de disponibilidade externa.

```http
GET /api/v1/locations/states
```

Resposta:

```json
[
  {"code":"SC","name":"Santa Catarina"},
  {"code":"SP","name":"São Paulo"}
]
```

O usuário pode procurar por nome completo ou UF.

## Municípios

```http
GET /api/v1/locations/states/{state}/cities
```

`state` aceita UF ou nome completo. Os municípios são carregados sob demanda a partir do serviço oficial de Localidades do IBGE e ficam em cache em memória por UF.

O backend usa timeouts curtos para que indisponibilidade externa não trave a edição do perfil. Se o IBGE não responder, a API retorna lista vazia e o campo continua utilizável manualmente.

## Integridade de localização

Quando estado ou cidade mudam, coordenadas antigas são removidas:

```text
latitude  = null
longitude = null
```

Isso evita o erro de alterar `Blumenau/SC` para `São Paulo/SP` e manter as coordenadas geográficas de Blumenau no ranking de distância.

No profile edit, quando o catálogo de estados está disponível, autosave aguarda um estado reconhecido. Quando uma lista de municípios foi carregada, a cidade precisa corresponder a uma opção conhecida. Se o serviço de municípios estiver indisponível e a lista estiver vazia, digitação manual continua permitida.

## UX recomendada

- `datalist` nativo preserva teclado e acessibilidade;
- estado é carregado imediatamente;
- municípios são carregados somente depois que um estado válido é reconhecido;
- indicador de loading aparece ao buscar cidades;
- cidade anterior é limpa quando o usuário realmente muda de estado;
- onboarding aplica a mesma lógica antes de concluir cadastro.

## Evolução futura

O catálogo atual resolve estado/município. Para distância precisa depois de troca de cidade, a evolução recomendada é geocodificar o município escolhido e persistir um novo par de coordenadas, em vez de reaproveitar coordenadas antigas.
