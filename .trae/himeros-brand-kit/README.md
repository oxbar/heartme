# Himeros Brand Kit

Pacote oficial de identidade visual para o frontend Himeros.

## Estrutura

```text
assets/
  brand/
    png/
      logo-primary-gold.png
      logo-horizontal-gold.png
      logo-horizontal-white.png
      logo-horizontal-black.png
      logo-wordmark-gold.png
      emblem-gold.png
      icon-gold.png
    webp/
  icons/
    favicon.ico
    apple-touch-icon.png
    android-chrome-192x192.png
    android-chrome-512x512.png
styles/
  himeros-brand.css
  _himeros-brand.scss
.trae/skills/himeros-brand/SKILL.md
HIMEROS-BRAND.skills.md
site.webmanifest
```

## Aplicação recomendada no Angular

1. Copie `assets/brand` e `assets/icons` para `src/assets/`.
2. Copie `styles/himeros-brand.css` para `src/styles/` e importe globalmente.
3. Copie `.trae/skills/himeros-brand/SKILL.md` para a raiz do projeto preservando o caminho `.trae/skills/himeros-brand/SKILL.md`.
4. Atualize o `index.html`:

```html
<link rel="icon" href="assets/icons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<meta name="theme-color" content="#ECA420">
```

Exemplo de logo do header:
```html
<img
  src="assets/brand/png/logo-horizontal-gold.png"
  alt="Himeros"
  class="brand-logo"
/>
```

```css
.brand-logo {
  display: block;
  width: auto;
  height: 38px;
  object-fit: contain;
}
```

## Paleta principal
- Gold: `#ECA420`
- Gold hover: `#D68F12`
- Black: `#070707`
- Surface: `#151515`
- White: `#FFFFFF`
- Muted text: `#B8B8B8`

Leia `HIMEROS-BRAND.skills.md` ou `.trae/skills/himeros-brand/SKILL.md` para as regras completas de UI/UX e uso da marca.
