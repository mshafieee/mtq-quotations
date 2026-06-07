# DSGW-030 Hardware Reference

## SoC & compute

| Component | Detail |
|-----------|--------|
| CPU | MediaTek MT7688 (MIPS 24KEc, 580 MHz single-core) |
| RAM | 64 MB DDR2 |
| Flash | 16 MB NOR (≈ 12–14 MB user-available after OpenWrt base) |
| OS | OpenWrt (LEDE lineage) |

## Radio modules

| Radio | Chipset | Standard | Notes |
|-------|---------|----------|-------|
| Zigbee | Silabs EFR32MG / Ember EM3588 | Zigbee 3.0 | Acts as coordinator; 20+ end-devices typical |
| BLE | Integrated (MT7688 BLE companion or separate module) | BLE 5.2 | Beacon scan / provisioning |
| Z-Wave | Optional daughter board | Z-Wave (700 series) | Not present on all SKUs — verify before ordering |
| Wi-Fi | MT7688 integrated | 802.11b/g/n 2.4 GHz | Used for WAN uplink |

## Connectivity

- **WAN/LAN**: Single RJ45 port, software-configurable as WAN or LAN (no PoE — see Power).
- **USB**: Micro-USB — power only (5 V / 1 A).
- **Button**: Recessed reset button on side/bottom.

## Power

- **Input**: Micro-USB 5 V / 1 A.
- **No PoE support**: The DSGW-030 has NO 802.3af/at PoE. For a clean in-room
  cable run, use a **passive PoE splitter** (48 V → 5 V/1 A micro-USB) per room.
  Do NOT use active PoE injectors without a matching active splitter.
- Typical idle draw: ~1.5 W.

## LED behaviour

| LED colour | State | Meaning |
|------------|-------|---------|
| Green | Solid / blinking | System healthy / boot in progress |
| Yellow | Blinking | Zigbee activity (join, pairing mode, Z-Wave events) |
| Red | **OFF** | MQTT broker connected ✓ |
| Red | **Solid ON** | MQTT broker unreachable — check network / LuCI config |

**Key insight**: Red OFF = good. The red LED is a *failure* indicator, not a
status LED.

## Boot sequence (approx.)

1. Green LED blinks → OpenWrt kernel loading (0–5 s).
2. Green solid → system services up (5–15 s).
3. Dusun gateway app starts → MQTT connection attempt.
4. Red LED extinguishes when MQTT broker handshake succeeds.
5. Yellow blinks when Zigbee coordinator is active.

## Factory reset

1. Hold the reset button for **10 seconds** while powered on.
2. Green LED will blink rapidly, then device reboots.
3. All configuration returns to factory defaults (Wi-Fi SSID, MQTT settings,
   paired Zigbee devices — all cleared).

## Zigbee pairing

- **Permit-join via LuCI web UI**: Navigate to the Zigbee settings page and
  enable "Permit Join" for 60 s.
- **Permit-join via hardware button**: Short press (< 3 s) toggles permit-join
  on supported firmware versions; yellow LED blinks rapidly during join window.
- **Maximum end-devices**: Hardware supports 50+ nodes; practical limit in a
  hotel room is 5–10 (temperature sensor, door contact, PIR, relay controller,
  lock).
- **Topology**: Star. The DSGW-030 is always the coordinator. No mesh routing
  through child devices.

## Certifications

Zigbee CSA, FCC (US), CE (EU), BQB (Bluetooth), KC (Korea), IC (Canada).

## Why one gateway per room (not per zone)

The per-room model is deliberate and non-negotiable for iHotel:

1. **Blast radius**: A single gateway failure affects one room, not an entire
   floor or wing. A shared mesh coordinator failing takes down every room on
   that segment simultaneously.
2. **Zigbee coordinator exclusivity**: Zigbee 3.0 allows only one coordinator
   per PAN. Sharing a coordinator across multiple rooms means all rooms share
   one PAN ID, one channel, and one failure domain.
3. **Provisioning simplicity**: Each gateway maps 1:1 to a ThingsBoard Gateway
   device (`gateway-room-{N}`). Room moves, renovations, and checkout clears
   are scoped to a single device with no cross-room contamination.
4. **RF isolation**: Separate coordinators allow separate Zigbee channels
   (11–26) per floor or cluster, eliminating inter-room interference and
   allowing channel reassignment without guest impact.
5. **Compliance**: Some jurisdictions require room-level isolation of control
   systems for privacy and fire-compartment reasons.

## Physical placement

- Mount near the room's main power entry or bedside console.
- Keep ≥ 0.5 m from high-power RF sources (microwave, DECT base).
- Ensure Wi-Fi signal: ≥ –70 dBm recommended for stable uplink.
