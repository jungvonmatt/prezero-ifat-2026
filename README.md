# PreZero IFAT 2026 Circle Game

Interactive Nuxt game for drawing the most perfect circle possible.
The app displays a live score while drawing, evaluates the round upon completion, and automatically saves successful scores.

## Features

- Intro screen with language selection (German/English), centered `intro-circle.svg`, and demo circle loop
- Live score during the round
- Dashed guide circle visible in idle state, fades out while drawing
- Error detection for direction changes, timeout, open circle, and invalid shape
- Automatic, anonymous saving of successful scores
- Reset to start screen via logo click or after inactivity
- API-first with LocalStorage fallback
- Top-3 visualization and ranking hint
- Lightweight i18n (German/English) without an external module

## Setup

```bash
npm install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

## Production

```bash
npm run build
npm run preview
```
