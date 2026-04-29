import { useRuntimeConfig } from '#imports';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export interface HighscoreEntry {
  score: number;
  createdAt: string;
}

const HIGHSCORE_LIMIT = 1000;

let writeQueue: Promise<void> = Promise.resolve();

function getDataFilePath() {
  const config = useRuntimeConfig();
  const configuredPath = config.highscoreFilePath || 'content/highscores.json';
  return resolve(process.cwd(), configuredPath);
}

interface HighscoreFile {
  entries: HighscoreEntry[];
}

function normalizeEntries(entries: HighscoreEntry[]) {
  return entries
    .filter(entry => {
      return typeof entry?.score === 'number' && typeof entry?.createdAt === 'string';
    })
    .map(entry => {
      const safeScore = Math.min(100, Math.max(0, Number(entry.score)));
      return {
        score: Math.round(safeScore * 100) / 100,
        createdAt: entry.createdAt,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, HIGHSCORE_LIMIT);
}

async function writeHighscoreFile(entries: HighscoreEntry[]) {
  const dataFilePath = getDataFilePath();
  await ensureDataFile();

  const tempPath = `${dataFilePath}.tmp`;
  const payload = JSON.stringify({ entries }, null, 2);

  await writeFile(tempPath, payload, 'utf8');
  await rename(tempPath, dataFilePath);
}

async function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const previous = writeQueue;
  let release: () => void;

  writeQueue = new Promise<void>(resolveQueue => {
    release = resolveQueue;
  });

  await previous;

  try {
    return await task();
  } finally {
    release!();
  }
}

async function ensureDataFile() {
  const dataFilePath = getDataFilePath();
  await mkdir(dirname(dataFilePath), { recursive: true });

  try {
    await readFile(dataFilePath, 'utf8');
  } catch {
    await writeFile(dataFilePath, JSON.stringify({ entries: [] }, null, 2), 'utf8');
  }
}

export async function readHighscores() {
  const dataFilePath = getDataFilePath();
  await ensureDataFile();
  const raw = await readFile(dataFilePath, 'utf8');

  try {
    const parsed = JSON.parse(raw) as HighscoreFile;
    if (!parsed || !Array.isArray(parsed.entries)) {
      return [];
    }

    return normalizeEntries(parsed.entries);
  } catch {
    return [];
  }
}

export async function addHighscore(input: { score?: number }) {
  const safeScore = Number.isFinite(input.score) ? Math.min(100, Math.max(0, Number(input.score))) : 0;

  const nextEntry: HighscoreEntry = {
    score: Math.round(safeScore * 100) / 100,
    createdAt: new Date().toISOString(),
  };

  return withWriteLock(async () => {
    const current = await readHighscores();
    const updated = normalizeEntries([...current, nextEntry]);
    await writeHighscoreFile(updated);
    return updated;
  });
}

export async function setHighscores(entries: HighscoreEntry[]) {
  return withWriteLock(async () => {
    const updated = normalizeEntries(entries);
    await writeHighscoreFile(updated);
    return updated;
  });
}

export async function clearHighscores() {
  return setHighscores([]);
}

export async function deleteHighscore(createdAt: string) {
  return withWriteLock(async () => {
    const current = await readHighscores();
    const updated = normalizeEntries(current.filter(entry => entry.createdAt !== createdAt));
    await writeHighscoreFile(updated);
    return updated;
  });
}
