#pragma once

// ─── WiFi Provisioning ───────────────────────────────────────────────────────
// Credentials are stored in NVS by WiFiManager — no need to hardcode them.
// On first boot (or after a credential reset) the ESP32 starts a captive-portal
// AP.  Connect your phone/laptop to it, the portal opens automatically, enter
// your WiFi network and password, and the device saves them and reboots.
//
// To reset saved credentials: hold the BOOT button (GPIO 0) while powering on
// for >3 seconds — the stored network is erased and the portal re-opens.

// AP that appears when the device has no saved WiFi credentials
#define PROV_AP_SSID        "UniThrift-Kiosk-Setup"
#define PROV_AP_PASSWORD    "kiosk1234"          // min 8 chars for WPA2

// How long (seconds) the config portal stays open before the device reboots.
// 0 = never timeout (not recommended — causes indefinite block).
#define PROV_PORTAL_TIMEOUT_S   180              // 3 minutes

// How long (seconds) to wait for the saved network before falling into portal.
#define PROV_CONNECT_TIMEOUT_S  30

// GPIO held LOW at boot → erase saved credentials and open portal
#define PROV_RESET_PIN      0                    // GPIO 0 = BOOT button on most ESP32 devkits

// ─── Server ──────────────────────────────────────────────────────────────────
// Format: ws://host:port/ws/esp?deviceId=Kiosk-1
#define WS_HOST         "unithrift-api.onrender.com"
#define WS_PORT         443
#define WS_PATH         "/ws/esp?deviceId=Kiosk-1"
#define WS_USE_SSL      true   // set false for local dev (port 3001)

// ─── Device ──────────────────────────────────────────────────────────────────
#define DEVICE_ID       "Kiosk-1"

// ─── Status LED ───────────────────────────────────────────────────────────────
// GPIO 2 is the built-in blue LED on most ESP32 devkits (active-HIGH).
// Change to your board's LED pin if different.
#define LED_PIN         2

// ─── Relay GPIO pins (active-LOW, IN1-IN6 on a 6-channel relay module) ───────
// Each relay controls one locker slot solenoid/motor lock
#define RELAY_S01  4
#define RELAY_S02  5
#define RELAY_S03  16
#define RELAY_S04  17
#define RELAY_S05  18
#define RELAY_S06  19

// ─── Door sensor GPIO pins (magnetic reed switches, NC = normally-closed) ────
// LOW  = door closed (magnet present)
// HIGH = door open   (magnet removed)
#define DOOR_S01  32
#define DOOR_S02  33
#define DOOR_S03  34
#define DOOR_S04  35
#define DOOR_S05  36   // VP (input-only)
#define DOOR_S06  39   // VN (input-only)

// ─── Relay pulse duration ─────────────────────────────────────────────────────
#define RELAY_UNLOCK_MS 500   // milliseconds relay stays energised to unlock

// ─── Heartbeat interval ───────────────────────────────────────────────────────
#define HEARTBEAT_INTERVAL_MS 15000

// ─── Reconnect delay ──────────────────────────────────────────────────────────
#define WS_RECONNECT_DELAY_MS 5000
