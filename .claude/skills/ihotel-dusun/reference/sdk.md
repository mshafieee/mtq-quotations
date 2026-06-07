# Dusun Gateway SDK Reference (librbsdk.a)

Source: https://github.com/dusuniot/Dusun_Gateway_API

Use the SDK only for **Path B (productization)** when you need to write a
custom OpenWrt application that replaces or augments the stock gateway app.
You do NOT need the SDK to implement Path A (Mosquitto bridge integration).

## Components

| File | Role |
|------|------|
| `librbsdk.a` | Static library; link into your OpenWrt C application |
| `rbsdk.h` | Public header — all API declarations |
| OpenWrt UBUS | Inter-process bus used by librbsdk internally; your app calls the C API, not UBUS directly |

## Build environment

The DSGW-030 runs OpenWrt on MIPS 24KEc. Cross-compile from x86-64:

```bash
# Clone OpenWrt SDK for MT7688
git clone https://github.com/openwrt/openwrt.git
cd openwrt && git checkout v21.02.7        # or latest LTS matching device firmware

# Add Dusun package feed
echo "src-git dusun https://github.com/dusuniot/Dusun_Gateway_API.git" >> feeds.conf
./scripts/feeds update dusun
./scripts/feeds install -a -p dusun

# Configure for MT7688
make menuconfig
# Target: MediaTek Ralink MIPS → MT7688

# Build
make -j$(nproc) package/your-app/compile V=s
```

Link with: `gcc ... -lrbsdk -lubus -lubox`

## Key API functions

### Initialisation

```c
#include "rbsdk.h"

// Initialise the SDK; must be called before any other function.
// Returns 0 on success.
int rbsdk_init(void);

// Register all callback handlers (see §Callbacks below) then start the event loop.
int rbsdk_start(void);

// Clean shutdown.
void rbsdk_stop(void);
```

### Device pairing

```c
// Open a Zigbee permit-join window for `duration` seconds (max 254).
// Yellow LED blinks during window.
int rbsdk_add_dev(int duration);

// Remove a paired device by its EUI-64 MAC address string.
int rbsdk_remove_dev(const char *mac);
```

### Attribute control (downlink)

```c
// Set an attribute on a child device.
// mac: EUI-64 string e.g. "0x00158D0001A2B3C4"
// attr: Dusun attribute name e.g. "Switch_1"
// value: JSON-encoded value string e.g. "1"
int rbsdk_set_attr(const char *mac, const char *attr, const char *value);
```

### Querying state

```c
// Get current attribute value for a paired device.
// Out-param `value_buf` must be caller-allocated (suggest 256 bytes).
int rbsdk_get_attr(const char *mac, const char *attr,
                   char *value_buf, int buf_len);
```

## Callbacks

Register callbacks BEFORE calling `rbsdk_start()`.

```c
// Called when a new Zigbee device successfully pairs.
// mac:  EUI-64 string of new device
// type: device type string (e.g. "temperature_humidity")
void rpt_dev_added(const char *mac, const char *type);

// Called when a previously paired device comes online (joins the network).
void rpt_dev_online(const char *mac, int online);  // online=1 joined, 0=left

// Called on every attribute report from a child device.
// This is the primary uplink hook — publish to MQTT here.
// attr_json: full Dusun attribute JSON string for the device
void rpt_attr(const char *mac, const char *type, const char *attr_json);

// Called when a downlink command is acknowledged by the child device.
void rpt_cmd(const char *mac, const char *cmd, int status);

// Called when a device is removed (by cloud command or locally).
void rpt_dev_removed(const char *mac);
```

## Minimal custom app skeleton (Path B)

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "rbsdk.h"
#include <mosquitto.h>  // separate dep: libmosquitto

static struct mosquitto *mosq = NULL;

void rpt_attr(const char *mac, const char *type, const char *attr_json) {
    // Build ThingsBoard Gateway API payload
    // { "Room-101-<type>": [{ "ts": <ms>, "values": <parsed attr_json> }] }
    char topic[64]   = "v1/gateway/telemetry";
    char payload[1024];

    // ... parse attr_json, map to iHotel keys, build TB JSON ...

    mosquitto_publish(mosq, NULL, topic, strlen(payload), payload, 1, false);
}

void rpt_dev_added(const char *mac, const char *type) {
    printf("Paired: %s (%s)\n", mac, type);
    // Optionally publish device-connect message to TB Gateway API:
    // v1/gateway/connect → {"device": "Room-101-TempSensor"}
}

void rpt_dev_online(const char *mac, int online) {
    // Publish v1/gateway/connect or v1/gateway/disconnect
}

void rpt_cmd(const char *mac, const char *cmd, int status) {
    // RPC response to ThingsBoard:
    // v1/gateway/rpc/response/{requestId} → {"device":"...", "id":<id>, "data":{...}}
}

void rpt_dev_removed(const char *mac) { /* no-op or log */ }

int main(void) {
    int rc;

    // Init Mosquitto
    mosquitto_lib_init();
    mosq = mosquitto_new("dsgw-room-101", true, NULL);
    mosquitto_username_pw_set(mosq, "<TB_ACCESS_TOKEN>", NULL);
    mosquitto_connect(mosq, "thingsboard.host", 1883, 60);

    // Init SDK
    rc = rbsdk_init();
    if (rc != 0) { fprintf(stderr, "rbsdk_init failed: %d\n", rc); return 1; }

    rbsdk_start();  // blocks; callbacks fire on events

    mosquitto_disconnect(mosq);
    mosquitto_destroy(mosq);
    mosquitto_lib_cleanup();
    return 0;
}
```

## UBUS internals (informational)

`librbsdk.a` communicates with the Dusun Zigbee daemon (`zigbeed` or
`zbhubcore`) via OpenWrt UBUS. You don't call UBUS directly, but if the SDK
fails you can inspect:

```bash
# On the gateway over SSH
ubus list                          # list available objects
ubus call zbhub get_dev_list '{}'  # list paired Zigbee devices
ubus call zbhub permit_join '{"duration": 60}'
ubus call zbhub set_attr '{"mac":"0x00158D...","attr":"Switch_1","value":"1"}'
```

## Downlink flow (Path B — ThingsBoard RPC → gateway)

```
iHotel server
  └─► adapter.sendCommand(deviceId, cmd)
        └─► TBAdapter: POST /api/plugins/rpc/twoway/{deviceId}
              └─► ThingsBoard server-side RPC
                    └─► MQTT: v1/gateway/rpc/request/{id} → DSGW-030
                          └─► librbsdk → rbsdk_set_attr() → Zigbee device
                                └─► rpt_cmd callback
                                      └─► v1/gateway/rpc/response/{id} → TB
                                            └─► adapter.sendCommand() resolves
```

## Firmware update

The stock firmware can be updated via LuCI → System → Backup / Flash Firmware.
Upload `.bin` from Dusun's release page. After flashing, reconfigure MQTT
settings in LuCI; all paired Zigbee devices must be re-paired.
