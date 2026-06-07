# DSGW-030 MQTT Configuration & Payload Schema

## LuCI MQTT setup (stock firmware)

Access the gateway web UI at `http://<gateway-ip>` (default: `192.168.1.1`
on factory reset; check your DHCP leases after it joins the LAN).

Navigate to: **Services → Dusun Gateway → MQTT Settings** (path varies
slightly between firmware versions; may be under **Configuration → Cloud**).

| Field | Value | Notes |
|-------|-------|-------|
| Broker Host | `<your-mosquitto-ip>` | Local broker IP or hostname |
| Port | `1883` (plain) or `8883` (TLS) | Use 8883 + SSL toggle for production |
| Username | `dsgw-room-{N}` | Suggested convention — any string |
| Password | (set per device) | Store in iHotel hotel's `tb_pass`-equivalent |
| SSL/TLS | Off (dev) / On (prod) | If on, upload CA cert via LuCI |
| Publish topic | `t` (factory default) | Can be changed; suggest `dusun/{room}/up` |
| Subscribe topic | `t/cmd` (factory default) | Downlink topic; suggest `dusun/{room}/down` |
| Keep-alive | 60 s | Default is fine |
| QoS | 1 | At-least-once; gateway retries on disconnect |

> **Important**: The DSGW-030 is an MQTT **client**. It does NOT require the
> bundled Dusun AWS/Azure cloud plugins. Point it at any standards-compliant
> MQTT broker (Mosquitto, EMQX, ThingsBoard's built-in broker, etc.).

## Recommended topic structure for iHotel

```
dusun/<room_number>/up        # gateway → broker (telemetry)
dusun/<room_number>/down      # broker → gateway (commands)
```

Example for room 101:
```
dusun/101/up
dusun/101/down
```

Set in LuCI and configure the ThingsBoard MQTT Integration filter to match
`dusun/+/up`.

## Uplink payload (Dusun JSON format)

The stock firmware publishes a JSON object on every Zigbee attribute change.
This is **NOT** Zigbee2MQTT format.

### Single-sensor report

```json
{
  "mac":       "0x00158D0001A2B3C4",
  "type":      "temperature_humidity",
  "endpoint":  1,
  "data": {
    "Temperature":  22.5,
    "Humidity":     58.3,
    "BatteryPercentage": 87
  },
  "ts":        1717776000000
}
```

### Multi-sensor batch (some firmware versions)

```json
{
  "devices": [
    {
      "mac":  "0x00158D0001A2B3C4",
      "type": "temperature_humidity",
      "data": { "Temperature": 22.5, "Humidity": 58.3 }
    },
    {
      "mac":  "0xCC86EC000100AABB",
      "type": "door_sensor",
      "data": { "DoorStatus": 0 }
    }
  ],
  "gateway_mac": "AABBCCDDEEFF",
  "ts": 1717776000000
}
```

### Known `type` values and their `data` keys

| `type` | Key fields |
|--------|-----------|
| `temperature_humidity` | `Temperature`, `Humidity`, `BatteryPercentage` |
| `door_sensor` | `DoorStatus` (0=closed, 1=open), `BatteryPercentage` |
| `pir_sensor` | `PIRstatus` (0=clear, 1=motion), `BatteryPercentage` |
| `smart_plug` / `relay` | `Switch_1`…`Switch_N` (0/1), `electricMeter` (kWh) |
| `co2_sensor` | `CO2` (ppm), `Temperature`, `Humidity` |
| `door_lock` | `LockStatus`, `BatteryPercentage` |
| `water_meter` | `waterMeter` (L or m³ — check sensor) |
| `air_quality` | `VOC`, `PM2_5`, `CO2`, `BatteryPercentage` |

> These field names are firmware-version-dependent. Always capture a live
> sample with `scripts/capture-mqtt.sh` before writing the uplink converter.

## Downlink payload (commands to gateway)

The gateway subscribes on its downlink topic and acts on JSON commands:

```json
{
  "method":  "setAttribute",
  "mac":     "0xCC86EC000100AABB",
  "params": {
    "Switch_1": { "value": 1 }
  }
}
```

### Common downlink commands

| Action | `method` | `params` example |
|--------|----------|-----------------|
| Turn relay on/off | `setAttribute` | `{ "Switch_1": { "value": 1 } }` |
| Set AC mode | `setAttribute` | `{ "acMode": { "value": 2 }, "acTemperatureSet": { "value": 22 } }` |
| Unlock door | `setAttribute` | `{ "doorUnlock": { "value": 1 } }` |
| Permit Zigbee join | `permitJoin` | `{ "duration": 60 }` |
| Remove device | `removeDev` | `{ "mac": "0x..." }` |

> **Note**: The downlink format is device-firmware specific. For finer control
> (custom commands, pairing automation), use the `librbsdk.a` SDK described in
> `reference/sdk.md`.

## Local Mosquitto broker setup (recommended)

Run a Mosquitto instance co-located with the iHotel server or on a hotel-LAN
host reachable by all gateways.

```bash
# /etc/mosquitto/mosquitto.conf
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd

# For TLS (production)
listener 8883
cafile   /etc/mosquitto/ca.crt
certfile /etc/mosquitto/server.crt
keyfile  /etc/mosquitto/server.key
require_certificate false
```

Create credentials:
```bash
mosquitto_passwd -c /etc/mosquitto/passwd dsgw-room-101
```

Then bridge Mosquitto → ThingsBoard MQTT Integration (see `reference/thingsboard.md`).

## ThingsBoard MQTT Integration filter

In ThingsBoard, create an MQTT Integration with:

| Setting | Value |
|---------|-------|
| Topic filter | `dusun/+/up` |
| QoS | 1 |
| Uplink converter | `dusun-uplink` (see `reference/thingsboard.md`) |
| Downlink converter | `dusun-downlink` (see `reference/thingsboard.md`) |

The `+` wildcard captures any room number; the uplink converter extracts it
from the topic string.
