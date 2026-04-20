# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Node Deployment (JvM Preview)

This project contains Node deployment scripts analogous to the setup in `600331-gb-2025-digital`:

- `npm run deploy:node:development`
- `npm run deploy:node:staging`
- `npm run deploy:node:production`

### Setup

1. Copy `.env.example` to `.env` and fill in server values.
2. Ensure your SSH key file (default `deployment-ssh-key`) is available locally.
3. Run one of the deploy commands above.

Production URL target:

- `https://prezero.jvm-preview.de/`

### Highscore persistence

The Node process is started with `HIGHSCORE_FILE_PATH=data/highscores.json` to keep highscores writable and persistent on the server deployment path.
Locally (without this env var), highscores continue to use `content/highscores.json`.

## Stroke Mode Configuration

You can set a default stroke behavior via runtime config using `NUXT_PUBLIC_STROKE_MODE`.

Supported values:

- `fixed`
- `deviation`
- `cinematic` (displayed as `Realistic` in the UI)

Example:

```bash
NUXT_PUBLIC_STROKE_MODE=cinematic npm run dev
```

## Scoring Documentation

Detailed documentation for drawing, error handling, and score tuning is available in [docs/score-logic.md](docs/score-logic.md).
