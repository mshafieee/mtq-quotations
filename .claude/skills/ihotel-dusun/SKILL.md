---
name: ihotel-dusun
description: >
  Use this skill whenever you are working on Dusun DSGW-030 hardware,
  a Zigbee gateway adapter for iHotel, an iHotel room gateway integration,
  or any DSGW-030 / Dusun gateway commissioning or ThingsBoard wiring.
  Triggers on: "Dusun", "DSGW-030", "iHotel room gateway",
  "Zigbee gateway adapter", "dusun adapter", "ihotel dusun".
---

# iHotel × Dusun DSGW-030 Skill

This skill is the authoritative reference for integrating the Dusun DSGW-030
Zigbee gateway into the iHotel multitenant platform. It covers hardware
commissioning, adapter implementation, ThingsBoard wiring, and troubleshooting.

## Repo facts (verified 2026-06-07, branch `ihotel-refactor`)

| Item | Value |
|------|-------|
| Adapter base class | `server/adapters/platform-adapter.js` → `PlatformAdapter` |
| Adapter registry | `server/adapters/index.js` → `AdapterPool.getAdapter(hotelId, db)` |
| Existing adapters | `TBAdapter` (ThingsBoard REST+WS), `GreentechAdapter` (GRMS REST) |
| Valid platform types | `['thingsboard', 'greentech']` in `platform.js` — add `'dusun'` |
| DB creds columns | `tb_host`, `tb_user`, `tb_pass`, `iot_host`, `iot_user`, `iot_pass`, `platform_type` |
| Device naming | `gateway-room-{roomNumber}` — Dusun adapter MUST match this |
| Telemetry keys | See §Telemetry contract below |
| Control methods | `setLines`, `setAC`, `setCurtainsBlinds`, `setDoorUnlock`, `setDoorLock`, `setService`, `setRoomStatus` |

## PlatformAdapter interface (every adapter must implement)

```js
class DusunAdapter extends PlatformAdapter {
  // Called before any API request; refresh creds if stale
  async authenticate()                         // → void

  // Sync, cheap, used by health checks
  isAuthenticated()                            // → boolean

  // List all room gateway devices for this hotel
  async listDevices()                          // → [{ id, name, roomNumber }]

  // Return latest telemetry for every room in one call
  async getAllDeviceStates()                   // → { [deviceId]: StateObject }

  // Return latest telemetry for one device
  async getDeviceState(deviceId)              // → StateObject

  // Write shared attributes to a device (used for relay control)
  async sendAttributes(deviceId, attrs)        // → void

  // Send an RPC/downlink command and await acknowledgement
  async sendCommand(deviceId, cmd)             // → { payload }

  // Subscribe to real-time telemetry stream (WebSocket or MQTT)
  async subscribe(deviceId, callback)          // → unsubscribe fn | null

  // Sync health summary for /api/platform/health
  getHealth()                                  // → { ok, latencyMs, ... }
}
```

### StateObject shape (must match existing TB adapter output)

```js
{
  roomStatus:           0|1|2,     // 0=vacant, 1=occupied, 2=dirty
  temperature:          Number,    // °C
  humidity:             Number,    // %RH
  co2:                  Number,    // ppm
  pirMotionStatus:      Boolean,
  doorStatus:           Boolean,   // true=open
  doorLockBattery:      Number,    // %
  doorContactsBattery:  Number,
  airQualityBattery:    Number,
  waterMeterBattery:    Number,
  relay1..relay8:       Boolean,
  doorUnlock:           Boolean,
  elecConsumption:      Number,
  waterConsumption:     Number,
  online:               Boolean,   // true if any key present
}
```

## Where to add the Dusun adapter

1. **Create** `server/adapters/dusun-adapter.js` — see §Adapter skeleton.
2. **Register** in `server/adapters/index.js` alongside `TBAdapter` and `GreentechAdapter`.
3. **Add** `'dusun'` to `VALID_PLATFORMS` array in `server/platform.js`.
4. **Extend** `hotel-provision.service.js` with a `dusun` provisioning branch
   (mirrors the `greentech` branch; needs `tb_host`, `tb_user`, `tb_pass`
   since the Dusun adapter still uses ThingsBoard as its cloud backend).

## Adapter skeleton

```js
// server/adapters/dusun-adapter.js
'use strict';
const { PlatformAdapter } = require('./platform-adapter');
const { TBAdapter }        = require('./tb-adapter');

/**
 * Dusun DSGW-030 adapter — thin wrapper over TBAdapter.
 *
 * The DSGW-030 publishes Zigbee sensor data into ThingsBoard as a
 * TB Gateway device (v1/gateway/telemetry).  iHotel reads telemetry
 * and writes commands through the standard ThingsBoard REST + WebSocket
 * API, so DusunAdapter reuses TBAdapter's transport layer verbatim.
 *
 * The only Dusun-specific work is:
 *  - Mapping Dusun JSON attribute names → iHotel telemetry keys (done in
 *    the ThingsBoard uplink converter, not in this file).
 *  - Sending downlink commands in the Dusun JSON format via TB shared
 *    attributes or server-side RPC so the DSGW-030 acts on them.
 */
class DusunAdapter extends TBAdapter {
  constructor(config) {
    super(config);
    this._type = 'dusun';
  }

  // Override sendCommand to emit Dusun downlink JSON format.
  // TB delivers this to the gateway via server-side RPC → MQTT.
  async sendCommand(deviceId, cmd) {
    // Translate iHotel command → Dusun downlink payload
    const dusunPayload = _toDownlink(cmd);
    return super.sendCommand(deviceId, dusunPayload);
  }
}

// Map iHotel control commands to Dusun downlink JSON
function _toDownlink(cmd) {
  const { method, params } = cmd;
  switch (method) {
    case 'setLines':
      // relay1..8 map to Dusun "endpoint" switches
      return { method: 'setAttribute',
               params: Object.fromEntries(
                 Object.entries(params).map(([k, v]) =>
                   [k, { value: v ? 1 : 0 }])) };
    case 'setAC':
      return { method: 'setAttribute',
               params: { acMode: { value: params.acMode },
                         acTemperatureSet: { value: params.acTemperatureSet },
                         fanSpeed: { value: params.fanSpeed } } };
    case 'setDoorUnlock':
      return { method: 'setAttribute',
               params: { doorUnlock: { value: 1 } } };
    case 'setDoorLock':
      return { method: 'setAttribute',
               params: { doorUnlock: { value: 0 } } };
    default:
      return cmd; // pass-through for unrecognised commands
  }
}

module.exports = { DusunAdapter };
```

## Adapter registration patch

```js
// server/adapters/index.js  — add to existing PLATFORM_MAP / switch

const { DusunAdapter } = require('./dusun-adapter');

// inside getAdapter():
case 'dusun':
  instance = new DusunAdapter({
    host:  hotel.tb_host,
    user:  hotel.tb_user,
    pass:  hotel.tb_pass,
  });
  break;
```

## Telemetry contract

The ThingsBoard uplink converter (see `reference/thingsboard.md`) must
normalize Dusun attribute names to the iHotel keys above.  Key mappings:

| Dusun JSON field | iHotel telemetry key |
|------------------|----------------------|
| `Temperature`    | `temperature` |
| `Humidity`       | `humidity` |
| `CO2`            | `co2` |
| `PIRstatus` / `occupancy` | `pirMotionStatus` |
| `DoorStatus`     | `doorStatus` |
| `Switch_1`…`Switch_8` | `relay1`…`relay8` |
| `BatteryPercentage` (per device type) | `doorLockBattery` etc. |
| `electricMeter`  | `elecConsumption` |
| `waterMeter`     | `waterConsumption` |

## Commissioning checklist

See `reference/hardware.md` for physical setup and `reference/mqtt-config.md`
for LuCI MQTT configuration.  ThingsBoard provisioning is in
`reference/thingsboard.md`.

## Troubleshooting quick-reference

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Red LED on (steady) | MQTT broker unreachable | Check LuCI → MQTT broker IP/port; firewall |
| Yellow LED not flashing after pairing | Zigbee module not responding | Factory reset + re-pair |
| Gateway appears in TB but child devices missing | Uplink converter not running | Check Integration → Debug; check converter logs |
| `getAllDeviceStates` returns empty | TB device names don't match `gateway-room-*` | Verify device names in TB provisioning step |
| Commands ignored by gateway | Dusun downlink JSON malformed | Use `scripts/decode-dusun.js` to inspect; check `mosquitto_sub` output |
| `sendCommand` times out | TB RPC timeout | Increase TB RPC timeout; check DSGW-030 is online |

For deeper diagnostics run `scripts/capture-mqtt.sh` on the local broker.
