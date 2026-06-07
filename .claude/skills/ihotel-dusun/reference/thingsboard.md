# ThingsBoard Integration Patterns for DSGW-030

Two integration paths are documented here. Use **Path A** immediately (no
firmware changes). Graduate to **Path B** when productizing.

---

## Path A — No firmware work (now)

```
DSGW-030 ──MQTT──► Local Mosquitto ──bridge──► ThingsBoard MQTT Integration
                                                        │
                                              JS Uplink Converter
                                                        │
                                         TB "device" per child sensor
                                         (named by EUI + room map)
```

### How it works

1. DSGW-030 publishes Dusun JSON to Mosquitto on topic `dusun/{room}/up`.
2. Mosquitto bridges the topic to ThingsBoard's built-in MQTT broker OR the
   ThingsBoard MQTT Integration polls/subscribes to Mosquitto directly.
3. The **uplink converter** (JS) runs inside ThingsBoard, parses the Dusun
   payload, derives the device name, and emits telemetry.
4. iHotel server's `DusunAdapter` (which extends `TBAdapter`) reads telemetry
   via ThingsBoard REST API and subscribes to WebSocket for real-time updates.

### Uplink converter template (ThingsBoard JS)

```js
// Name: dusun-uplink
// Paste into ThingsBoard → Integrations → <your MQTT integration> → Uplink converter
// ThingsBoard version: 3.5+ (CE/PE)

var payload = decodeToJson(payload);  // TB built-in helper
var topic   = metadata.topic;         // e.g. "dusun/101/up"

// Extract room number from topic
var roomMatch = topic.match(/dusun\/(\w+)\/up/);
var room      = roomMatch ? roomMatch[1] : 'unknown';

var result = { deviceName: '', deviceType: 'dusun-sensor', telemetry: [], attributes: [] };

// Helper: pick telemetry from a single Dusun device object
function parseDusunDevice(dev, roomNum) {
  var d    = dev.data || dev;
  var mac  = (dev.mac || '').replace(/^0x/, '').toUpperCase();
  var type = dev.type || 'unknown';
  var ts   = dev.ts   || metadata.ts;
  var kv   = {};

  switch (type) {
    case 'temperature_humidity':
      kv.temperature = d.Temperature;
      kv.humidity    = d.Humidity;
      kv.airQualityBattery = d.BatteryPercentage;
      break;
    case 'door_sensor':
      kv.doorStatus           = d.DoorStatus === 1;
      kv.doorContactsBattery  = d.BatteryPercentage;
      break;
    case 'pir_sensor':
      kv.pirMotionStatus = d.PIRstatus === 1;
      break;
    case 'smart_plug':
    case 'relay':
      for (var i = 1; i <= 8; i++) {
        if (d['Switch_' + i] !== undefined) kv['relay' + i] = d['Switch_' + i] === 1;
      }
      if (d.electricMeter !== undefined) kv.elecConsumption = d.electricMeter;
      break;
    case 'co2_sensor':
      kv.co2         = d.CO2;
      kv.temperature = d.Temperature;
      kv.humidity    = d.Humidity;
      break;
    case 'door_lock':
      kv.doorUnlock        = d.LockStatus === 0;  // 0=locked, 1=open
      kv.doorLockBattery   = d.BatteryPercentage;
      break;
    case 'water_meter':
      kv.waterConsumption  = d.waterMeter;
      kv.waterMeterBattery = d.BatteryPercentage;
      break;
  }

  return { deviceName: 'gateway-room-' + roomNum, telemetry: [{ ts: ts, values: kv }] };
}

// Handle both single-device and batched payloads
if (payload.devices) {
  // Batched format
  payload.devices.forEach(function(dev) {
    var parsed = parseDusunDevice(dev, room);
    result.deviceName = parsed.deviceName;
    result.telemetry  = result.telemetry.concat(parsed.telemetry);
  });
} else if (payload.mac) {
  // Single-device format
  var parsed = parseDusunDevice(payload, room);
  result.deviceName = parsed.deviceName;
  result.telemetry  = parsed.telemetry;
} else {
  // Unknown — pass raw as attributes for debugging
  result.deviceName = 'gateway-room-' + room;
  result.attributes = [{ key: 'raw_payload', value: JSON.stringify(payload) }];
}

return result;
```

> **Key rule**: `deviceName` must be `gateway-room-{roomNumber}` to match the
> existing iHotel device naming convention enforced by `TBAdapter.listDevices()`.

### Downlink converter template

```js
// Name: dusun-downlink
var data   = msg;
var topic  = 'dusun/' + metadata.roomNumber + '/down';
var result = { contentType: 'JSON', data: JSON.stringify(data), metadata: { topic: topic } };
return result;
```

---

## Path B — Productization (SDK / custom firmware)

```
DSGW-030 (custom app using librbsdk.a)
    │
    │  publishes:  v1/gateway/telemetry
    │  subscribes: v1/gateway/attributes/response
    │              v1/gateway/rpc/request/+
    │
    ▼
ThingsBoard MQTT (device access token as MQTT username)
    │
    ▼
TB Gateway device: "gateway-room-101"
    └── child devices auto-provisioned by TB Gateway API
         e.g. "Room-101-TempHumidity", "Room-101-DoorSensor", …
```

### ThingsBoard Gateway API format

The custom firmware must publish to:

```
Topic:    v1/gateway/telemetry
Username: <device-access-token-of-gateway-room-N>
Password: (empty)
```

Payload format (TB Gateway API):

```json
{
  "Room-101-TempHumidity": [
    { "ts": 1717776000000, "values": { "temperature": 22.5, "humidity": 58.3 } }
  ],
  "Room-101-DoorSensor": [
    { "ts": 1717776000000, "values": { "doorStatus": false } }
  ]
}
```

ThingsBoard automatically:
- Creates child devices named by the keys in this JSON.
- Routes telemetry to each child device's time-series.
- Appears in the TB UI as a Gateway with managed devices beneath it.

> **Do NOT** publish to `v1/devices/me/telemetry`. That is the individual
> device API; the stock DSGW-030 app does not use it and the TB Gateway API
> is the correct pattern for a device that manages multiple child sensors.

### iHotel mapping with Path B

In Path B the `DusunAdapter` reads telemetry from the **child devices** in
ThingsBoard rather than the gateway device itself.  Child device naming should
follow the convention the uplink converter uses, e.g.
`Room-{N}-{SensorType}`, but the adapter must aggregate them back under
`gateway-room-{N}` for the rest of iHotel to remain unchanged.

Recommended approach: override `getAllDeviceStates()` in `DusunAdapter` to
query each `gateway-room-N` TB device and fetch telemetry from its children.

---

## ThingsBoard device provisioning

### Step 1 — Create TB Gateway device profile

In ThingsBoard → Device Profiles → New:
- Name: `dusun-gateway`
- Transport: MQTT
- Device telemetry topic: `v1/gateway/telemetry`  *(Path B)*
- Default telemetry topic: `v1/devices/me/telemetry`  *(Path A fallback)*

### Step 2 — Provision one gateway device per room

```python
# Extend deploy/hotel-setup/hotel_setup.py or use tb-provision.service.js

device = {
    "name":          f"gateway-room-{room_number}",
    "type":          "DEFAULT",
    "transportType": "MQTT",
    "description":   "iHotel Dusun DSGW-030 Room Gateway",
    "profileData": {
        "configuration": { "type": "DEFAULT" },
        "transportConfiguration": {
            "type": "MQTT",
            "deviceTelemetryTopic": "v1/devices/me/telemetry",  # Path A
        }
    }
}
```

Save the access token for each device. Flash/configure the DSGW-030 with that
token as its MQTT username (LuCI → MQTT → Username field).

### Step 3 — Create MQTT Integration (Path A only)

In ThingsBoard → Integrations → Add:
- Type: MQTT
- Host: `<mosquitto-ip>`
- Port: 1883
- Topic filter: `dusun/+/up`
- Uplink converter: `dusun-uplink` (paste template from §Path A above)
- Downlink converter: `dusun-downlink`

### gateway_tokens.csv (iHotel convention)

The existing iHotel provisioning tools write a `gateway_tokens.csv` with
columns `name,device_id,token,room,floor,type`. Follow this format for Dusun:

```csv
name,device_id,token,room,floor,type
gateway-room-101,<tb-uuid>,<access-token>,101,1,dusun
gateway-room-102,<tb-uuid>,<access-token>,102,1,dusun
```

---

## Multitenancy

Each hotel's ThingsBoard tenant is separate. The `DusunAdapter` is instantiated
per hotel by `AdapterPool.getAdapter(hotelId, db)` using the hotel's
`tb_host`, `tb_user`, `tb_pass` credentials (same columns used by `TBAdapter`).
No shared state between hotels.

MQTT Integration instances in ThingsBoard are per-tenant — create one per hotel
(or per hotel cluster if they share a Mosquitto broker with namespaced topics).
