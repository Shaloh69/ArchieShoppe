#pragma once
#include <Arduino.h>
#include <ArduinoWebsockets.h>
#include "config.h"

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
      Serial.println("[ws] Connected to server");
    } else if (event == WebsocketsEvent::ConnectionClosed) {
      wsConnected = false;
      Serial.println("[ws] Disconnected");
    } else if (event == WebsocketsEvent::GotPing) {
      wsClient.pong();
    }
  });
}

inline bool wsConnect() {
#if WS_USE_SSL
  // ArduinoWebsockets 0.5.x: SSL via wss:// URL scheme
  String url = String("wss://") + WS_HOST + ":" + WS_PORT + WS_PATH;
  return wsClient.connect(url);
#else
  return wsClient.connect(WS_HOST, WS_PORT, WS_PATH);
#endif
}

inline void wsSend(const String& json) {
  if (wsConnected) wsClient.send(json);
}

inline void wsPoll() {
  wsClient.poll();
}
