"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Kiosk uses 6 USB cameras — cam[0-5] maps to S-01..S-06
const SLOT_CAM_MAP: Record<string, number> = {
  "S-01": 0,
  "S-02": 1,
  "S-03": 2,
  "S-04": 3,
  "S-05": 4,
  "S-06": 5,
};

export function useCameraCapture(slotId: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPreview = useCallback(
    async (videoEl: HTMLVideoElement) => {
      videoRef.current = videoEl;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        const camIndex = SLOT_CAM_MAP[slotId] ?? 0;
        const device = videoDevices[camIndex];

        const constraints: MediaStreamConstraints = {
          video: device
            ? { deviceId: { exact: device.deviceId }, width: 1280, height: 720 }
            : { facingMode: "environment" },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        videoEl.srcObject = stream;
        await videoEl.play();
        setReady(true);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
        setReady(false);
      }
    },
    [slotId],
  );

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  // Capture current frame as a Blob
  const capture = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !ready) {
        resolve(null);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  }, [ready]);

  useEffect(() => {
    return () => stopPreview();
  }, [stopPreview]);

  return { startPreview, stopPreview, capture, ready, error };
}
