import { addHighscore } from '../utils/highscores';
import { createError, defineEventHandler, readBody } from 'h3';

interface HighscorePayload {
  score?: number;
}

export default defineEventHandler(async event => {
  const body = await readBody<HighscorePayload>(event);

  if (!body || typeof body.score !== 'number') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid score payload',
    });
  }

  return addHighscore(body);
});
