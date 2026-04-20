# Circle Game: Architektur, Verdrahtung und Score-Logik

Stand: 20.04.2026

## Zweck dieser Datei

Diese Datei dokumentiert die aktuelle Aufteilung des Circle-Games in Komponenten und Composables.

Wichtig: Die alte Logik lebte weitgehend in der Page. Das ist nicht mehr der Fall.
Die aktuelle Struktur ist modular aufgebaut:

1. UI in Komponenten
2. Spiellogik in Composables
3. Datenlogik in einem separaten Highscore-Composable
4. Page als duenne Orchestrierung

## Aktuelle Gesamtstruktur

### Komponenten

- app/components/CmDraw.vue
  Rendern von Canvas, Intro-Overlay, Timer-Overlay und Live-Score
- app/components/CmHighscore.vue
  Anzeige der Score-Liste
- app/components/CmSave.vue
  Eingabe und Submit fuer den Spielernamen

### Composables

- app/composables/useCircleGame.ts
  Oberflaeche fuer das komplette Zeichenspiel
- app/composables/useCanvasRenderer.ts
  Canvas-Refs, Canvas-Sizing, Redraw, Pointer-Koordinaten
- app/composables/useRoundLifecycle.ts
  Round-State, Timer, Pointer-Fluss, Richtungserkennung, Reset
- app/composables/useCircleScoring.ts
  Reine Scoring- und Geometrie-Helfer
- app/composables/useHighscores.ts
  Laden und Speichern der Highscores inkl. LocalStorage-Fallback
- app/composables/useGameSettings.ts
  Auswahl und Persistenz des Stroke-Modus
- app/composables/useStrokeProfiles.ts
  Visuelles Renderverhalten des Strichs

### Page

- app/pages/index.vue
  Verbindet CmDraw, CmHighscore und CmSave mit useCircleGame und useHighscores

## Datenfluss auf hoher Ebene

```text
index.vue
  -> useCircleGame()
    -> useCanvasRenderer()
    -> useRoundLifecycle()
    -> useCircleScoring()
    -> useGameSettings()
    -> useStrokeProfiles()

index.vue
  -> useHighscores(result)

index.vue
  -> CmDraw
  -> CmHighscore
  -> CmSave
```

## Architekturdiagramm (Mermaid)

```mermaid
flowchart TD
  IDX[index.vue]

  SUBGRAPH_UI[UI-Komponenten]
    CMD[CmDraw.vue]
    CMH[CmHighscore.vue]
    CMS[CmSave.vue]
  end

  SUBGRAPH_GAME[Spiel-Composables]
    UCG[useCircleGame.ts]
    UCR[useCanvasRenderer.ts]
    URL[useRoundLifecycle.ts]
    UCS[useCircleScoring.ts]
    UGS[useGameSettings.ts]
    USP[useStrokeProfiles.ts]
  end

  SUBGRAPH_DATA[Daten-Composable]
    UHS[useHighscores.ts]
  end

  API[/api/highscores]
  LS[(localStorage)]

  IDX --> UCG
  IDX --> UHS
  IDX --> CMD
  IDX --> CMH
  IDX --> CMS

  UCG --> UCR
  UCG --> URL
  UCG --> UCS
  UCG --> UGS
  UCG --> USP

  UHS --> API
  UHS --> LS

  UCG -. stellt Werte/Events bereit .-> IDX
  UHS -. stellt Daten/Actions bereit .-> IDX
```

## Verantwortung pro Baustein

### useCircleGame

useCircleGame ist das uebergeordnete Game-Composable.
Es versteckt die interne Verdrahtung zwischen Renderer, Round-Lifecycle und Scoring.

Es liefert nach aussen nur die Werte und Aktionen, die die Page wirklich braucht:

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

Ziel: Die Page muss nicht mehr wissen, wie Canvas, Timer und Score intern zusammenhaengen.

### useCanvasRenderer

Aufgabe:

- Canvas-Refs verwalten
- Canvas-Groesse berechnen
- DPR beruecksichtigen
- Hintergrund und Guide rendern
- Stroke rendern
- Pointer-Position in Canvas-Koordinaten umrechnen

Wichtige Inputs:

- aktuelle Punkte
- isDrawing
- roundStartAt
- selectedStrokeMode
- drawStroke aus useStrokeProfiles

Wichtige Outputs:

- setCanvasWrapEl
- setCanvasEl
- configureCanvas
- redraw
- pointFromPointer
- logicalSize

### useRoundLifecycle

Aufgabe:

- State der aktuellen Runde halten
- Timer und Timeout verwalten
- Pointer-Capture kontrollieren
- Richtungswechsel erkennen
- Runde starten, bewegen, beenden, abbrechen und resetten

Wichtige Outputs:

- points
- isDrawing
- result
- hasStarted
- roundStartAt
- roundTimeLeftMs
- startGame
- startRound
- moveRound
- endRound
- resetRound

### useCircleScoring

Aufgabe:

- reine mathematische und fachliche Logik
- keine DOM-Logik
- kein Canvas-Zugriff
- kein Vue-Lifecycle

Aktuell enthalten:

- Point
- RoundResult
- clamp
- normalizeAngleDelta
- getLabel
- calculateLiveScore

### useHighscores

Aufgabe:

- Scores laden
- Speichern ueber API versuchen
- bei Fehler auf LocalStorage umschalten
- lokalen State fuer playerName, highscores, isSaving und isLocalMode bereitstellen

Wichtige Outputs:

- highscores
- playerName
- isSaving
- isLocalMode
- saveScore

## Wie eine Runde technisch ablaeuft

### 1. Start der Runde

CmDraw emittiert bei Pointer-Down:

- start-round

index.vue reicht das an useCircleGame weiter.
Intern landet es in useRoundLifecycle.startRound().

Dort passiert:

1. Pointer wird auf Gueltigkeit geprueft
2. erster StrokePoint wird angelegt
3. isDrawing wird gesetzt
4. Pointer-Capture wird gesetzt
5. Tick-Timer startet
6. Timeout startet
7. redraw wird ausgelost

### 2. Bewegung waehrend des Zeichnens

CmDraw emittiert bei Pointer-Move:

- move-round

Intern in useRoundLifecycle.moveRound():

1. Punkt wird in Canvas-Koordinaten uebersetzt
2. Richtungswechsel wird ueber Winkel relativ zum Mittelpunkt geprueft
3. bei Gegenrichtung wird die Runde abgebrochen
4. sonst wird der neue StrokePoint gespeichert
5. redraw wird ausgelost

### 3. Ende der Runde

CmDraw emittiert bei Pointer-Up oder Pointer-Cancel:

- end-round

Intern in useRoundLifecycle.endRound():

1. Timer und Timeout stoppen
2. Pointer-Capture wird geloest
3. evaluateRound wird aufgerufen
4. das Ergebnis landet in result

### 4. Reset der Runde

Die Page ruft resetRound auf.

Dabei passiert:

1. useCircleGame.resetRound setzt die Spielrunde zurueck
2. index.vue leert zusaetzlich den playerName

## Canvas- und Render-Ablauf

Der eigentliche Zeichenablauf wird ueber useCanvasRenderer.redraw() gesteuert.

Redraw macht in Reihenfolge:

1. Canvas leeren
2. Hintergrundfarbe fuellen
3. Guide-Kreis rendern
4. Guide-Kreis beim Zeichnen ueber Zeit ausblenden
5. vorhandene Stroke-Punkte ueber drawStroke rendern

Die konkrete Optik des Strichs kommt nicht aus useCanvasRenderer, sondern aus useStrokeProfiles.

## Stroke-Modi

Die visuelle Darstellung des Strichs wird in useStrokeProfiles definiert.

Vorhandene Modi:

- fixed
- deviation
- cinematic

Die Auswahl des aktuellen Modus kommt aus useGameSettings.
Wenn sich der Modus aendert, fuehrt useCircleGame ein redraw aus.

## Score-Logik aktuell

Die aktuelle Score-Berechnung ist bewusst einfacher als die fruehere Version mit mehreren harten Fail-Regeln.

### Ergebnisstruktur

RoundResult enthaelt weiterhin diese Felder:

- score
- label
- radialError
- radiusFitError
- closureError
- directionChangeError
- timeoutError
- centerFailureError
- guideSizeFailureError
- coverageFailureError
- coverageDegrees

Hinweis:
Mehrere Felder sind aktuell als Teil des Ergebnisformats erhalten, werden in der aktuellen vereinfachten Score-Berechnung aber nicht aktiv differenziert befuellt.

### Aktive Regler in useCircleGame

- ROUND_TIMEOUT_MS = 8000
- GUIDE_RADIUS_FACTOR = 0.33
- GUIDE_FADE_OUT_MS = 900
- SCORE_WEIGHT_CLOSURE = 0.1
- DIRECTION_MIN_SEGMENT = 1
- DIRECTION_MIN_ANGLE_DELTA = 0.02
- DIRECTION_MIN_ANGLE_DELTA_FLOOR = 0.0012
- DIRECTION_MIN_ANGLE_DELTA_RATIO = 0.35
- DIRECTION_MIN_CENTER_DISTANCE_FACTOR = 0.12
- DIRECTION_OPPOSITE_STREAK_TO_ABORT = 1
- ENABLE_SCORE_DEBUG = import.meta.dev

### calculateLiveScore

calculateLiveScore arbeitet aktuell mit einer motivierenden Live-Score-Logik.
Das heisst:

1. frueh moeglich einen lesbaren Zwischenwert liefern
2. saubere Trajektorien eher hoch bewerten
3. Abweichungen schrittweise abstrafen

Die aktuelle Berechnung nutzt im Kern:

1. radiusFitError
  mittlere relative Abweichung vom Zielradius

2. radialError
  Streuung der Punktabstaende

3. closureError
  Abstand zwischen erstem und letztem Punkt

4. coverageProgress
  beeinflusst das Gewicht des closureError

5. liveError
  Kombination aus radiusFitError, radialError und closureError

6. liveScore
  nichtlineare Rueckrechnung in einen Prozentwert

### Harte Fail-Regeln aktuell

Aktiv sind derzeit vor allem zwei sofortige Abbruchfaelle im Round-Lifecycle:

1. Richtungswechsel
  directionChangeError = 1

2. Timeout
  timeoutError = 1

Zusaetzlich liefert createRoundResult Score 0, wenn calculateLiveScore kein gueltiges Ergebnis liefert, zum Beispiel bei zu wenig verwertbaren Punkten.

## Wichtige Verdrahtungen zwischen den Composables

Diese Kopplungen sind zentral fuer das Verstaendnis:

### useCircleGame -> useCanvasRenderer

useCircleGame uebergibt an useCanvasRenderer:

- Zugriff auf aktuelle Punkte
- isDrawing
- roundStartAt
- selectedStrokeMode
- drawStroke

Damit weiss der Renderer, was und wie er zeichnen soll.

### useCircleGame -> useRoundLifecycle

useCircleGame uebergibt an useRoundLifecycle:

- canvasEl fuer Pointer-Capture
- pointFromPointer aus dem Renderer
- redraw aus dem Renderer
- logicalSize aus dem Renderer
- evaluateRound aus der Score-Schicht
- toStrokePoint zur Normalisierung eingehender Punkte

Damit bekommt useRoundLifecycle alle technischen Hilfsmittel, ohne selbst Canvas-Rendering oder Score-Berechnung besitzen zu muessen.

### index.vue -> useHighscores

useHighscores bekommt nur:

- result

Damit bleibt die Datenlogik vom Spiel getrennt und weiss nur, ob und was gerade gespeichert werden kann.

## Warum diese Struktur sinnvoll ist

Die Aufteilung trennt vier verschiedene Arten von Verantwortung:

1. Darstellung
  Komponenten

2. Canvas-Technik
  useCanvasRenderer

3. Rundenfluss und Interaktion
  useRoundLifecycle

4. Mathematik und Bewertung
  useCircleScoring

5. Datenhaltung und Persistenz
  useHighscores

6. Zusammenfuehrung des Spiels
  useCircleGame

Der wichtigste Vorteil:
Die Page muss die interne Verdrahtung nicht mehr komplett kennen.

## Wo kuenftige Aenderungen hingehoren

### Wenn sich die UI aendert

- CmDraw.vue
- CmHighscore.vue
- CmSave.vue

### Wenn sich der Canvas-Zeichenstil aendert

- useStrokeProfiles.ts

### Wenn sich Timer, Pointer oder Reset-Verhalten aendern

- useRoundLifecycle.ts

### Wenn sich die mathematische Bewertung aendert

- useCircleScoring.ts
- teilweise useCircleGame.ts fuer die Ergebnisabbildung

### Wenn sich Highscore-Speicherung aendert

- useHighscores.ts
- server/api/*.ts

## Empfehlung fuer weitere Pflege

Diese Architektur ist jetzt an einem guten Endzustand.

Empfehlung:

1. Keine weitere Kleinzerlegung ohne klaren Mehrwert
2. Neue Spiellogik bevorzugt in useCircleGame oder dessen Unter-Composables einbauen
3. Diese Datei aktualisieren, wenn sich Score-Regeln oder Verdrahtungen grundlegend aendern
