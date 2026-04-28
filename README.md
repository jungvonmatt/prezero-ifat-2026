# PreZero IFAT 2026 Circle Game

Interaktives Nuxt-Game zum Zeichnen eines moeglichst perfekten Kreises.
Die App zeigt Live-Score waehrend des Zeichnens, bewertet die Runde nach Abschluss und speichert erfolgreiche Scores automatisch.

## Features

- Intro-Screen mit Sprachwahl (Deutsch/Englisch), zentralem `intro-circle.svg` und Demo-Kreis-Loop
- Live-Score waehrend der Runde
- Gestrichelter Guide-Kreis ist im Idle-Zustand sichtbar und blendet waehrend des Zeichnens aus
- Fehlererkennung fuer Richtungswechsel, Timeout, offenen Kreis und ungueltige Form
- Automatisches, anonymes Speichern erfolgreicher Scores
- Reset auf den Start-Screen per Logo-Klick oder nach Inaktivitaet
- API-First mit LocalStorage-Fallback
- Top-3-Visualisierung und Ranking-Hinweis
- Leichtgewichtiges i18n (Deutsch/Englisch) ohne externes Modul

## Heute geaendert (28.04.2026)

- Score-Feedback rotiert jetzt in 3 Varianten pro Label (`score.label0` bis `score.label100`), fuer mehr textliche Abwechslung.
- Auto-Complete/Overlap wurde toleranter eingestellt: Soft-Complete ueber Coverage+Closure, Hard-Stop bei 540 Grad (bis zu 1.5 Kreise).
- Score-Verteilung wurde angepasst (Exponent 2.0), damit Ergebnisse ueber 0-100 gleichmaessiger verteilt sind.

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
- `app/constants/game.ts`: zentrale Game-Konstanten wie Inaktivitaets-Timeout
- `server/utils/highscores.ts`: serverseitige Persistenz (Top 100)

## Intro und Reset-Verhalten

- Vor Spielstart zeigt die Startseite Sprachbuttons links unten sowie ein zentriertes `intro-circle.svg`.
- Parallel laeuft eine Demo-Kreis-Loop ueber den Canvas, bis der User das Spiel startet.
- Der gestrichelte Guide-Kreis wird nicht auf dem Intro-Screen gezeigt, ist nach Spielstart im Idle sichtbar und blendet beim Zeichnen aus.
- Klick auf das Logo setzt die App zurueck auf den Start-Screen.
- Nach `INACTIVITY_TIMEOUT_MS` Inaktivitaet wird ebenfalls auf den Start-Screen mit Demo-Kreisen zurueckgesetzt.

## Wie der Intro-Loop funktioniert

- Die Intro-Loop wird in `app/composables/useCircleGame.ts` erzeugt.
- Dort sind drei feste Beispiel-Kreisvarianten definiert, die als Punktpfade aufgebaut werden.
- Pro Frame wird nur der sichtbare Ausschnitt dieses festen Pfads erweitert, damit der Kreis stabil bleibt und nicht sichtbar "wabert".
- Das eigentliche Zeichnen der Demo-Linie laeuft ueber denselben Stroke-Renderer wie spaeter echte User-Eingaben.
- Das Intro-SVG `public/intro-circle.svg` wird in `app/components/CmDraw.vue` separat als Overlay angezeigt.

## Wichtige Tuning-Konstanten

### Tuning fuer Intro, Start-Screen und Reset

| Konstante | Wirkung | Typischer Aenderungsfall |
| --- | --- | --- |
| `INTRO_PREVIEW_DRAW_MS` | Steuert, wie schnell ein Demo-Kreis gezeichnet wird | Intro soll ruhiger oder dynamischer wirken |
| `INTRO_PREVIEW_HOLD_MS` | Steuert, wie lange ein fertiger Demo-Kreis sichtbar bleibt | Demo-Kreis soll kuerzer oder laenger stehen bleiben |
| `INTRO_PREVIEW_TOTAL_POINTS` | Bestimmt die geometrische Aufloesung der Demo-Kreis-Pfade | Demo-Kreis soll glatter oder leichter reduziert gerendert werden |
| `INTRO_PREVIEW_STROKE_WIDTH_SCALE` | Steuert die sichtbare Dicke der Intro-Kreis-Linie | Intro-Kreis soll feiner oder kraeftiger erscheinen |
| `GUIDE_RADIUS_FACTOR` | Bestimmt den Zielradius von Guide-Kreis und Intro-Kreis-Geometrie | Kreis soll insgesamt groesser oder kleiner werden |
| `INACTIVITY_TIMEOUT_MS` | Zeit bis zum automatischen Reset auf den Start-Screen | Messebetrieb oder Kiosk-Modus braucht schnelleres oder spaeteres Reset |

### Tuning fuers User-Kreiszeichnen

| Konstante | Wirkung | Typischer Aenderungsfall |
| --- | --- | --- |
| `ROUND_TIMEOUT_MS` | Zeitfenster pro Zeichnungsrunde | Schwierigkeitsgrad anheben oder reduzieren |
| `DIRECTION_MIN_SEGMENT` | Mindestsegmentlaenge, ab der Richtungspruefung greift | Richtungsfehler frueher oder spaeter erkennen |
| `DIRECTION_MIN_ANGLE_DELTA` | Obere Schwelle fuer relevante Winkelaenderung pro Segment | Empfindlichkeit fuer Richtungswechsel anpassen |
| `DIRECTION_MIN_ANGLE_DELTA_FLOOR` | Untere Mindestschwelle fuer Winkelaenderung | Zu fruehe Fehltrigger bei kleinen Bewegungen vermeiden |
| `DIRECTION_MIN_ANGLE_DELTA_RATIO` | Adaptive Winkel-Schwelle relativ zur Segmentlaenge | Verhalten bei unterschiedlich schnellen Zuegen ausbalancieren |
| `DIRECTION_MIN_CENTER_DISTANCE_FACTOR` | Minimaler Abstand zum Zentrum fuer Richtungspruefung | Richtungspruefung im inneren Kreisbereich lockern oder verschaerfen |
| `DIRECTION_OPPOSITE_STREAK_TO_ABORT` | Anzahl gegenteiliger Segmente bis zum Abbruch | Sofortiger vs. toleranter Richtungsabbruch |
| `SCORE_WEIGHT_CLOSURE` | Gewicht des Kreis-Schlusses im Live-Score | Kreisabschluss im Score staerker oder schwaecher gewichten |
| `FINAL_CLOSURE_ERROR_THRESHOLD` | Harte Grenze fuer „offener Kreis“ beim Endergebnis | Fehlerlabel `closure` strenger oder kulanter setzen |
| `MIN_STROKE_WIDTH` / `MAX_STROKE_WIDTH` | Minimal- und Maximaldicke der User-Linie | Linie insgesamt feiner oder kraeftiger darstellen |
| `MAX_SPEED` | Normierung der Geschwindigkeitswirkung auf Renderparameter | Reaktion auf schnelle Zuege staerker oder sanfter machen |
| `STROKE_WIDTH_ALPHA_SLOW` / `STROKE_WIDTH_ALPHA_FAST` | Glaettung der Linienbreite | Breitenwechsel weicher oder direkter machen |
| `STROKE_POINT_ALPHA_SLOW` / `STROKE_POINT_ALPHA_FAST` | Glaettung der Punktinterpolation | Strich ruhiger oder unmittelbarer wirken lassen |

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
