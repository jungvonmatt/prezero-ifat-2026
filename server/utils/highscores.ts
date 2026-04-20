import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export interface HighscoreEntry {
  name: string
  score: number
  createdAt: string
}

function getDataFilePath() {
  const config = useRuntimeConfig()
  const configuredPath = config.highscoreFilePath || 'content/highscores.json'
  return resolve(process.cwd(), configuredPath)
}

interface HighscoreFile {
  entries: HighscoreEntry[]
}

async function ensureDataFile() {
  const dataFilePath = getDataFilePath()
  await mkdir(dirname(dataFilePath), { recursive: true })

  try {
    await readFile(dataFilePath, 'utf8')
  } catch {
    await writeFile(dataFilePath, JSON.stringify({ entries: [] }, null, 2), 'utf8')
  }
}

export async function readHighscores() {
  const dataFilePath = getDataFilePath()
  await ensureDataFile()
  const raw = await readFile(dataFilePath, 'utf8')

  try {
    const parsed = JSON.parse(raw) as HighscoreFile
    if (!parsed || !Array.isArray(parsed.entries)) {
      return []
    }

    return parsed.entries
      .filter((entry) => {
        return typeof entry?.name === 'string' && typeof entry?.score === 'number' && typeof entry?.createdAt === 'string'
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  } catch {
    return []
  }
}

export async function addHighscore(input: { name?: string, score?: number }) {
  const dataFilePath = getDataFilePath()
  const safeName = (input.name || 'Anonymous').trim().slice(0, 24) || 'Anonymous'
  const safeScore = Number.isFinite(input.score) ? Math.min(100, Math.max(0, Number(input.score))) : 0

  const nextEntry: HighscoreEntry = {
    name: safeName,
    score: Math.round(safeScore * 100) / 100,
    createdAt: new Date().toISOString()
  }

  const current = await readHighscores()
  const updated = [...current, nextEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  await writeFile(dataFilePath, JSON.stringify({ entries: updated }, null, 2), 'utf8')
  return updated
}

export async function setHighscores(entries: HighscoreEntry[]) {
  const dataFilePath = getDataFilePath()
  const updated = entries
    .filter((entry) => {
      return typeof entry?.name === 'string' && typeof entry?.score === 'number' && typeof entry?.createdAt === 'string'
    })
    .map((entry) => {
      const safeName = entry.name.trim().slice(0, 24) || 'Anonymous'
      const safeScore = Math.min(100, Math.max(0, Number(entry.score)))
      return {
        name: safeName,
        score: Math.round(safeScore * 100) / 100,
        createdAt: entry.createdAt
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  await writeFile(dataFilePath, JSON.stringify({ entries: updated }, null, 2), 'utf8')
  return updated
}

export async function clearHighscores() {
  return setHighscores([])
}

export async function deleteHighscore(createdAt: string) {
  const dataFilePath = getDataFilePath()
  const current = await readHighscores()
  const updated = current.filter((entry) => entry.createdAt !== createdAt)
  await writeFile(dataFilePath, JSON.stringify({ entries: updated }, null, 2), 'utf8')
  return updated
}
