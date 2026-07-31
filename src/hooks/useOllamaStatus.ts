import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOllamaStatus,
  type OllamaStatusResult,
} from "@/routes/api/ollama-status";

export type OllamaStatus = "connected" | "disconnected" | "checking";

const POLL_INTERVAL = 30_000; // 30 seconds

export function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus>("checking");
  const [modelAvailable, setModelAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    try {
      const data = (await getOllamaStatus()) as OllamaStatusResult;
      setStatus(data.status);
      setModelAvailable(data.modelAvailable);
      setError(data.error ?? null);
    } catch {
      setStatus("disconnected");
      setModelAvailable(false);
      setError("Cannot reach server");
    }
  }, []);

  useEffect(() => {
    void check();
    timerRef.current = setInterval(() => void check(), POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [check]);

  return { status, modelAvailable, error, recheck: check };
}
