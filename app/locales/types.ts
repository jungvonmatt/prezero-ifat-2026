export interface LocaleMessages {
  game: {
    intro: string;
    start: string;
    highscore: string;
    restart: string;
  };
  errors: {
    invalidForm: string;
    closure: string;
    direction: string;
    timeout: string;
    tooSmall: string;
  };
  score: {
    label100: string[];
    label90: string[];
    label80: string[];
    label70: string[];
    label60: string[];
    label50: string[];
    label40: string[];
    label30: string[];
    label20: string[];
    label10: string[];
    label0: string[];
  };
  highscores: {
    title: string;
    noScores: string;
    rankTop: string;
    rankPercent: string;
    noRanking: string;
  };
  tooltip: {
    label: string;
  };
}
