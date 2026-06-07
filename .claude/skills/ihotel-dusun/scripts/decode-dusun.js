#!/usr/bin/env node
// decode-dusun.js — Parse a Dusun MQTT payload and print iHotel-normalised telemetry.
//
// Usage:
//   # From a raw JSON string:
//   echo '{"mac":"0x00158D0001A2B3C4","type":"temperature_humidity","data":{"Temperature":22.5,"Humidity":58.3,"BatteryPercentage":87},"ts":1717776000000}' | node decode-dusun.js
//
//   # From a capture file (JSONL format from capture-mqtt.sh):
//   cat dusun-capture.jsonl | node decode-dusun.js
//
//   # Pass a room number override (useful when testing without a real topic):
//   ROOM=101 echo '...' | node decode-dusun.js

'use strict';

const readline = require('readline');

const ROOM_OVERRIDE = process.env.ROOM || null;

// Map Dusun device types → iHotel telemetry key normaliser
const TYPE_MAP = {
  temperature_humidity: (d) => ({
    temperature:        num(d.Temperature),
    humidity:           num(d.Humidity),
    airQualityBattery:  num(d.BatteryPercentage),
  }),
  door_sensor: (d) => ({
    doorStatus:           bool1(d.DoorStatus),
    doorContactsBattery:  num(d.BatteryPercentage),
  }),
  pir_sensor: (d) => ({
    pirMotionStatus: bool1(d.PIRstatus),
  }),
  smart_plug: relayMapper,
  relay:      relayMapper,
  co2_sensor: (d) => ({
    co2:         num(d.CO2),
    temperature: num(d.Temperature),
    humidity:    num(d.Humidity),
  }),
  door_lock: (d) => ({
    doorUnlock:      d.LockStatus === 1 ? true : false,
    doorLockBattery: num(d.BatteryPercentage),
  }),
  water_meter: (d) => ({
    waterConsumption:  num(d.waterMeter),
    waterMeterBattery: num(d.BatteryPercentage),
  }),
  air_quality: (d) => ({
    co2:               num(d.CO2),
    airQualityBattery: num(d.BatteryPercentage),
  }),
};

function num(v)   { return v !== undefined ? Number(v) : null; }
function bool1(v) { return v === 1 || v === true; }

function relayMapper(d) {
  const out = {};
  for (let i = 1; i <= 8; i++) {
    if (d[`Switch_${i}`] !== undefined) out[`relay${i}`] = bool1(d[`Switch_${i}`]);
  }
  if (d.electricMeter !== undefined) out.elecConsumption = num(d.electricMeter);
  return out;
}

function normaliseSingle(dev, roomNum) {
  const data   = dev.data || dev;
  const type   = dev.type || 'unknown';
  const mac    = (dev.mac || '').replace(/^0x/i, '').toUpperCase();
  const ts     = dev.ts   || Date.now();
  const mapper = TYPE_MAP[type];
  const values = mapper ? mapper(data) : { _raw: data };

  return {
    deviceName: `gateway-room-${roomNum}`,
    mac,
    type,
    ts: new Date(ts).toISOString(),
    telemetry: values,
  };
}

function decodeLine(line) {
  let raw;
  try {
    raw = JSON.parse(line);
  } catch {
    // Might be wrapped JSONL from capture-mqtt.sh
    try {
      const outer = JSON.parse(line);
      raw = outer.payload;
    } catch {
      console.error('Skipping unparseable line:', line.slice(0, 80));
      return;
    }
  }

  // If wrapped in JSONL envelope from capture-mqtt.sh
  const payload = raw.payload !== undefined ? raw.payload : raw;
  const topic   = raw.topic   || '';
  const roomMatch = topic.match(/dusun\/(\w+)\/up/);
  const room    = ROOM_OVERRIDE || (roomMatch ? roomMatch[1] : 'unknown');

  const results = [];

  if (payload.devices) {
    // Batched format
    for (const dev of payload.devices) {
      results.push(normaliseSingle(dev, room));
    }
  } else if (payload.mac) {
    // Single-device format
    results.push(normaliseSingle(payload, room));
  } else {
    console.error('Unrecognised payload shape:', JSON.stringify(payload).slice(0, 120));
    return;
  }

  for (const r of results) {
    console.log(JSON.stringify(r, null, 2));
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (trimmed) decodeLine(trimmed);
});
rl.on('close', () => { /* done */ });
