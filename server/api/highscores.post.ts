import { addHighscore } from '../utils/highscores'

interface HighscorePayload {
  name?: string
  score?: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<HighscorePayload>(event)

  if (!body || typeof body.score !== 'number') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid score payload'
    })
  }

  return addHighscore(body)
})
