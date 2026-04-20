#!/bin/bash

# Load environment variables from .env file
set -a
source .env
set +a

set -e

# Check if environment is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <environment>"
  echo "Example: $0 development"
  exit 1
fi

ENV=$1
SSH_KEY="${DEPLOY_SSH_KEY:-deployment-ssh-key}"
SSH_PORT=${SERVER_PORT}
PM2_BIN="/usr/home/$SERVER_USER/.local/bin/pm2"

# Define remote paths and ports based on environment
if [ "$ENV" == "development" ]; then
  REMOTE_PATH="/usr/home/$SERVER_USER/app/development"
  PUBLIC_PATH="/usr/home/$SERVER_USER/public_html/development"
  PORT=${PORT_DEVELOPMENT}
  PUBLIC_URL="https://prezero-dev.jvm-preview.de/"
elif [ "$ENV" == "staging" ]; then
  REMOTE_PATH="/usr/home/$SERVER_USER/app/staging"
  PUBLIC_PATH="/usr/home/$SERVER_USER/public_html/staging"
  PORT=${PORT_STAGING}
  PUBLIC_URL="https://prezero-staging.jvm-preview.de/"
elif [ "$ENV" == "production" ]; then
  REMOTE_PATH="/usr/home/$SERVER_USER/app/production"
  PUBLIC_PATH="/usr/home/$SERVER_USER/public_html"
  PORT=${PORT_PRODUCTION}
  PUBLIC_URL="https://prezero.jvm-preview.de/"
else
  echo "Invalid environment. Use development, staging or production."
  exit 1
fi

if [ -z "$SERVER_USER" ] || [ -z "$SERVER_HOST" ] || [ -z "$SSH_PORT" ] || [ -z "$PORT" ]; then
  echo "Missing required .env variables (SERVER_USER, SERVER_HOST, SERVER_PORT, PORT_*)."
  exit 1
fi

# Node server deployment: sync full .output/ to ~/app/<env>/
echo "Deploying Node server build to $ENV ($REMOTE_PATH)..."

rsync -avz --delete \
  -e "ssh -i $SSH_KEY -p $SSH_PORT" \
  .output/ \
  $SERVER_USER@$SERVER_HOST:$REMOTE_PATH/

# Install server dependencies and restart PM2 process on the server
echo "Installing dependencies and restarting $ENV on port $PORT..."

ssh -i $SSH_KEY -p $SSH_PORT $SERVER_USER@$SERVER_HOST <<EOF
  set -e

  mkdir -p $REMOTE_PATH/data

  cd $REMOTE_PATH/server && npm install

  printf 'RewriteEngine On\n\n# Redirect everything to localhost:%s\nRewriteRule ^(.*)$ http://localhost:%s/\$1 [P,L]\n' "$PORT" "$PORT" > $PUBLIC_PATH/.htaccess

  # Stop existing process if running
  $PM2_BIN delete $ENV || true

  # Kill any zombie process on the port
  PID=\$(lsof -t -i :$PORT 2>/dev/null || true)
  if [ -n "\$PID" ]; then
    kill -9 \$PID || true
  fi

  # Start the Node server via PM2 with persistent highscore path
  HIGHSCORE_FILE_PATH=data/highscores.json PORT=$PORT $PM2_BIN start --name="$ENV" $REMOTE_PATH/server/index.mjs

  # Wait for process to come up and verify it is actually listening
  sleep 5
  LISTENING=\$(lsof -t -i :$PORT 2>/dev/null || true)
  if [ -z "\$LISTENING" ]; then
    echo "ERROR: Process did not start on port $PORT after 5s. Last PM2 logs:"
    $PM2_BIN logs $ENV --lines 30 --nostream || true
    exit 1
  fi

  echo "Process is up on port $PORT."
  $PM2_BIN save
EOF

echo "Node deployment to $ENV completed."
echo "Site available at: $PUBLIC_URL"
