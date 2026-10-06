#!/usr/bin/env bash
# Native render check on the iOS simulator.
#
# `npm run smoke` runs on react-native-web, where there are no worklets to
# serialize and no native modules, so it structurally cannot catch errors like
# "Cannot copy value of type `PanGesture`". This opens the app in Expo Go on a
# simulator and reads the dev server's own log for client-side errors.
#
# The dev server log is the signal, NOT pixel colour. An earlier version looked
# for "lots of red in the top quarter" and would have failed on the iOS home
# screen wallpaper.
#
# Requires `npx expo start` already running, with its output redirected to a
# file passed as LOG (or $2).
#
# Usage:
#   npx expo start > /tmp/expo.log 2>&1 &
#   LOG=/tmp/expo.log npm run smoke:ios            # home route
#   LOG=/tmp/expo.log npm run smoke:ios onboarding # a specific route
set -uo pipefail

DEVICE="${DEVICE:-iPhone 15}"
ROUTE="${1:-}"   # e.g. onboarding
LOG="${LOG:-}"
OUT="${SMOKE_OUT:-/tmp/mizan-smoke}"
mkdir -p "$OUT"

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
URL="exp://${IP}:8081"
# Expo Go deep-links into a route with the /--/ prefix
[ -n "$ROUTE" ] && URL="exp://${IP}:8081/--/${ROUTE}"

if ! curl -s --max-time 4 http://localhost:8081/status | grep -q running; then
  echo "dev server is not running on :8081 — start it with 'npx expo start' first"
  exit 2
fi

xcrun simctl boot "$DEVICE" 2>/dev/null
xcrun simctl bootstatus "$DEVICE" -b >/dev/null 2>&1

if ! xcrun simctl listapps booted 2>/dev/null | grep -q host.exp.Exponent; then
  echo "Expo Go is not installed on '$DEVICE'. Run 'npx expo start --ios' once."
  exit 2
fi

MARK=0
[ -n "$LOG" ] && [ -f "$LOG" ] && MARK=$(wc -l < "$LOG")

echo "opening $URL on $DEVICE"
xcrun simctl openurl booted "$URL" >/dev/null 2>&1
sleep 25   # bundle + mount

SHOT="$OUT/sim${ROUTE:+-$ROUTE}.png"
xcrun simctl io booted screenshot "$SHOT" >/dev/null 2>&1 &&
  echo "screenshot: $SHOT"

if [ -z "$LOG" ] || [ ! -f "$LOG" ]; then
  echo "no LOG given — screenshot saved, but errors could not be checked"
  exit 0
fi

# Anything the client reported since we opened the app.
FOUND=$(tail -n "+$((MARK + 1))" "$LOG" \
  | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' \
  | grep -iE "^ *(ERROR|Error:|Unhandled|Invariant|\[Worklets\])" \
  | grep -viE "source map|Require cycle" \
  | head -8)

if [ -n "$FOUND" ]; then
  echo "FAIL  client reported errors:"
  echo "$FOUND" | sed 's/^/      /'
  exit 1
fi

echo "ok    no client errors after mount"
