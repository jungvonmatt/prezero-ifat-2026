---
title: How this app works
description: Rules and scoring basics for Create The Perfect Circle
---

# How this app works

This project recreates the core mechanic of the original challenge:

1. You draw one circle around a visual guide.
2. The app compares your stroke against an ideal circle.
3. You get a precision score in percent.
4. You can save your result to the local highscore table.

## Scoring details

The score combines two quality checks:

- **Radial consistency**: how evenly your stroke keeps the same distance from its own center.
- **Closure quality**: how close your end point is to your start point.

A lower combined error produces a higher score.

## Highscore storage

Scores are saved to `content/highscores.json` in this project.
Nuxt Content reads this file as local content data, so the highscore stays on the same device.

## Event operation notes

For booth or event usage:

1. Run the app on one dedicated machine.
2. Keep the process running while players are using the station.
3. Export a JSON backup of highscores regularly.
4. Import a backup to restore the table if needed.
5. Reset highscores before starting a new competition.
