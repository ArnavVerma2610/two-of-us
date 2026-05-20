# Two of Us — a compatibility arcade

A fun, pixel-art compatibility game for couples and friends. Bold outlines, a
cyan/orange/red fighting-game palette, procedural warm chiptune, and everything
drawn in code (no image assets).

Built with **React + Vite + TypeScript**, **Tailwind CSS**, **Zustand** (with
localStorage persistence), and **Tone.js** for procedural music + SFX.

## Levels

1. **First Impressions** — turn-based Q&A (food, hobbies, colours, movie, music)
   with a theatrical compatibility reveal and per-category scoring.
2. **Memory Canvas** — a shared pixel canvas with brush / pencil / fill / eraser /
   spray / shape stamps. Your artwork becomes the level's thumbnail.
3. – 12. Placeholders ("Coming Soon"), locked until the previous level is complete.

Progress, settings and your canvas are saved to localStorage — close the tab and
hit **CONTINUE** to resume.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Build / preview a production bundle:

```bash
npm run build
npm run preview
```

## Deploy

This is a static SPA. `vercel.json` is preconfigured (framework `vite`, output
`dist`, SPA rewrites). See the chat for exact GitHub + Vercel push commands, or:

```bash
npm i -g vercel
vercel            # link + deploy preview
vercel --prod     # production
```

## Project structure

```
src/
  components/   PixelButton, PixelFrame, PixelSprite, SoundToggle, TapToBegin,
                HomeScreen, LevelSelector, Settings
  levels/       Level01_Questions, Level02_Canvas, LevelPlaceholder
  game/         store (Zustand), audio (Tone.js), palette, sprites,
                compatibility, levels
  styles/       pixel.css (design system + CSS variables)
  nav.ts        tiny screen router context
  App.tsx       router + pixel-wipe transitions + music routing
```

## Controls

- **Enter** submits, **Esc** backs out, **Arrow keys** move around the level grid.
- Mute toggles (music / SFX) live bottom-right and in Settings.

_v0.1 — made with pixels._
