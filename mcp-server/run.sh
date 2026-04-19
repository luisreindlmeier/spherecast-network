#!/bin/bash
set -e
cd /Users/luisreindlmeier/Desktop/spherecast
exec node /Users/luisreindlmeier/Desktop/spherecast/mcp-server/dist/index.js "$@" 2>&1
