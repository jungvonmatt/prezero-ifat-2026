# Circle Game: Architektur, Verdrahtung und Score-Logik

Stand: 27.04.2026

## Zweck dieser Datei

Diese Datei dokumentiert den aktuellen Ist-Zustand von Spielablauf, Intro-Verhalten, Scoring und Highscore-Speicherung.
Sie ist auf den aktuellen Code in app/composables, app/components, app/pages, app/layouts und server/utils abgestimmt.

## Aktuelle Gesamtstruktur

### Layout

- app/layouts/default.vue
  App-Shell: Viewport-Scaling (nur dev), Logo-Button mit App-Reset-Signal, Header, Footer-Nav

### Komponenten

- app/components/CmDraw.vue
  Canvas, Intro-Screen mit `intro-circle.svg`, Start-Button, Live-Score, Timer, Ergebnislabel, Highscore-Hinweis
- app/components/CmHighscore.vue
  Top-3-Visualisierung, Liste, Ranking-Hinweis
- app/components/CmConfettiRain.vue
  Konfetti bei erfolgreicher Runde

Hinweis: Speichern erfolgt automatisch und anonym. Ein separates Save-UI existiert nicht.

### Composables

- app/composables/useCircleGame.ts
  Oberflaeche fuer das komplette Zeichenspiel, Verdrahtung von Rendering, Lifecycle, Intro-Preview und Scoring
- app/composables/useCanvasRenderer.ts
  Canvas-Refs, Sizing, Redraw, Pointer-Koordinaten, Guide-Rendering
- app/composables/useRoundLifecycle.ts
  Rundenzustand, Timer, Pointer-Flow, Richtungswechsel-Abbruch, Reset auf Start-Screen
- app/composables/useCircleScoring.ts
  Score- und Geometrie-Logik inkl. i18n-Label-Funktionen
- app/composables/useStrokeRenderer.ts
  Visuelles Renderverhalten des Strichs
- app/composables/useHighscores.ts
  Laden/Speichern der Highscores inkl. API-First und LocalStorage-Fallback
- app/composables/useLocale.ts
  Leichtgewichtiges i18n (de/en, t(path, params))

### Konstanten

- app/constants/game.ts
  Zentrale Spielkonstanten, aktuell u. a. Inaktivitaets-Timeout

### Page

- app/pages/index.vue
  Orchestrierung von Spielablauf, Start-Screen, Tooltip-Info, Highscore-Sidebar und Locale.
  Enthält: Sprachbuttons auf dem Start-Screen, Tooltip-Info mit Dismiss-Logik,
  automatisches Speichern erfolgreicher Runden, isNewHighscore-Ermittlung, showErrorLabel-Berechnung,
  Reset auf Start-Screen per globalem Reset-Signal und Inaktivitaets-Timer.

## Datenfluss auf hoher Ebene

```text
index.vue
  -> useCircleGame()
    -> useCanvasRenderer()
    -> useRoundLifecycle()
    -> useCircleScoring()
    -> useStrokeRenderer()

index.vue
  -> useHighscores(result)

index.vue
  -> useLocale()

default.vue
  -> appResetSignal (useState)
  -> resetApp() erhoeht appResetSignal, navigiert zu "/"

index.vue
  -> CmDraw
  -> CmHighscore
  -> CmConfettiRain (in CmDraw)
  -> tooltip-info (inline)
```

## Verantwortungen pro Baustein

### default.vue (Layout)

Aufgabe:

- App-Shell mit Header, Footer-Nav und Seiten-Slot
- Viewport-Scaling (CSS-Transform auf 1920x1080-Basis, nur im Dev-Modus aktiv)
- Logo als Button: `resetApp()` erhoeht `appResetSignal` und navigiert zu `/`

### useCircleGame

useCircleGame ist die zentrale Spielfassade und liefert nur die Werte/Aktionen, die die Page braucht:

- setCanvasWrapEl
- setCanvasEl
- hasStarted
- isDrawing
- hasResult
- scoreDisplayText
- roundTimeLeftMs
- timerText
- timerDashoffset
- startGame
- startRound
- moveRound
- endRound
- resetRound
- resetToStartScreen
- result

scoreDisplayText-Verhalten:
- Kein Start: leerer String
- hasStarted, kein Ergebnis, nicht am Zeichnen: "0%" (z. B. nach Restart)
- Am Zeichnen: Live-Score aus `calculateLiveScore()`, Fallback "0%" wenn null
- Ergebnis vorhanden: "XX.X%"

Interne Aufgabe: `createRoundResult()`, Redraw-Verdrahtung, Timer-Konfiguration, Intro-Preview-Loop und Scoring-Einbindung.

### useCanvasRenderer

Aufgabe:

- Canvas-Refs verwalten
- Canvas-Groesse und DPR beruecksichtigen
- Hintergrund und Guide rendern
- Stroke rendern
- Pointer in Canvas-Koordinaten umrechnen

Aktuelles Guide-Verhalten:
- Der gestrichelte Guide-Kreis wird nur waehrend des aktiven Zeichnens gerendert.
- Vor Spielstart bleibt der Canvas-Guide unsichtbar; stattdessen zeigt `CmDraw.vue` das Intro-SVG.

### useRoundLifecycle

Aufgabe:

- Rundenzustand und Punkteliste halten
- Timeout und Tick-Timer steuern
- Pointer-Capture setzen/loesen
- Richtungswechsel erkennen und Runde abbrechen
- Runde starten/bewegen/beenden/resetten
- Rueckkehr auf den Start-Screen via `resetToStartScreen()`

### useCircleScoring

Aufgabe:

- reine Bewertungs- und Geometrie-Logik
- Fehlerlabels als i18n-Funktionen exportieren
- Score-Label-Mapping via `getLabel(score)`

Wichtige Exporte:

- calculateLiveScore
- getStrokeCompletionMetrics
- getLabel
- ERROR_LABEL_INVALID_FORM
- ERROR_LABEL_CLOSURE
- ERROR_LABEL_DIRECTION
- ERROR_LABEL_TIMEOUT

### useHighscores

Aufgabe:

- Scores laden (API, sonst LocalStorage)
- erfolgreiche Runden speichern
- lokalen Modus markieren
- zuletzt gespeicherten Score fuer Ranking-Hinweis bereitstellen

Wichtige Eigenschaften:

- anonym (kein playerName)
- Duplikat-Schutz: gleicher Score wird nicht erneut gespeichert
- latestSavedScore wird bei Dupes trotzdem gesetzt, damit Ranking-Hinweis weiter funktioniert

## Start-Screen, Intro und App-Reset

### Start-Screen (index.vue + CmDraw.vue)

- Solange `hasStarted == false`, zeigt `index.vue` die Sprachbuttons links unten.
- `CmDraw.vue` zeigt gleichzeitig ein zentriertes `intro-circle.svg` und den Start-CTA.
- Im Hintergrund laeuft eine Demo-Kreis-Loop aus drei festen Beispielpfaden.
- Die Demo-Loop wird in `useCircleGame.ts` erzeugt und ueber denselben Stroke-Renderer wie echte User-Striche gezeichnet.
- Der gestrichelte Guide-Kreis ist auf dem Start-Screen unsichtbar und erscheint erst waehrend des aktiven Zeichnens.

### App-Reset (default.vue + index.vue)

- Klick auf Logo-Button in `default.vue`: `appResetSignal` wird erhoeht und anschliessend nach `/` navigiert.
- `index.vue` beobachtet `appResetSignal` und ruft `resetToStartScreen()` auf.
- `resetToStartScreen()` setzt den Spielzustand auf Vor-Start zurueck, leert Ergebnis-/Tooltip-/Highscore-Zwischenzustand und startet wieder den Intro-Zustand.
- Ergebnis: App kehrt auf den Start-Screen mit Sprachbuttons, Intro-SVG und Demo-Kreis-Loop zurueck.

### Inaktivitaets-Reset

- In `app/constants/game.ts` ist `INACTIVITY_TIMEOUT_MS` zentral definiert.
- `index.vue` startet bei `hasStarted == true` einen Inaktivitaets-Timer.
- Aktivitaet (`pointerdown`, `pointermove`, `keydown`, `wheel`, `touchstart`) startet den Timer neu.
- Nach Ablauf wird dieselbe `resetToStartScreen()`-Logik verwendet wie beim Logo-Klick.

## Tooltip-Info (index.vue)

- Wird angezeigt wenn: `hasResult && !showErrorLabel && result?.label && !isTooltipDismissed`
- `isTooltipDismissed`: ref, wird bei neuem Ergebnis (`watch(result)`) auf `false` zurueckgesetzt
- `dismissTooltip()`: setzt `isTooltipDismissed = true`

## Ablauf einer Runde

### 1. Intro / Vor Start

- `CmDraw.vue` zeigt den Intro-Zustand.
- `useCircleGame.ts` zeichnet eine Demo-Loop mit festen Beispielkreisen.
- Der Canvas-Guide bleibt unsichtbar.

### 2. Start

CmDraw emittiert `start-round`. `useRoundLifecycle.startRound()` legt den ersten Punkt an, setzt Pointer-Capture, startet Timer/Timeout und triggert `redraw()`.

### 3. Bewegung

CmDraw emittiert `move-round`. `useRoundLifecycle.moveRound()` fuegt Punkte hinzu und prueft Richtungswechsel.
Bei Gegenrichtung wird die Runde mit Fehlerlabel sofort beendet.

### 4. Ende

CmDraw emittiert `end-round`. `useRoundLifecycle.endRound()` stoppt Timer/Timeout und ruft `evaluateRound` (aus `useCircleGame`) auf.

### 5. Persistenz

`index.vue` speichert erfolgreiche Runden automatisch (ohne Eingabe).
Fehlerrunden werden nicht gespeichert.

### 6. Reset

Beim normalen Neustart werden sowohl Runde als auch `latestSavedScore` zurueckgesetzt.

Fuer Rueckkehr zum Start-Screen:
- `resetToStartScreen()` setzt `hasStarted` wieder auf `false`.
- Dadurch erscheinen Intro-SVG, Sprachbuttons und Demo-Kreis-Loop erneut.

## Scoring-Logik (aktuell)

### Aktive Regler in useCircleGame

- ROUND_TIMEOUT_MS = 8000
- GUIDE_RADIUS_FACTOR = 0.45
- GUIDE_FADE_OUT_MS = 900
- INTRO_PREVIEW_DRAW_MS = 1750
- INTRO_PREVIEW_HOLD_MS = 500
- INTRO_PREVIEW_TOTAL_POINTS = 220
- INTRO_PREVIEW_STROKE_WIDTH_SCALE = 1.45
- SCORE_WEIGHT_CLOSURE = 0.1
- FINAL_CLOSURE_ERROR_THRESHOLD = 0.1
- DIRECTION_MIN_SEGMENT = 1
- DIRECTION_MIN_ANGLE_DELTA = 0.02
- DIRECTION_MIN_ANGLE_DELTA_FLOOR = 0.0012
- DIRECTION_MIN_ANGLE_DELTA_RATIO = 0.35
- DIRECTION_MIN_CENTER_DISTANCE_FACTOR = 0.12
- DIRECTION_OPPOSITE_STREAK_TO_ABORT = 1
- ENABLE_SCORE_DEBUG = import.meta.dev

Weitere zentrale Konstante:
- `INACTIVITY_TIMEOUT_MS` in `app/constants/game.ts`

### Live-Score

`calculateLiveScore()` kombiniert:

1. `radiusFitError` (Abweichung vom Zielradius)
2. `radialError` (Streuung)
3. `closureError` (Start-/Endabstand), gewichtet mit `coverageProgress`

Ergebnis ist ein nichtlinear rueckgerechneter Prozentwert (0-100), der waehrend des Zeichnens live angezeigt wird.

### Harte Fehlerfaelle

Aktiv sind vier harte Fehlerfaelle:

1. Richtungswechsel  
   Sofortiger Abbruch im Lifecycle, Label aus `ERROR_LABEL_DIRECTION()`.

2. Timeout  
   Sofortiger Abbruch im Lifecycle, Label aus `ERROR_LABEL_TIMEOUT()`.

3. Offener Kreis  
   In `createRoundResult()`: `closureError > 0.1` fuehrt zu `score = 0` und `ERROR_LABEL_CLOSURE()`.

4. Nicht auswertbare Kreisform  
   Wenn Metrics oder Live-Score nicht berechenbar sind, `score = 0` und `ERROR_LABEL_INVALID_FORM()`.

## i18n-Status

Das Projekt nutzt kein externes i18n-Modul.
Texte liegen in:

- app/locales/de.ts
- app/locales/en.ts

`useLocale.ts` liefert:

- locale
- setLocale(locale)
- t(path, params)

Fehler- und Score-Labels in `useCircleScoring` greifen ebenfalls auf `t()` zu.

## Highscore-Backend

Serverseitig werden Highscores als anonymes Array aus `score`/`createdAt` verwaltet:

- server/utils/highscores.ts

Eigenschaften:

- keine Namen
- Sortierung absteigend nach Score
- Begrenzung auf Top 100
- persistenter Speicherpfad ueber Runtime-Config (`highscoreFilePath`)

## Wo kuenftige Aenderungen hingehoeren

### UI und Darstellung

- app/components/CmDraw.vue
- app/components/CmHighscore.vue
- app/components/CmConfettiRain.vue
- app/pages/index.vue

### Rundenfluss, Pointer, Timer, Intro-Loop

- app/composables/useRoundLifecycle.ts
- app/composables/useCircleGame.ts
- app/composables/useCanvasRenderer.ts

### Mathematische Bewertung

- app/composables/useCircleScoring.ts
- app/composables/useCircleGame.ts (Ergebnisabbildung und Schwellwerte)

### Speicherung / Ranking

- app/composables/useHighscores.ts
- server/api/*.ts
- server/utils/highscores.ts

### Mehrsprachigkeit

- app/locales/*.ts
- app/composables/useLocale.ts

## Pflegehinweis

Bei Aenderungen an Intro-Verhalten, Reset-Logik, Fehlerlabels, Scoring-Regeln, Speicherlogik oder Datenmodell diese Datei zeitnah mitziehen.
