#!/usr/bin/env bash
# capture-mqtt.sh — Subscribe to all Dusun uplink topics and log to file.
#
# Usage:
#   ./capture-mqtt.sh [broker-ip] [port] [output-file]
#
# Examples:
#   ./capture-mqtt.sh 192.168.1.100 1883 capture.jsonl
#   ./capture-mqtt.sh                               # uses defaults below

set -euo pipefail

BROKER="${1:-localhost}"
PORT="${2:-1883}"
OUTPUT="${3:-dusun-capture-$(date +%Y%m%dT%H%M%S).jsonl}"
TOPIC="dusun/+/up"

# Optional credentials — set env vars or pass via mosquitto_sub -u/-P
MQTT_USER="${MQTT_USER:-}"
MQTT_PASS="${MQTT_PASS:-}"

if ! command -v mosquitto_sub &>/dev/null; then
  echo "ERROR: mosquitto_sub not found. Install with:"
  echo "  apt install mosquitto-clients  (Debian/Ubuntu)"
  echo "  brew install mosquitto          (macOS)"
  exit 1
fi

AUTH_ARGS=()
[[ -n "$MQTT_USER" ]] && AUTH_ARGS+=(-u "$MQTT_USER" -P "$MQTT_PASS")

echo "Capturing topic '$TOPIC' from $BROKER:$PORT → $OUTPUT"
echo "Press Ctrl-C to stop."
echo ""

mosquitto_sub \
  -h "$BROKER" \
  -p "$PORT" \
  -t "$TOPIC" \
  -v \
  -F "%I %t %p" \
  "${AUTH_ARGS[@]}" \
  | while IFS= read -r line; do
      # Print to stdout with timestamp prefix
      echo "$line"
      # Append raw MQTT payload (JSON part after topic) to JSONL file
      # Format: { "ts": "<iso>", "topic": "<t>", "payload": <json> }
      ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      topic_field=$(echo "$line" | awk '{print $2}')
      payload_raw=$(echo "$line" | cut -d' ' -f3-)
      printf '{"ts":"%s","topic":"%s","payload":%s}\n' \
        "$ts" "$topic_field" "$payload_raw" >> "$OUTPUT" 2>/dev/null || \
        printf '{"ts":"%s","topic":"%s","payload_raw":%s}\n' \
          "$ts" "$topic_field" "$(echo "$payload_raw" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))')" >> "$OUTPUT"
  done
