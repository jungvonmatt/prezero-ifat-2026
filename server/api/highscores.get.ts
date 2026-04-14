import { readHighscores } from '../utils/highscores'

export default defineEventHandler(async () => {
  return readHighscores()
})
