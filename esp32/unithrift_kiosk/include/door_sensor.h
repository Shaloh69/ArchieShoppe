#pragma once
#include <Arduino.h>
#include "config.h"

static const int DOOR_PINS[6] = {
  DOOR_S01, DOOR_S02, DOOR_S03, DOOR_S04, DOOR_S05, DOOR_S06
};

// Previous door states to detect transitions
static bool prevDoorOpen[6] = {false, false, false, false, false, false};

inline void doorSensorInit() {
  for (int i = 0; i < 6; i++) {
    pinMode(DOOR_PINS[i], INPUT_PULLUP);
    // Read initial state (HIGH = open)
    prevDoorOpen[i] = (digitalRead(DOOR_PINS[i]) == HIGH);
  }
}

// Returns true if the door for slotIndex is currently open
inline bool isDoorOpen(int slotIndex) {
  if (slotIndex < 0 || slotIndex > 5) return false;
  return (digitalRead(DOOR_PINS[slotIndex]) == HIGH);
}

// Check for state transitions; calls onDoorChange(slotId, isOpen) on change
template<typename Callback>
void pollDoorSensors(Callback onDoorChange) {
  for (int i = 0; i < 6; i++) {
    bool open = isDoorOpen(i);
    if (open != prevDoorOpen[i]) {
      prevDoorOpen[i] = open;
      onDoorChange(SLOT_IDS[i], open);
    }
  }
}
