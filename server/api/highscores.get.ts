import { readHighscores } from '../utils/highscores';
import { defineEventHandler } from 'h3';

export default defineEventHandler(async () => {
  return readHighscores();
});
