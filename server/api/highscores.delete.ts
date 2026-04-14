import { clearHighscores } from '../utils/highscores'

export default defineEventHandler(async () => {
  return clearHighscores()
})
