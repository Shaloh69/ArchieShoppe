#pragma once
#include <Arduino.h>
#include "config.h"

// ─── LED Status Indicator ─────────────────────────────────────────────────────
//
//  LED_SOLID_ON  — solid on        → no WiFi / provisioning portal open
//  LED_BLINK_2   — 2 blinks/cycle  → WiFi + WebSocket both connected (idle)
//  LED_BURST_3   — 3 fast blinks   → API command sent or received; returns to
//                                     previous state automatically when done
//
// All timing is non-blocking (millis-based). Call ledUpdate() every loop().

enum LedState : uint8_t {
  LED_SOLID_ON,
  LED_BLINK_2,
  LED_BURST_3,
};

static LedState      _ledState = LED_SOLID_ON;
static LedState      _ledPrev  = LED_SOLID_ON;
static uint8_t       _ledStep  = 0;
static unsigned long _ledTs    = 0;

inline void ledInit() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // solid on at boot — no WiFi yet
  _ledTs = millis();
}

// Switch to a new state. Calling with LED_BURST_3 remembers the current state
// so the burst can return to it when finished.
inline void ledSetState(LedState s) {
  if (s == LED_BURST_3) {
    if (_ledState != LED_BURST_3) _ledPrev = _ledState; // don't nest bursts
  } else {
    _ledPrev = s; // keep _ledPrev in sync for any future burst
  }
  _ledState = s;
  _ledStep  = 0;
  _ledTs    = millis();
}

// Trigger a 3-blink activity burst from anywhere (wsSend / onWsMessage).
inline void ledTriggerActivity() {
  ledSetState(LED_BURST_3);
}

// Must be called every loop() — advances the blink state machine.
inline void ledUpdate() {
  unsigned long now = millis();

  switch (_ledState) {

    // ── Solid on ─────────────────────────────────────────────────────────────
    case LED_SOLID_ON:
      digitalWrite(LED_PIN, HIGH);
      break;

    // ── 2-blink idle pattern ──────────────────────────────────────────────────
    // Steps: 0=ON 1=OFF 2=ON 3=OFF 4=PAUSE
    case LED_BLINK_2: {
      static const uint16_t t2[] = {150, 150, 150, 150, 1400};
      if (now - _ledTs >= t2[_ledStep]) {
        _ledTs = now;
        digitalWrite(LED_PIN, (_ledStep % 2 == 0) ? HIGH : LOW);
        _ledStep++;
        if (_ledStep >= 5) _ledStep = 0;
      }
      break;
    }

    // ── 3-burst activity pattern ──────────────────────────────────────────────
    // Steps: 0=ON 1=OFF 2=ON 3=OFF 4=ON 5=OFF → return to _ledPrev
    case LED_BURST_3: {
      static const uint16_t t3[] = {60, 60, 60, 60, 60, 60};
      if (now - _ledTs >= t3[_ledStep]) {
        _ledTs = now;
        digitalWrite(LED_PIN, (_ledStep % 2 == 0) ? HIGH : LOW);
        _ledStep++;
        if (_ledStep >= 6) {
          _ledState = _ledPrev;
          _ledStep  = 0;
          _ledTs    = millis();
        }
      }
      break;
    }
  }
}
