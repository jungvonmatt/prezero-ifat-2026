import { setHighscores } from '../utils/highscores'

interface ImportedEntry {
  name?: unknown
  score?: unknown
  createdAt?: unknown
}

interface HighscoreImportPayload {
  entries?: ImportedEntry[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<HighscoreImportPayload>(event)

  if (!body || !Array.isArray(body.entries)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid highscores payload'
    })
  }

  const parsedEntries = body.entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const name = typeof entry.name === 'string' ? entry.name : 'Anonymous'
      const score = typeof entry.score === 'number' ? entry.score : 0
      const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString()

      return {
        name,
        score,
        createdAt
      }
    })

  return setHighscores(parsedEntries)
})
