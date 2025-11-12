#!/bin/bash

# This script calls the API endpoint to fix groups with missing colors
# You need to be authenticated as an Owner to run this

echo "Calling API to fix groups with missing colors..."
curl -X POST http://localhost:5000/api/smart-groups/fix-colors \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt

echo ""
echo "Done!"
