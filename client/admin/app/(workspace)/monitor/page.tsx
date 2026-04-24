"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Tooltip } from "@heroui/tooltip";

import {
  lockersApi,
  type ApiLockerSlot,
  type WsEspHealth,
  type WsCameraStatus,
  type WsCaptureResult,
  type WsCaptureError,
} from "@/lib/api-client";
import { useAdminWs } from "@/hooks/use-ws";
import { shortDateTime } from "@/lib/unithrift-format";
import { notifyError, notifySuccess } from "@/lib/unithrift-toast";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtUptime(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtHeap(bytes: number | null): string {
  if (bytes === null) return "—";
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function rssiBar(rssi: number | null): { label: string; color: string } {
  if (rssi === null) return { label: "—", color: "text-text-4" };
  if (rssi >= -60)
    return {
      label: `${rssi} dBm (Excellent)`,
      color: "text-status-success-600",
    };
  if (rssi >= -70)
    return { label: `${rssi} dBm (Good)`, color: "text-brand-teal-600" };
  if (rssi >= -80)
    return { label: `${rssi} dBm (Fair)`, color: "text-status-warning-600" };
  return { label: `${rssi} dBm (Weak)`, color: "text-status-danger-600" };
}

function SecondsSince({ ts }: { ts: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!ts) return <span className="text-text-4">Never</span>;
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return <span>{sec}s ago</span>;
  return <span>{shortDateTime(new Date(ts).toISOString())}</span>;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface CaptureState {
  loading: boolean;
  url: string | null;
  error: string | null;
  requestId: string | null;
}

const defaultCapture = (): CaptureState => ({
  loading: false,
  url: null,
  error: null,
  requestId: null,
});

// ── Component ──────────────────────────────────────────────────────────────────

export default function MonitorPage() {
  // ── Slots ──────────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<ApiLockerSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  // ── Assignments (slotId → cameraIndex) ────────────────────────────────────
  const [assignments, setAssignments] = useState<Record<string, number | null>>(
    {},
  );
  const [savingAssign, setSavingAssign] = useState<string | null>(null);

  // ── ESP health ─────────────────────────────────────────────────────────────
  const [espHealth, setEspHealth] = useState<WsEspHealth | null>(null);

  // ── Camera server ──────────────────────────────────────────────────────────
  const [cameraStatus, setCameraStatus] = useState<WsCameraStatus | null>(null);

  // ── Per-slot captures ──────────────────────────────────────────────────────
  const [captures, setCaptures] = useState<Record<string, CaptureState>>({});

  // ── Solenoid test busy state ───────────────────────────────────────────────
  const [testBusy, setTestBusy] = useState<Record<string, boolean>>({});

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const { connected, send } = useAdminWs(
    useCallback((msg) => {
      if (msg.type === "ESP_HEALTH") {
        setEspHealth(msg as unknown as WsEspHealth);
      } else if (msg.type === "CAMERA_SERVER_STATUS") {
        setCameraStatus(msg as unknown as WsCameraStatus);
      } else if (msg.type === "CAPTURE_RESULT") {
        const r = msg as unknown as WsCaptureResult;
        setCaptures((prev) => ({
          ...prev,
          [r.slotId]: {
            loading: false,
            url: r.imageUrl,
            error: null,
            requestId: r.requestId,
          },
        }));
      } else if (msg.type === "CAPTURE_ERROR") {
        const e = msg as unknown as WsCaptureError;
        setCaptures((prev) => ({
          ...prev,
          [e.slotId]: {
            loading: false,
            url: null,
            error: e.error,
            requestId: e.requestId,
          },
        }));
        notifyError({
          title: `Capture failed (${e.slotId})`,
          description: e.error,
        });
      } else if (msg.type === "LOCKER_UPDATE") {
        const { slotId, status } = msg as {
          type: string;
          slotId: string;
          status: string;
        };
        setSlots((prev) =>
          prev.map((s) => (s.slotId === slotId ? { ...s, status } : s)),
        );
      }
    }, []),
  );

  // ── Initial data ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([lockersApi.all(), lockersApi.getCameraAssignments()])
      .then(([slotsRes, assignRes]) => {
        setSlots(slotsRes.slots);
        setAssignments(assignRes.assignments);
      })
      .catch(() => {})
      .finally(() => setSlotsLoading(false));
  }, []);

  // ── Camera assignment save ─────────────────────────────────────────────────
  const saveAssignment = async (slotId: string, indexStr: string) => {
    const idx = indexStr === "" ? null : Number(indexStr);
    setSavingAssign(slotId);
    try {
      await lockersApi.updateCameraAssignment(slotId, idx);
      setAssignments((prev) => ({ ...prev, [slotId]: idx }));
      notifySuccess({
        title: "Assignment saved",
        description: `Slot ${slotId} → Camera ${idx ?? "none"}`,
      });
    } catch (e) {
      notifyError({ title: "Save failed", description: (e as Error).message });
    } finally {
      setSavingAssign(null);
    }
  };

  // ── Solenoid test ──────────────────────────────────────────────────────────
  const testSolenoid = (slotId: string, action: "UNLOCK" | "LOCK") => {
    setTestBusy((p) => ({ ...p, [slotId]: true }));
    send({ type: `TEST_SOLENOID_${action}`, deviceId: "Kiosk-1", slotId });
    // Clear busy after 1.5 s (relay pulse duration + margin)
    setTimeout(() => setTestBusy((p) => ({ ...p, [slotId]: false })), 1500);
  };

  // ── Camera capture ─────────────────────────────────────────────────────────
  const triggerCapture = (slotId: string) => {
    const camIdx = assignments[slotId];
    if (camIdx === null || camIdx === undefined) {
      notifyError({
        title: "No camera assigned",
        description: `Assign a camera to slot ${slotId} first.`,
      });
      return;
    }
    const requestId = crypto.randomUUID();
    setCaptures((prev) => ({
      ...prev,
      [slotId]: { loading: true, url: null, error: null, requestId },
    }));
    send({ type: "CAPTURE_SLOT", slotId, cameraIndex: camIdx, requestId });
  };

  const espOnline =
    (espHealth?.connected ?? false) &&
    Date.now() - (espHealth?.lastSeen ?? 0) < 45_000;
  const camOnline = cameraStatus?.online ?? false;

  const cameraOptions = cameraStatus?.cameras ?? [];

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-1">IoT Monitor</h1>
          <p className="text-sm text-text-2">
            Live ESP32 health, solenoid testing, and per-slot camera captures.
          </p>
        </div>
        <Chip
          className={
            connected
              ? "bg-status-success-100 text-status-success-700"
              : "bg-surface-bg-3 text-text-4"
          }
          size="sm"
          variant="flat"
        >
          {connected ? "WS Connected" : "WS Disconnected"}
        </Chip>
      </div>

      {/* ── Status row ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* ESP32 health card */}
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardHeader className="flex items-center justify-between pb-1">
            <span className="font-semibold text-text-1">ESP32 Kiosk</span>
            <Chip
              className={
                espOnline
                  ? "bg-status-success-100 text-status-success-700"
                  : "bg-status-danger-100 text-status-danger-700"
              }
              size="sm"
              variant="flat"
            >
              {espOnline ? "Online" : "Offline"}
            </Chip>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-0">
            <span className="text-text-3">Device</span>
            <span className="font-mono text-text-1">
              {espHealth?.deviceId ?? "Kiosk-1"}
            </span>

            <span className="text-text-3">Last seen</span>
            <span className="text-text-1">
              {espHealth ? <SecondsSince ts={espHealth.lastSeen} /> : "—"}
            </span>

            <span className="text-text-3">Heartbeats</span>
            <span className="text-text-1">
              {espHealth?.heartbeatCount ?? 0}
            </span>

            <span className="text-text-3">WiFi RSSI</span>
            <span className={rssiBar(espHealth?.rssi ?? null).color}>
              {rssiBar(espHealth?.rssi ?? null).label}
            </span>

            <span className="text-text-3">Uptime</span>
            <span className="text-text-1">
              {fmtUptime(espHealth?.uptime ?? null)}
            </span>

            <span className="text-text-3">Free heap</span>
            <span className="text-text-1">
              {fmtHeap(espHealth?.freeHeap ?? null)}
            </span>
          </CardBody>
        </Card>

        {/* Camera server health card */}
        <Card className="border border-border-subtle bg-surface-bg-2">
          <CardHeader className="flex items-center justify-between pb-1">
            <span className="font-semibold text-text-1">
              Camera Server (Laptop)
            </span>
            <Chip
              className={
                camOnline
                  ? "bg-status-success-100 text-status-success-700"
                  : "bg-surface-bg-3 text-text-4"
              }
              size="sm"
              variant="flat"
            >
              {camOnline ? "Online" : "Offline"}
            </Chip>
          </CardHeader>
          <CardBody className="space-y-2 text-sm pt-0">
            <div className="flex justify-between">
              <span className="text-text-3">Last seen</span>
              <span className="text-text-1">
                {cameraStatus ? (
                  <SecondsSince ts={cameraStatus.lastSeen} />
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-3">Cameras detected</span>
              <span className="text-text-1">
                {cameraStatus?.cameras.length ?? 0}
              </span>
            </div>
            {cameraStatus?.cameras.map((cam) => (
              <div
                key={cam.index}
                className="flex items-center gap-2 rounded-lg bg-surface-bg-3 px-3 py-1.5"
              >
                <span className="text-xs font-mono text-brand-primary-600">
                  #{cam.index}
                </span>
                <span className="text-xs text-text-2 truncate">{cam.name}</span>
              </div>
            ))}
            {camOnline && cameraStatus?.cameras.length === 0 && (
              <p className="text-xs text-status-warning-600">
                No cameras detected on laptop
              </p>
            )}
            {!camOnline && (
              <p className="text-xs text-text-4">
                Run <span className="font-mono">start.bat</span> on the laptop
                to connect.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Slot grid ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-text-1">
          Slots — Solenoid Test &amp; Camera
        </h2>
        {slotsLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => {
              const espSlot = espHealth?.slots.find(
                (s) => s.slotId === slot.slotId,
              );
              const cap = captures[slot.slotId];
              const busy = testBusy[slot.slotId] ?? false;
              const assignedCam = assignments[slot.slotId];
              const hasCam = assignedCam !== null && assignedCam !== undefined;

              return (
                <Card
                  key={slot.slotId}
                  className="border border-border-subtle bg-surface-bg-2"
                >
                  <CardHeader className="flex items-center justify-between pb-1">
                    <span className="text-lg font-bold text-text-1">
                      {slot.slotId}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Door state from ESP live data */}
                      {espSlot !== undefined && (
                        <Chip
                          className={
                            espSlot.doorOpen
                              ? "bg-status-warning-100 text-status-warning-700"
                              : "bg-status-success-100 text-status-success-700"
                          }
                          size="sm"
                          variant="flat"
                        >
                          {espSlot.doorOpen ? "Door Open" : "Door Closed"}
                        </Chip>
                      )}
                      <Chip
                        className="bg-surface-bg-3 text-text-3"
                        size="sm"
                        variant="flat"
                      >
                        {slot.status}
                      </Chip>
                    </div>
                  </CardHeader>

                  <CardBody className="space-y-3 pt-0">
                    {/* Item name */}
                    <p className="text-xs text-text-3 truncate">
                      {slot.currentItem?.title ?? "No item"}
                    </p>

                    {/* ── Solenoid test ──────────────────────────────────── */}
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-4">
                        Solenoid Test (raw — no DB record)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-status-success-600 text-white text-xs"
                          isDisabled={!espOnline || busy}
                          isLoading={busy}
                          size="sm"
                          onPress={() => testSolenoid(slot.slotId, "UNLOCK")}
                        >
                          Test Unlock
                        </Button>
                        <Button
                          className="flex-1 bg-surface-bg-3 text-text-1 text-xs border border-border-strong"
                          isDisabled={!espOnline || busy}
                          size="sm"
                          onPress={() => testSolenoid(slot.slotId, "LOCK")}
                        >
                          Test Lock
                        </Button>
                      </div>
                      {!espOnline && (
                        <p className="mt-1 text-[10px] text-status-danger-500">
                          ESP offline
                        </p>
                      )}
                    </div>

                    {/* ── Camera assignment ──────────────────────────────── */}
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-4">
                        Camera Assignment
                      </p>
                      <div className="flex items-center gap-2">
                        <Select
                          className="flex-1"
                          size="sm"
                          placeholder="Select camera"
                          selectedKeys={
                            assignedCam !== null && assignedCam !== undefined
                              ? [String(assignedCam)]
                              : []
                          }
                          isDisabled={
                            savingAssign === slot.slotId || !camOnline
                          }
                          onSelectionChange={(keys) => {
                            const val =
                              Array.from(keys as Set<string>)[0] ?? "";
                            saveAssignment(slot.slotId, val);
                          }}
                          classNames={{
                            trigger:
                              "bg-surface-bg-3 border border-border-strong",
                            popoverContent: "bg-surface-bg-2",
                          }}
                        >
                          <>
                            <SelectItem key="" textValue="Unassigned">
                              Unassigned
                            </SelectItem>
                            {cameraOptions.map((cam) => (
                              <SelectItem
                                key={String(cam.index)}
                                textValue={cam.name}
                              >
                                #{cam.index} — {cam.name}
                              </SelectItem>
                            ))}
                          </>
                        </Select>
                        {savingAssign === slot.slotId && <Spinner size="sm" />}
                      </div>
                      {!camOnline && (
                        <p className="mt-1 text-[10px] text-text-4">
                          Camera server offline
                        </p>
                      )}
                    </div>

                    {/* ── Take photo ────────────────────────────────────── */}
                    <div>
                      <Tooltip
                        content={
                          !hasCam
                            ? "Assign a camera first"
                            : !camOnline
                              ? "Camera server offline"
                              : ""
                        }
                        isDisabled={hasCam && camOnline}
                      >
                        <Button
                          className="btn-cta w-full text-xs"
                          size="sm"
                          isDisabled={!hasCam || !camOnline || cap?.loading}
                          isLoading={cap?.loading}
                          onPress={() => triggerCapture(slot.slotId)}
                        >
                          Take Photo
                        </Button>
                      </Tooltip>

                      {/* Captured image */}
                      {cap?.url && (
                        <div className="mt-2 overflow-hidden rounded-lg border border-border-subtle">
                          <img
                            alt={`Slot ${slot.slotId} capture`}
                            className="w-full object-cover"
                            src={cap.url}
                          />
                          <div className="flex items-center justify-between bg-surface-bg-3 px-2 py-1">
                            <span className="text-[10px] text-text-4">
                              Latest capture
                            </span>
                            <a
                              className="text-[10px] text-brand-primary-600 hover:underline"
                              href={cap.url}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              Open full size ↗
                            </a>
                          </div>
                        </div>
                      )}

                      {cap?.error && (
                        <p className="mt-1 text-[10px] text-status-danger-500">
                          {cap.error}
                        </p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
