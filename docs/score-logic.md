# Circle Game: Zeichen- und Error-Logik

Stand: 16.04.2026

## Warum eigene Datei statt README?

Diese Logik ist fachlich umfangreich und aendert sich oefter als Setup-Anweisungen.
Darum liegt sie in einer eigenen Markdown-Datei, damit die README uebersichtlich bleibt.

## Ueberblick

Die Runde besteht aus drei Ebenen:

1. Zeichnen und Laufzeitkontrolle (Pointer, Timer, Richtung)
2. Harte Failure-Regeln (sofort Score 0)
3. Weiche Fehlerbewertung (gewichteter Score)

Das Ergebnis wird im Typ RoundResult gespeichert.

## Ergebnisfelder (RoundResult)

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

Hinweis: guideSizeFailureError ist aktuell im Typ vorhanden, wird in der aktuellen weichen Radius-Logik nicht mehr aktiv gesetzt.

## Parameter fuer Feinjustierung

Die Konstanten stehen oben in app/pages/index.vue:

- ROUND_TIMEOUT_MS = 8000
- GUIDE_RADIUS_FACTOR = 0.33
- CENTER_ERROR_THRESHOLD = 0.9
- CENTER_OUTSIDE_STROKE_MARGIN = 1.05
- MIN_COVERAGE_DEGREES = 300

Radius-Penalty (weich):

- RADIUS_SIZE_PENALTY_RANGE = 0.55
- RADIUS_SIZE_PENALTY_EXPONENT = 1.2

Score-Gewichte:

- SCORE_WEIGHT_RADIUS_FIT = 0.45
- SCORE_WEIGHT_RADIUS_SIZE = 0.25
- SCORE_WEIGHT_RADIAL = 0.2
- SCORE_WEIGHT_CLOSURE = 0.1

Richtungswechsel-Erkennung:

- DIRECTION_MIN_SEGMENT = 1
- DIRECTION_MIN_ANGLE_DELTA = 0.02
- DIRECTION_MIN_CENTER_DISTANCE_FACTOR = 0.12
- DIRECTION_OPPOSITE_STREAK_TO_ABORT = 1

Debug:

- ENABLE_SCORE_DEBUG = import.meta.dev

## Zeichenablauf

1. startRound
- Setzt isDrawing, activePointerId, Pointer-Capture
- Startet Countdown-Anzeige und Timeout
- Initialisiert Richtungszustand

2. moveRound
- Fuegt Punkte hinzu
- Prueft Drehrichtung ueber Winkel-Delta relativ zum Guide-Mittelpunkt
- Ignoriert instabile Winkel nahe des Zentrums (Mindestabstand)
- Abbruch bei Gegenrichtung gemaess Streak-Regel

3. endRound
- Stoppt Timer
- Loest evaluateRound aus

## Harte Failure-Regeln (sofort Score 0)

1. directionChangeError
- Bei erkanntem Richtungswechsel (nach Streak-Regel)

2. timeoutError
- Wenn ROUND_TIMEOUT_MS ueberschritten wird

3. Mindestpunktzahl
- Wenn nach Filterung weniger als 25 Punkte vorliegen

4. centerFailureError
- Wird vor Coverage geprueft und priorisiert
- Fail, wenn einer der folgenden Faelle eintritt:
  - centerError > CENTER_ERROR_THRESHOLD
  - Guide-Mittelpunkt liegt ausserhalb des gezeichneten Kreises
    (centerOffset > avgRadius * CENTER_OUTSIDE_STROKE_MARGIN)

5. coverageFailureError
- Winkelabdeckung um Guide-Mittelpunkt wird integriert
- Fail bei coverageDegrees < MIN_COVERAGE_DEGREES

## Weiche Score-Berechnung

Nach den harten Fail-Pruefungen werden Teilfehler berechnet.

1. radiusFitError
- Mittlere relative Punkt-zu-Zielradius-Abweichung

2. radiusSizePenalty
- avgRadius / targetRadius = radiusRatio
- radiusRatioError = abs(radiusRatio - 1)
- radiusSizePenalty = clamp(radiusRatioError / RADIUS_SIZE_PENALTY_RANGE, 0, 1) ^ RADIUS_SIZE_PENALTY_EXPONENT

3. radialError
- Streuung der Punktabstaende um den gezeichneten Mittelpunkt

4. closureError
- Abstand zwischen Start- und Endpunkt, normiert auf targetRadius

5. combinedError
- combinedError = clamp(
  radiusFitError * SCORE_WEIGHT_RADIUS_FIT
  + radiusSizePenalty * SCORE_WEIGHT_RADIUS_SIZE
  + radialError * SCORE_WEIGHT_RADIAL
  + closureError * SCORE_WEIGHT_CLOSURE,
  0,
  1
  )

6. score
- score = clamp((1 - combinedError) * 100, 0, 100)

## Wirkung der wichtigsten Regler

Radius toleranter:

- RADIUS_SIZE_PENALTY_RANGE erhoehen
- RADIUS_SIZE_PENALTY_EXPONENT erhoehen
- SCORE_WEIGHT_RADIUS_SIZE senken

Radius strenger:

- RADIUS_SIZE_PENALTY_RANGE senken
- RADIUS_SIZE_PENALTY_EXPONENT senken
- SCORE_WEIGHT_RADIUS_SIZE erhoehen

Richtungswechsel toleranter:

- DIRECTION_MIN_SEGMENT erhoehen
- DIRECTION_MIN_ANGLE_DELTA erhoehen
- DIRECTION_MIN_CENTER_DISTANCE_FACTOR erhoehen
- DIRECTION_OPPOSITE_STREAK_TO_ABORT erhoehen

Center strenger/toleranter:

- CENTER_ERROR_THRESHOLD senken/erhoehen

Coverage strenger/toleranter:

- MIN_COVERAGE_DEGREES erhoehen/senken

## Debugging

Bei ENABLE_SCORE_DEBUG werden in der Browser-Konsole ausgegeben:

- combinedError, score
- radiusFitError, radiusRatio, radiusRatioError, radiusSizePenalty
- radialError, closureError
- coverageDegrees, centerError
- aktuelle thresholds und weights

Das ist die beste Basis fuer datengetriebenes Fine-Tuning.
