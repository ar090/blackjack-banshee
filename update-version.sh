#!/bin/bash

# Get the current git commit hash (first 7 characters)
HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "dev")

# Update the VERSION constant in script.js
if [ -f "script.js" ]; then
    # Use sed to replace the VERSION constant
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS version of sed requires backup extension
        sed -i '' "s/const VERSION = '[^']*'/const VERSION = '$HASH'/" script.js
    else
        # Linux version
        sed -i "s/const VERSION = '[^']*'/const VERSION = '$HASH'/" script.js
    fi
    echo "Updated VERSION to: $HASH"
else
    echo "Error: script.js not found"
    exit 1
fi