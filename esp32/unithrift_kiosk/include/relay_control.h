#pragma once
#include <Arduino.h>
#include "config.h"

// Maps slot string "S-01"..."S-06" to relay GPIO
static const int RELAY_PINS[6] = {
  RELAY_S01, RELAY_S02, RELAY_S03, RELAY_S04, RELAY_S05, RELAY_S06
};

static const char* SLOT_IDS[6] = {
  "S-01", "S-02", "S-03", "S-04", "S-05", "S-06"
};

inline int slotToIndex(const String& slotId) {
  for (int i = 0; i < 6; i++) {
    if (slotId == SLOT_IDS[i]) return i;
  }
  return -1;
}

inline void relayInit() {
  for (int i = 0; i < 6; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], HIGH); // HIGH = relay off (active-LOW module)
  }
}

// Pulse relay: energise for RELAY_UNLOCK_MS then de-energise
inline void relayUnlock(const String& slotId) {
  int idx = slotToIndex(slotId);
  if (idx < 0) return;
  digitalWrite(RELAY_PINS[idx], LOW);  // energise
  delay(RELAY_UNLOCK_MS);
  digitalWrite(RELAY_PINS[idx], HIGH); // de-energise
}

inline void relayLock(const String& slotId) {
  int idx = slotToIndex(slotId);
  if (idx < 0) return;
  digitalWrite(RELAY_PINS[idx], HIGH);
}

inline void relayUnlockAll() {
  for (int i = 0; i < 6; i++) {
    digitalWrite(RELAY_PINS[i], LOW);
  }
  delay(RELAY_UNLOCK_MS);
  for (int i = 0; i < 6; i++) {
    digitalWrite(RELAY_PINS[i], HIGH);
  }
}
