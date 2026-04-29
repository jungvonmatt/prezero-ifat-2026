# PreZero IFAT 2026 — Agent Instructions

## Architecture

### File Map

| File                                   | Role                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `app/layouts/default.vue`              | App shell, viewport scaling (dev only), logo reset button                      |
| `app/pages/index.vue`                  | Orchestrates game flow, highscore sidebar, fixed English copy, inactivity timer |
| `app/components/CmDraw.vue`            | Canvas, intro screen, start button, live score, timer, result label            |
| `app/components/CmHighscore.vue`       | Top-3 visualization, highscore list, ranking hint                              |
| `app/components/CmConfettiRain.vue`    | Confetti on successful round                                                   |
| `app/composables/useCircleGame.ts`     | Central game facade — wires rendering, lifecycle, scoring, intro preview       |
| `app/composables/useCanvasRenderer.ts` | Canvas refs, sizing, DPR, background/guide/stroke rendering, pointer coords    |
| `app/composables/useRoundLifecycle.ts` | Round state, timer, pointer capture, direction change detection, auto-complete |
| `app/composables/useCircleScoring.ts`  | Pure scoring and geometry logic, error labels, score label mapping             |
| `app/composables/useStrokeRenderer.ts` | Visual stroke rendering behavior                                               |
| `app/composables/useHighscores.ts`     | Load/save highscores via API with localStorage fallback                        |
| `app/composables/useMessages.ts`       | Fixed English copy lookup via `t(path, params)`                                |
| `app/constants/game.ts`                | Central game constants (including `INACTIVITY_TIMEOUT_MS`)                     |
| `server/utils/highscores.ts`           | Server-side highscore persistence (sorted, capped at top 100)                  |
| `server/api/highscores.*.ts`           | REST API handlers                                                              |

### Data Flow

```
index.vue
  -> useCircleGame()           (useCanvasRenderer, useRoundLifecycle, useCircleScoring, useStrokeRenderer)
  -> useHighscores(result)
  -> t() from useMessages
  -> CmDraw, CmHighscore, CmConfettiRain, tooltip-info (inline)

default.vue
  -> appResetSignal (useState) -> resetApp() navigates to "/"
index.vue
  -> watches appResetSignal -> calls resetToStartScreen()
```

## Key Behaviors

### Start Screen

- `hasStarted == false`: shows intro SVG and demo loop (CmDraw.vue)
- Demo loop: 3 fixed sample circle paths, drawn via the same stroke renderer as user input
- Guide circle: invisible on start screen, appears during active drawing, fades out while drawing

### Round Lifecycle

1. **Intro** — demo loop plays, guide invisible
2. **Start** — `CmDraw` emits `start-round` → `startRound()` adds first point, sets pointer capture, starts timer
3. **Move** — `CmDraw` emits `move-round` → `moveRound()` appends points, checks direction changes and auto-complete
4. **End** — `CmDraw` emits `end-round` → `endRound()` stops timer, calls `evaluateRound()`
5. **Save** — `index.vue` auto-saves successful rounds anonymously (no UI)
6. **Reset** — `resetRound()` resets round state; `resetToStartScreen()` also resets `hasStarted` → returns to start screen

### Auto-Complete Condition

Round ends automatically when:

```
(coverageDegrees >= AUTO_COMPLETE_COVERAGE_DEGREES_THRESHOLD && closureError <= AUTO_COMPLETE_CLOSURE_ERROR_THRESHOLD)
|| rawCoverageDegrees >= AUTO_COMPLETE_RAW_COVERAGE_DEGREES_HARD_STOP_THRESHOLD
```

### Inactivity Reset

- Defined in `app/constants/game.ts` as `INACTIVITY_TIMEOUT_MS`
- Active only when `hasStarted == true`
- Reset on: `pointerdown`, `pointermove`, `keydown`, `wheel`, `touchstart`
- On timeout: calls `resetToStartScreen()`

## Scoring

### `scoreDisplayText` (from `useCircleGame`)

- Before start: `""`
- After start, no result, not drawing: `"0%"`
- While drawing: live score from `calculateLiveScore()`, fallback `"0%"`
- Result exists: `"XX.X%"`

### Live Score (`calculateLiveScore`)

Combines: `radiusFitError`, `radialError`, `closureError` (weighted by coverage progress).
Final value: `Math.pow(1 - liveError, 2.0) * 100` (quadratic spread over 0–100).

### Hard Error Cases

| Error            | Trigger                                                                       | Label                        |
| ---------------- | ----------------------------------------------------------------------------- | ---------------------------- |
| Direction change | Detected in `moveRound()`                                                     | `ERROR_LABEL_DIRECTION()`    |
| Timeout          | Timer expires                                                                 | `ERROR_LABEL_TIMEOUT()`      |
| Open circle      | `closureError > FINAL_CLOSURE_ERROR_THRESHOLD` (0.1) in `createRoundResult()` | `ERROR_LABEL_CLOSURE()`      |
| Invalid form     | Metrics/score not calculable                                                  | `ERROR_LABEL_INVALID_FORM()` |

## Highscores

- Anonymous entries: `{ score: number, createdAt: ISO string }`
- Client-side duplicate prevention (same score not re-saved); `latestSavedScore` still set for ranking hint
- API-first, localStorage fallback on error
- Server: sorted descending, capped at top 100, path via `HIGHSCORE_FILE_PATH` env var (default: `content/highscores.json`)

### API Endpoints

| Method | Path                   | Purpose             | Body                    |
| ------ | ---------------------- | ------------------- | ----------------------- |
| GET    | `/api/highscores`      | Load all scores     | —                       |
| POST   | `/api/highscores`      | Add a score         | `{ score: number }`     |
| PUT    | `/api/highscores`      | Replace full list   | `{ entries: [...] }`    |
| DELETE | `/api/highscores`      | Clear all scores    | —                       |
| DELETE | `/api/highscores/item` | Delete single entry | `{ createdAt: string }` |

## Messages

- Fixed English copy lives in `app/composables/useMessages.ts`
- API: `t(path, params)` from `useMessages.ts`
- Score labels (`score.label0`–`score.label100`): arrays of 3 variants, rotated via `labelRotationIndex % 3`

## Tooltip Info

Shown when: `hasResult && !showErrorLabel && result?.label && !isTooltipDismissed`

- `isTooltipDismissed` resets to `false` on new result (via `watch(result)`)
- `dismissTooltip()` sets it to `true`

## Where to Make Changes

| Area                                   | Files                                                               |
| -------------------------------------- | ------------------------------------------------------------------- |
| UI and layout                          | `app/components/`, `app/pages/index.vue`                            |
| Round flow, pointer, timer, intro loop | `useRoundLifecycle.ts`, `useCircleGame.ts`, `useCanvasRenderer.ts`  |
| Scoring math                           | `useCircleScoring.ts`, `useCircleGame.ts`                           |
| Highscore storage and ranking          | `useHighscores.ts`, `server/api/*.ts`, `server/utils/highscores.ts` |
| UI copy and score labels               | `app/composables/useMessages.ts`                                    |
