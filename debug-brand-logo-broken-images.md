# DEBUG: brand-logo-broken-images
- **Session ID:** brand-logo-broken-images
- **Data:** 2026-08-19
- **Status:** [OPEN]
- **Sintoma:** Imagens de logo NÃO aparecem em lugar nenhum da aplicação. Landing page mostra ícone quebrado `🖼️ Himeros` no header. CTAs gold aparecem (tokens CSS OK), logo PNG não carrega.

---

## 3-5 HIPÓTESES FALSIFICÁVEIS

| ID | Hipótese | Como verificar |
|---|---|---|
| H1 | **Path do asset ERRADO** no BrandComponent: `ASSET_BASE = 'assets/brand/png'` é RELATIVO. Devia ser ABSOLUTO `/assets/brand/png` (com barra inicial). Sem `/` o browser concatena com route path: se estiver em `/login` tenta carregar `/login/assets/brand/png/logo-*.png` = 404. | 1. Abrir Network tab do DevTools → ver URL que o browser está tentando carregar. 2. Rodar `ls -la frontend/src/assets/brand/png/` no disco. |
| H2 | **Arquivos PNG NAO existem** em `frontend/src/assets/brand/png/` ou estão com 0 bytes (cópia falhou silenciosamente). | Rodar `ls -lh frontend/src/assets/brand/png/` e confirmar existência e tamanho dos 7 arquivos: `emblem-gold.png`, `icon-gold.png`, `logo-horizontal-{black,gold,white}.png`, `logo-primary-gold.png`, `logo-wordmark-gold.png`. |
| H3 | **angular.json NAO tem `assets: ["src/assets"]` configurado** → build/ng serve NÃO serve arquivos de `src/assets` no HTTP. | Ler bloco `architect.build.options.assets` em `frontend/angular.json`. |
| H4 | **CSS `.hm-brand-img` altura zero**: container pai `.hm-brand-link` herda altura 0 de algum wrapper, então `<img>` fica com `height:100%` = 0px. Imagem até carrega mas é invisível (mas screenshot mostra broken image icon então H4 é menos provável — broken image mostra que browser tentou e falhou, não que altura é 0). | Inspecionar elemento via DevTools, checar `computed style` de `.hm-brand-img` e `.hm-brand-link`. |
| H5 | **Arquivos PNG corrompidos / extensão errada na cópia** (ex: `logo-primary-gold.png.webp` renomeado errado). | `file frontend/src/assets/brand/png/logo-primary-gold.png` no terminal (retorna "PNG image data"). |

---

## EVIDÊNCIA COLETADA

| H | Status | Evidência |
|---|---|---|
| H1 (Path relativo) | ✅ FALSA mas VAMOS CORRIGIR também (para robustez) | Mesmo com path absoluto, SEM a pasta src/assets no angular.json seria 404. |
| H2 (Arquivos não existem) | ❌ **REFUTADA** | `ls -lh` mostra 7 arquivos PNG, tamanhos 532KB~2.4M (válidos), RGBA 8-bit, resoluções corretas. |
| **H3 (angular.json SEM assets src/assets)** | ✅ **CONFIRMADA - CAUSA RAIZ** | `frontend/angular.json` linha 18-22: só tem `"input": "public"` no array `assets`. A pasta `src/assets` NÃO está registrada → dev-server não serve `/assets/*` em HTTP → 404! |
| H4 (Altura 0 no CSS) | ❌ **REFUTADA** | Screenshot mostra **ícone de broken image nativo do browser** com alt text "Himeros". Se altura fosse 0 o browser não desenharia o broken image placeholder. |
| H5 (Arquivos corrompidos) | ❌ **REFUTADA** | `file ...logo-primary-gold.png` retorna "PNG image data, 1254 x 1254, 8-bit/color RGBA, non-interlaced" = arquivo 100% válido. |

---

## FIX APLICADO

### Fix 1/2 — angular.json (CAUSA RAIZ)
**Arquivo:** `frontend/angular.json` lines 18-28
**Antes:** Array `assets` só servia pasta `public/`.
```json
"assets": [{ "glob": "**/*", "input": "public" }]
```
**Depois:** Adicionado mapping `src/assets/*` → `/assets/*` no HTTP do dev-server/build.
```json
"assets": [
  { "glob": "**/*", "input": "public" },
  { "glob": "**/*", "input": "src/assets", "output": "/assets" }
]
```

### Fix 2/2 — brand.component.ts (robustez preventiva H1)
**Arquivo:** `frontend/src/app/shared/brand.component.ts` line 72
**Antes:** `ASSET_BASE = 'assets/brand/png'` (relativo — risco de concat com /login → `/login/assets/...`)
**Depois:** `ASSET_BASE = '/assets/brand/png'` (absoluto — sempre GET `/assets/...` independentemente da rota atual).

### ⚠️ PASSO OBRIGATÓRIO APÓS FIX:
Reiniciar `ng serve` (angular.json NÃO é hot-reload. Sem restart, o novo mapping de assets NÃO entra em vigor).

---

## VERIFICAÇÃO POST-FIX (Evidências RUNTIME coletadas)

### Pre-fix esperado vs Post-fix real
| Métrica | Pre-fix esperado (bug) | Post-fix real (integrated browser) | Status |
|---|---|---|---|
| `GET /assets/brand/png/logo-horizontal-gold.png` | 404 Not Found | **200 OK** · title=`logo-horizontal-gold.png (2172×724)` | ✅ RESOLVIDO |
| Console erros 404 de PNG | esperados 3-7 | **NENHUM erro 404 de imagens** | ✅ RESOLVIDO |
| Console geral | - | 1 erro semântico `ERR_ABORTED /api/v1/auth/web/refresh` (landing sem sessão, normal) | ℹ️ ignorar |
| DOM `<img>` hm-brand em header+footer | esperava "broken image placeholder" | `<img name="Himeros">` renderizado com sucesso (refs e7 e e19) | ✅ RESOLVIDO |

---

## CAUSA RAIZ FINAL (2 fatores ligados)
1. **Fator 1 (Principal):** Angular Application Builder (`@angular/build:application`) — por padrão SÓ serve pasta `public/`, **NÃO** serve `src/assets/` automaticamente. Configuração default do `angular.json` só tem `"input": "public"` no array assets. Resultado: HTTP 404 em tudo que estava em `src/assets/*`.
2. **Fator 2 (Prevenção):** Path relativo `'assets/brand/png'` no BrandComponent poderia concatenar com nome de rota e causar `/login/assets/...` → 404 em rotas não-raiz. Trocar para absoluto `/assets/brand/png` torna o path robusto independentemente da rota.

### Fix DUPLA aplicado (garantia redundante — falha segura):
- **Fix A:** Adicionar `{ glob: **/*, input: src/assets, output: /assets }` ao angular.json → serve src/assets via build config
- **Fix B:** Copiar `src/assets/*` → `public/assets/*` → serve pelo mecanismo nativo default de public/ (não depende de angular.json ter reload certo)
- **Fix C:** `ASSET_BASE` passa a ser **absoluto** `/assets/brand/png` (barra inicial)

---

## LIMPEZA PENDENTE
Aguardar usuário confirmar opção A (resolvido) para:
- Remover arquivos de debug e instrumentation (nenhum instrumentation adicionado nesta sessão; nenhum console.log inserido)
- Opcionalmente REMOVER a cópia de `public/assets/` se preferir manter só `src/assets/` com entrada explícita no angular.json. Porém manter AMBOS é mais seguro.

---

## PASSOS PARA O USUÁRIO RESOLVER CACHE NO SEU BROWSER
O cache HTTP do 404 antigo está persistente. Executar:

1. **Abrir aba anônima / incógnito** do Chrome/Safari → acessar `http://localhost:4200/`
  (bypass 100% de cache)
OU
2. **Hard Refresh total:**
   - Chrome: DevTools aberto (F12) → clicar e segurar botão Refresh → "Empty Cache and Hard Reload"
   - Safari: ⌥⌘E (Esvaziar caches) + ⌘R
   - Firefox: Ctrl+Shift+Del → marcar "Cache" + limpar + ⌘R

3. Confirmar ng serve foi **reiniciado** (Ctrl+C + npm start) após editar `angular.json`.

---

## VERIFICAÇÃO POST-FIX

(aguardando confirmação do usuário)
