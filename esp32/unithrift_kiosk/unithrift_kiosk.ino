/*
  UniThrift Kiosk — ESP32 Firmware
  Device: Kiosk-1 (hardcoded)

  WebSocket paths:
    /ws/esp?deviceId=Kiosk-1

  Outbound messages (ESP → Server):
    { "type": "DOOR_STATE",      "slotId": "S-01", "doorState": "OPEN"|"CLOSED", "sensorIndex": 0 }
    { "type": "HEARTBEAT" }
    { "type": "STATUS_REPORT",   "slots": [...] }

  Inbound messages (Server → ESP):
    { "type": "UNLOCK_SLOT",     "slotId": "S-01" }
    { "type": "LOCK_SLOT",       "slotId": "S-01" }
    { "type": "REBOOT" }
    { "type": "HEARTBEAT_ACK" }
    { "type": "CODE_ACCEPTED",   "slotId": "S-01" }
    { "type": "CODE_REJECTED",   "slotId": "S-01" }
*/

#include <WiFi.h>
#include <ArduinoJson.h>
#include "config.h"
#include "relay_control.h"
#include "door_sensor.h"
#include "ws_client.h"

// ─── Timers ───────────────────────────────────────────────────────────────────
unsigned long lastHeartbeat = 0;
unsigned long lastReconnect  = 0;

// ─── WiFi ─────────────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[wifi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[wifi] Connected — IP: %s\n", WiFi.localIP().toString().c_str());
}

// ─── Status report ────────────────────────────────────────────────────────────
void sendStatusReport() {
  StaticJsonDocument<512> doc;
  doc["type"]     = "STATUS_REPORT";
  doc["deviceId"] = DEVICE_ID;
  JsonArray slots = doc.createNestedArray("slots");
  for (int i = 0; i < 6; i++) {
    JsonObject s = slots.createNestedObject();
    s["slotId"] = SLOT_IDS[i];
    s["doorOpen"] = isDoorOpen(i);
  }
  String out;
  serializeJson(doc, out);
  wsSend(out);
}

// ─── Handle incoming WebSocket messages ──────────────────────────────────────
void onWsMessage(websockets::WebsocketsMessage msg) {
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, msg.data()) != DeserializationError::Ok) return;

  const char* type = doc["type"] | "";

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
    Serial.printf("[ws] Unknown message type: %s\n", type);
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[boot] UniThrift Kiosk starting...");

  relayInit();
  doorSensorInit();
  connectWiFi();
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

  // Poll door sensors and send state change events
  pollDoorSensors([](const char* slotId, bool isOpen) {
    StaticJsonDocument<128> doc;
    doc["type"]        = "DOOR_STATE";
    doc["slotId"]      = slotId;
    doc["doorState"]   = isOpen ? "OPEN" : "CLOSED";
    String out;
    serializeJson(doc, out);
    Serial.printf("[door] %s -> %s\n", slotId, isOpen ? "OPEN" : "CLOSED");
    wsSend(out);
  });

  // Heartbeat
  unsigned long now = millis();
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    StaticJsonDocument<64> doc;
    doc["type"] = "HEARTBEAT";
    String out;
    serializeJson(doc, out);
    wsSend(out);
  }

  delay(20); // small yield to avoid watchdog
}
