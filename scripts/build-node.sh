#!/bin/bash

# Load environment variables from .env file
set -a
source .env
set +a

# Check if environment argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <environment>"
  echo "Example: $0 development"
  exit 1
fi

# Force set the ENV variable to the provided environment
export ENV=$1
export DEPLOYMENT_BUILD=true

# Build the project as Node server (not static)
npm install
npm run build

echo "Node server build with $ENV environment completed."
