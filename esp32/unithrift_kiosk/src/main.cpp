/*
  UniThrift Kiosk — ESP32 Firmware
  Device: Kiosk-1 (hardcoded)

  WiFi Provisioning:
    First boot / credential reset → ESP32 opens AP "UniThrift-Kiosk-Setup" (pw: kiosk1234).
    Connect with phone/laptop → captive portal opens automatically → enter your WiFi.
    Credentials saved to NVS, device reboots and connects normally.
    To reset: hold BOOT button (GPIO 0) while powering on for >3 s.

  WebSocket paths:
    /ws/esp?deviceId=Kiosk-1

  Outbound messages (ESP → Server):
    { "type": "DOOR_STATE",    "slotId": "S-01", "doorState": "OPEN"|"CLOSED" }
    { "type": "HEARTBEAT" }
    { "type": "STATUS_REPORT", "slots": [...] }

  Inbound messages (Server → ESP):
    { "type": "UNLOCK_SLOT",   "slotId": "S-01" }
    { "type": "LOCK_SLOT",     "slotId": "S-01" }
    { "type": "REBOOT" }
    { "type": "HEARTBEAT_ACK" }
    { "type": "CODE_ACCEPTED", "slotId": "S-01" }
    { "type": "CODE_REJECTED", "slotId": "S-01" }
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <ArduinoJson.h>
#include "config.h"
#include "led_status.h"
#include "relay_control.h"
#include "door_sensor.h"
#include "ws_client.h"

// ─── Timers ───────────────────────────────────────────────────────────────────
static unsigned long lastHeartbeat = 0;
static unsigned long lastReconnect  = 0;

// ─── WiFi provisioning ────────────────────────────────────────────────────────
//
// Stability notes (ESP32-specific):
//   - Use blocking autoConnect() — non-blocking mode has known watchdog issues
//     on ESP32 dual-core because WiFiManager's process() loop uses yield()
//     which does NOT reset the TWDT; delay(1) inside autoConnect() does.
//   - Set a portal timeout so the device never hangs indefinitely.
//   - If the saved network disappears the portal re-opens automatically after
//     PROV_CONNECT_TIMEOUT_S seconds.

static void provisioningCallback(WiFiManager* wm) {
  // Called when the config portal is launched — good place to light an LED
  Serial.printf("[wifi] Portal open — connect to AP \"%s\" (pw: %s)\n",
                PROV_AP_SSID, PROV_AP_PASSWORD);
  Serial.println("[wifi] Open http://192.168.4.1 to configure (captive portal auto-opens)");
}

static void wifiConnect() {
  // ── Credential-reset check ─────────────────────────────────────────────────
  // Hold BOOT button (GPIO 0) LOW at power-on for more than 3 s → erase NVS
  // and restart into portal.  The button is INPUT_PULLUP so idle = HIGH.
  pinMode(PROV_RESET_PIN, INPUT_PULLUP);
  delay(100); // debounce
  if (digitalRead(PROV_RESET_PIN) == LOW) {
    unsigned long held = millis();
    Serial.println("[wifi] BOOT button held — release within 3 s to cancel reset...");
    while (digitalRead(PROV_RESET_PIN) == LOW) {
      delay(50);
      if (millis() - held > 3000) {
        WiFiManager wm;
        wm.resetSettings();
        Serial.println("[wifi] Credentials erased — restarting into portal");
        delay(500);
        ESP.restart();
      }
    }
    Serial.println("[wifi] Reset cancelled");
  }

  // ── WiFiManager setup ──────────────────────────────────────────────────────
  WiFiManager wm;

  // Register portal-open callback (for serial feedback / LED)
  wm.setAPCallback(provisioningCallback);

  // How long to attempt connecting to the saved network before opening portal
  wm.setConnectTimeout(PROV_CONNECT_TIMEOUT_S);

  // How long the portal stays open before the device reboots and retries.
  // Prevents indefinite blocking — critical for unattended kiosk hardware.
  wm.setConfigPortalTimeout(PROV_PORTAL_TIMEOUT_S);

  // Disable debug output to keep serial clean (remove in dev if needed)
  wm.setDebugOutput(false);

  // autoConnect():
  //   1. Tries the saved network (NVS).
  //   2. If no saved creds or connection fails within setConnectTimeout →
  //      starts AP + HTTP captive portal.
  //   3. Returns true once connected, false if portal timed out.
  bool connected = wm.autoConnect(PROV_AP_SSID, PROV_AP_PASSWORD);

  if (!connected) {
    // Portal timed out with no credentials entered.
    // Restart and try again — this prevents the device hanging in AP mode
    // indefinitely when no one is around to provision it.
    Serial.println("[wifi] Portal timeout — restarting");
    delay(500);
    ESP.restart();
  }

  Serial.printf("[wifi] Connected — IP: %s  SSID: %s\n",
                WiFi.localIP().toString().c_str(),
                WiFi.SSID().c_str());
}

// ─── Status report ────────────────────────────────────────────────────────────
static void sendStatusReport() {
  JsonDocument doc;
  doc["type"]     = "STATUS_REPORT";
  doc["deviceId"] = DEVICE_ID;
  JsonArray slots = doc["slots"].to<JsonArray>();
  for (int i = 0; i < 6; i++) {
    JsonObject s = slots.add<JsonObject>();
    s["slotId"]   = SLOT_IDS[i];
    s["doorOpen"] = isDoorOpen(i);
  }
  String out;
  serializeJson(doc, out);
  wsSend(out);
}

// ─── Handle incoming WebSocket messages ──────────────────────────────────────
void onWsMessage(websockets::WebsocketsMessage msg) {
  JsonDocument doc;
  if (deserializeJson(doc, msg.data()) != DeserializationError::Ok) return;

  const char* type = doc["type"] | "";

  ledTriggerActivity(); // 3-blink burst on every inbound command

  if (strcmp(type, "UNLOCK_SLOT") == 0) {
    String slotId = doc["slotId"] | "";
    Serial.printf("[cmd] UNLOCK_SLOT %s\n", slotId.c_str());
    relayUnlock(slotId);
  } else if (strcmp(type, "LOCK_SLOT") == 0) {
    String slotId = doc["slotId"] | "";
    Serial.printf("[cmd] LOCK_SLOT %s\n", slotId.c_str());
    relayLock(slotId);
  } else if (strcmp(type, "REBOOT") == 0) {
    Serial.println("[cmd] REBOOT");
    delay(500);
    ESP.restart();
  } else if (strcmp(type, "HEARTBEAT_ACK") == 0) {
    // acknowledged — nothing needed
  } else {
    Serial.printf("[ws] Unknown type: %s\n", type);
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[boot] UniThrift Kiosk starting...");

  ledInit();        // solid on — no WiFi yet
  relayInit();
  doorSensorInit();

  // Provision / connect to WiFi (blocks until connected or reboots on timeout)
  wifiConnect();

  wsInit();

  Serial.println("[boot] Connecting to WebSocket server...");
  if (wsConnect()) {
    Serial.println("[boot] WebSocket connected");
    sendStatusReport();
  } else {
    Serial.println("[boot] WebSocket connect failed — will retry in loop");
  }
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  ledUpdate(); // advance LED state machine — must be first

  // Keep WebSocket alive
  if (wsConnected) {
    wsPoll();
  } else {
    unsigned long now = millis();
    if (now - lastReconnect >= WS_RECONNECT_DELAY_MS) {
      lastReconnect = now;
      Serial.println("[ws] Reconnecting...");
      if (wsConnect()) {
        sendStatusReport();
      }
    }
  }

  // Poll door sensors and emit state-change events
  pollDoorSensors([](const char* slotId, bool isOpen) {
    JsonDocument doc;
    doc["type"]      = "DOOR_STATE";
    doc["slotId"]    = slotId;
    doc["doorState"] = isOpen ? "OPEN" : "CLOSED";
    String out;
    serializeJson(doc, out);
    Serial.printf("[door] %s -> %s\n", slotId, isOpen ? "OPEN" : "CLOSED");
    wsSend(out);
  });

  // Heartbeat
  unsigned long now = millis();
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    JsonDocument doc;
    doc["type"] = "HEARTBEAT";
    String out;
    serializeJson(doc, out);
    wsSend(out);
  }

  delay(20); // yield — also feeds the TWDT idle task on ESP32 Arduino
}
