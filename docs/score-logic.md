# Circle Game: Architektur, Verdrahtung und Score-Logik

Stand: 23.04.2026

## Zweck dieser Datei

Diese Datei dokumentiert den aktuellen Ist-Zustand von Spielablauf, Scoring und Highscore-Speicherung.
Sie ist auf den aktuellen Code in app/composables, app/components, app/pages und server/utils abgestimmt.

## Aktuelle Gesamtstruktur

### Layout

- app/layouts/default.vue
  App-Shell: Viewport-Scaling (nur dev), Logo-Button mit App-Reset, Header, Footer-Nav

### Komponenten

- app/components/CmDraw.vue
  Canvas, Intro (nur nach Language-Gate), Live-Score, Timer, Ergebnislabel, Highscore-Hinweis
- app/components/CmHighscore.vue
  Top-3-Visualisierung, Liste, Ranking-Hinweis
- app/components/CmConfettiRain.vue
  Konfetti bei erfolgreicher Runde

Hinweis: CmSave.vue existiert nicht mehr. Speichern erfolgt automatisch und anonym.

### Composables

- app/composables/useCircleGame.ts
  Oberflaeche fuer das komplette Zeichenspiel, Verdrahtung von Rendering, Lifecycle und Scoring
- app/composables/useCanvasRenderer.ts
  Canvas-Refs, Sizing, Redraw, Pointer-Koordinaten
- app/composables/useRoundLifecycle.ts
  Rundenzustand, Timer, Pointer-Flow, Richtungswechsel-Abbruch
- app/composables/useCircleScoring.ts
  Score- und Geometrie-Logik inkl. i18n-Label-Funktionen
- app/composables/useStrokeRenderer.ts
  Visuelles Renderverhalten des Strichs
- app/composables/useHighscores.ts
  Laden/Speichern der Highscores inkl. API-First und LocalStorage-Fallback
- app/composables/useLocale.ts
  Leichtgewichtiges i18n (de/en, t(path, params))

### Page

- app/pages/index.vue
  Orchestrierung von Spielablauf, Language Gate, Tooltip-Info, Highscore-Sidebar und Locale.
  Enthält: Language Gate (Tap-to-start + Sprachauswahl), Tooltip-Info mit Dismiss-Logik,
  automatisches Speichern erfolgreicher Runden, isNewHighscore-Ermittlung, showErrorLabel-Berechnung.

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
  -> hasTouchedGate (useState, geteilt mit index.vue)
  -> resetApp() setzt hasTouchedGate = false, navigiert zu "/"

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
- Viewport-Scaling (CSS-Transform auf 1920×1080-Basis, nur im Dev-Modus aktiv)
- Logo als Button: resetApp() setzt hasTouchedGate (useState) auf false und navigiert zu "/"
- Header wird nur gezeigt, wenn hasTouchedGate == true oder Admin-Route

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
- result

scoreDisplayText-Verhalten:
- Kein Start: leerer String
- hasStarted, kein Ergebnis, nicht am Zeichnen: "0%" (z.B. nach Restart)
- Am Zeichnen: Live-Score aus calculateLiveScore(), Fallback "0%" wenn null
- Ergebnis vorhanden: "XX.X%"

Interne Aufgabe: createRoundResult(), Redraw-Verdrahtung, Timer-Konfiguration und Scoring-Einbindung.

### useCanvasRenderer

Aufgabe:

- Canvas-Refs verwalten
- Canvas-Groesse und DPR beruecksichtigen
- Hintergrund und Guide rendern
- Stroke rendern
- Pointer in Canvas-Koordinaten umrechnen

### useRoundLifecycle

Aufgabe:

- Rundenzustand und Punkteliste halten
- Timeout und Tick-Timer steuern
- Pointer-Capture setzen/loesen
- Richtungswechsel erkennen und Runde abbrechen
- Runde starten/bewegen/beenden/resetten

### useCircleScoring

Aufgabe:

- reine Bewertungs- und Geometrie-Logik
- Fehlerlabels als i18n-Funktionen exportieren
- Score-Label-Mapping via getLabel(score)

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

## Language Gate und App-Reset

### Language Gate (index.vue)

- showLanguageGate: lokal in index.vue, initial true
- hasTouchedGate: useState (geteilt mit default.vue), initial false
- Ablauf: Tap → hasTouchedGate = true (zeigt Sprachbuttons) → Sprache wählen → showLanguageGate = false
- Nach Sprachauswahl: CmDraw zeigt Intro (showIntro-Prop), Language Gate verschwindet

### App-Reset (default.vue + index.vue)

- Klick auf Logo-Button in default.vue: hasTouchedGate = false
- watch(hasTouchedGate) in index.vue reagiert: showLanguageGate = true, resetGameRound(), resetLatestSavedScore()
- Ergebnis: App kehrt zu "Tap to start" zurück, Spielzustand komplett geleert

## Tooltip-Info (index.vue)

- Wird angezeigt wenn: hasResult && !showErrorLabel && result?.label && !isTooltipDismissed
- isTooltipDismissed: ref, wird bei neuem Ergebnis (watch result) auf false zurückgesetzt
- dismissTooltip(): setzt isTooltipDismissed = true
- Einganganimation mit transition-delay: 780ms (scale), animation-delay: 1060ms (header/body)

## Ablauf einer Runde

### 1. Start

CmDraw emittiert start-round. useRoundLifecycle.startRound() legt den ersten Punkt an, setzt Pointer-Capture, startet Timer/Timeout und triggert redraw().

### 2. Bewegung

CmDraw emittiert move-round. useRoundLifecycle.moveRound() fuegt Punkte hinzu und prueft Richtungswechsel.
Bei Gegenrichtung wird die Runde mit Fehlerlabel sofort beendet.

### 3. Ende

CmDraw emittiert end-round. useRoundLifecycle.endRound() stoppt Timer/Timeout und ruft evaluateRound (aus useCircleGame) auf.

### 4. Persistenz

index.vue speichert erfolgreiche Runden automatisch (ohne Eingabe).
Fehlerrunden werden nicht gespeichert.

### 5. Reset

Beim Neustart werden sowohl Runde als auch latestSavedScore zurueckgesetzt.

## Scoring-Logik (aktuell)

### Aktive Regler in useCircleGame

- ROUND_TIMEOUT_MS = 8000
- GUIDE_RADIUS_FACTOR = 0.45
- GUIDE_FADE_OUT_MS = 900
- SCORE_WEIGHT_CLOSURE = 0.1
- FINAL_CLOSURE_ERROR_THRESHOLD = 0.1
- DIRECTION_MIN_SEGMENT = 1
- DIRECTION_MIN_ANGLE_DELTA = 0.02
- DIRECTION_MIN_ANGLE_DELTA_FLOOR = 0.0012
- DIRECTION_MIN_ANGLE_DELTA_RATIO = 0.35
- DIRECTION_MIN_CENTER_DISTANCE_FACTOR = 0.12
- DIRECTION_OPPOSITE_STREAK_TO_ABORT = 1
- ENABLE_SCORE_DEBUG = import.meta.dev

### Live-Score

calculateLiveScore() kombiniert:

1. radiusFitError (Abweichung vom Zielradius)
2. radialError (Streuung)
3. closureError (Start-/Endabstand), gewichtet mit coverageProgress

Ergebnis ist ein nichtlinear rueckgerechneter Prozentwert (0-100), der waehrend des Zeichnens live angezeigt wird.

### Harte Fehlerfaelle

Aktiv sind vier harte Fehlerfaelle:

1. Richtungswechsel
  Sofortiger Abbruch im Lifecycle, Label aus ERROR_LABEL_DIRECTION().

2. Timeout
  Sofortiger Abbruch im Lifecycle, Label aus ERROR_LABEL_TIMEOUT().

3. Offener Kreis
  In createRoundResult(): closureError > 0.1 fuehrt zu score = 0 und ERROR_LABEL_CLOSURE().

4. Nicht auswertbare Kreisform
  Wenn Metrics oder Live-Score nicht berechenbar sind, score = 0 und ERROR_LABEL_INVALID_FORM().

## i18n-Status

Das Projekt nutzt kein externes i18n-Modul.
Texte liegen in:

- app/locales/de.ts
- app/locales/en.ts

useLocale.ts liefert:

- locale
- setLocale(locale)
- t(path, params)

Fehler- und Score-Labels in useCircleScoring greifen ebenfalls auf t() zu.

## Highscore-Backend

Serverseitig werden Highscores als anonymes Array aus score/createdAt verwaltet:

- server/utils/highscores.ts

Eigenschaften:

- keine Namen
- Sortierung absteigend nach Score
- Begrenzung auf Top 100
- persistenter Speicherpfad ueber Runtime-Config (highscoreFilePath)

## Wo kuenftige Aenderungen hingehoeren

### UI und Darstellung

- app/components/CmDraw.vue
- app/components/CmHighscore.vue
- app/components/CmConfettiRain.vue

### Rundenfluss, Pointer, Timer

- app/composables/useRoundLifecycle.ts

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

Bei Aenderungen an Fehlerlabels, Scoring-Regeln, Speicherlogik oder Datenmodell diese Datei zeitnah mitziehen.
