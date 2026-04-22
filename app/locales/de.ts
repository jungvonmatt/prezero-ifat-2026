export default {
  game: {
    intro: "Zeichne den\nperfekten Kreis!",
    start: "Los geht's!",
    highscore: "Highscore!",
    restart: "Neustart",
  },
  errors: {
    invalidForm: "Zeichne einen Kreis für die Bewertung.",
    closure: "Schließe den Kreis!",
    direction: "Vermeide Richtungswechsel!",
    timeout: "Zeichne schneller!",
  },
  score: {
    label98: "Fast maschinen-perfekt",
    label92: "Außergewöhnlich rund",
    label82: "Sehr guter Kreis",
    label70: "Ziemlich gut",
    label55: "Auf dem richtigen Weg",
    label0: "Mehr Übung nötig",
  },
  highscores: {
    title: "SCORES",
    noScores: "Noch keine Highscores.",
    localBadge: "Lokal gespeichert",
    rankTop: "Du befindest dich auf Platz {rank} aller Teilnehmenden.",
    rankPercent: "Du befindest dich auf Platz {rank} und somit unter den besten {percent}% aller Teilnehmenden!",
  },
} satisfies import("~/locales/types").LocaleMessages;
