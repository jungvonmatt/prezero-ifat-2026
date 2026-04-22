export default {
  game: {
    intro: "Draw the\nperfect circle!",
    start: "Let's go!",
    highscore: "Highscore!",
    restart: "Restart",
  },
  errors: {
    invalidForm: "Draw a circle to get a score.",
    closure: "Close the circle!",
    direction: "Avoid direction changes!",
    timeout: "Draw faster!",
  },
  score: {
    label98: "Almost machine-perfect",
    label92: "Exceptionally round",
    label82: "Very solid circle",
    label70: "Pretty good",
    label55: "Getting there",
    label0: "Needs more practice",
  },
  highscores: {
    title: "SCORES",
    noScores: "No highscores yet.",
    localBadge: "Saved locally",
    rankTop: "You are in place {rank} of all participants.",
    rankPercent: "You are in place {rank} and thus among the best {percent}% of all participants!",
    noRanking: "No ranking.",
  },
} satisfies import("~/locales/types").LocaleMessages;
