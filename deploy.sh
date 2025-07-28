#!/bin/bash

# Build the project
echo "Building the project..."
npm run build

# Create a simple deployment using npx serve for now
echo "Starting deployment server..."
npx serve -s build -l 5000