#pragma once
#include <Arduino.h>
#include <ArduinoWebsockets.h>
#include <WiFiClientSecure.h>
#include "config.h"
#include "led_status.h"

using namespace websockets;

WebsocketsClient wsClient;
bool wsConnected = false;

// Forward declaration — implemented in main.cpp
void onWsMessage(WebsocketsMessage msg);

inline void wsInit() {
  wsClient.onMessage([](WebsocketsMessage msg) {
    onWsMessage(msg);
  });

  wsClient.onEvent([](WebsocketsEvent event, String data) {
    if (event == WebsocketsEvent::ConnectionOpened) {
      wsConnected = true;
      ledSetState(LED_BLINK_2);  // WiFi + server connected
      Serial.println("[ws] Connected to server");
    } else if (event == WebsocketsEvent::ConnectionClosed) {
      wsConnected = false;
      ledSetState(LED_SOLID_ON); // lost server — solid on
      Serial.println("[ws] Disconnected");
    } else if (event == WebsocketsEvent::GotPing) {
      wsClient.pong();
    }
  });
}

inline bool wsConnect() {
#if WS_USE_SSL
  // Skip certificate verification — ESP32 has no CA root store.
  // Connection is still TLS-encrypted; only cert identity check is skipped.
  wsClient.setInsecure();

  // Port 443 is the default for wss:// — do NOT include it in the URL.
  // ArduinoWebsockets 0.5.x URL parser misbehaves with explicit :443.
  String url = String("wss://") + WS_HOST + WS_PATH;
  Serial.printf("[ws] Connecting to %s\n", url.c_str());

  bool ok = wsClient.connect(url);
  if (!ok) Serial.println("[ws] connect() returned false");
  return ok;
#else
  String url = String("ws://") + WS_HOST + ":" + WS_PORT + WS_PATH;
  Serial.printf("[ws] Connecting to %s\n", url.c_str());
  return wsClient.connect(WS_HOST, WS_PORT, WS_PATH);
#endif
}

inline void wsSend(const String& json) {
  if (wsConnected) {
    ledTriggerActivity(); // 3-blink burst on every outbound message
    wsClient.send(json);
  }
}

inline void wsPoll() {
  wsClient.poll();
}
