import { deleteHighscore } from '../../utils/highscores'

interface DeletePayload {
  createdAt?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<DeletePayload>(event)

  if (!body || typeof body.createdAt !== 'string' || !body.createdAt.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing createdAt for deletion'
    })
  }

  return deleteHighscore(body.createdAt)
})
