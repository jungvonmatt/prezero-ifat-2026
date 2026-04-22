# PreZero IFAT 2026 Circle Game

Interaktives Nuxt-Game zum Zeichnen eines moeglichst perfekten Kreises.
Die App zeigt Live-Score waehrend des Zeichnens, bewertet die Runde nach Abschluss und speichert erfolgreiche Scores automatisch.

## Features

- Live-Score waehrend der Runde
- Fehlererkennung fuer Richtungswechsel, Timeout, offenen Kreis und ungueltige Form
- Automatisches, anonymes Speichern erfolgreicher Scores
- API-First mit LocalStorage-Fallback
- Top-3-Visualisierung und Ranking-Hinweis
- Leichtgewichtiges i18n (Deutsch/Englisch) ohne externes Modul

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Architektur

- `app/components/CmDraw.vue`: Canvas, Timer, Intro, Ergebnisdarstellung
- `app/components/CmHighscore.vue`: Top-3, Liste, Rankingtext
- `app/composables/useCircleGame.ts`: zentrale Spielfassade
- `app/composables/useRoundLifecycle.ts`: Rundenfluss und Abbruchlogik
- `app/composables/useCircleScoring.ts`: Scoreberechnung und Fehlerlabels
- `app/composables/useHighscores.ts`: Laden/Speichern, Duplikat-Schutz, Fallback
- `app/composables/useLocale.ts`: t(path, params), locale, setLocale
- `server/utils/highscores.ts`: serverseitige Persistenz (Top 100)

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Node Deployment (JvM Preview)

This project contains Node deployment scripts analogous to the setup in `600331-gb-2025-digital`:

- `npm run deploy:node:development`
- `npm run deploy:node:staging`
- `npm run deploy:node:production`

### Setup

1. Copy `.env.example` to `.env` and fill in server values.
2. Ensure your SSH key file (default `deployment-ssh-key`) is available locally.
3. Run one of the deploy commands above.

Production URL target:

- `https://prezero.jvm-preview.de/`

### Highscore persistence

The Node process is started with `HIGHSCORE_FILE_PATH=data/highscores.json` to keep highscores writable and persistent on the server deployment path.
Locally (without this env var), highscores continue to use `content/highscores.json`.

## Scoring Documentation

Detailed documentation for drawing, error handling, and score tuning is available in [docs/score-logic.md](docs/score-logic.md).

## Highscore behavior

- Erfolgreiche Runden werden automatisch gespeichert (kein Save-Button)
- Speicherung ist anonym (`score`, `createdAt`)
- Doppelte Score-Werte werden clientseitig nicht erneut gespeichert
- Bei API-Fehler wird auf LocalStorage-Fallback gewechselt

## Highscore API

Alle Endpunkte arbeiten mit anonymen Eintraegen im Format:

- score: number
- createdAt: ISO-String

### GET /api/highscores

- Zweck: Aktuelle Highscores laden
- Request-Body: keiner
- Response: Array von Highscore-Eintraegen (absteigend sortiert)

### POST /api/highscores

- Zweck: Einen Score hinzufuegen
- Request-Body:

```json
{
	"score": 87.5
}
```

- Response: Aktualisiertes Array von Highscore-Eintraegen
- Fehlerfall: 400 bei ungueltigem Payload (missing/ungueltiges score)

### PUT /api/highscores

- Zweck: Gesamte Highscore-Liste importieren/ersetzen
- Request-Body:

```json
{
	"entries": [
		{ "score": 91.2, "createdAt": "2026-04-22T08:00:00.000Z" },
		{ "score": 87.5, "createdAt": "2026-04-22T09:00:00.000Z" }
	]
}
```

- Response: Aktualisiertes, validiertes Array von Highscore-Eintraegen
- Fehlerfall: 400 bei ungueltigem Payload (entries fehlt/kein Array)

### DELETE /api/highscores

- Zweck: Alle Highscores loeschen
- Request-Body: keiner
- Response: Leeres (oder entsprechend aktualisiertes) Array

### DELETE /api/highscores/item

- Zweck: Einzelnen Eintrag ueber Zeitstempel loeschen
- Request-Body:

```json
{
	"createdAt": "2026-04-22T09:00:00.000Z"
}
```

- Response: Aktualisiertes Array ohne geloeschten Eintrag
- Fehlerfall: 400 bei fehlendem oder leerem createdAt
