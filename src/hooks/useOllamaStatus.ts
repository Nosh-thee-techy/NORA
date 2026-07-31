import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOllamaStatus,
  type OllamaStatusResult,
} from "@/routes/api/ollama-status";
import { GEMMA_MODEL, OLLAMA_STATUS_ENDPOINT } from "@/lib/ollama";

export type OllamaStatus = "connected" | "disconnected" | "checking";

const POLL_INTERVAL = 15_000;

async function fetchStatusHttp(): Promise<OllamaStatusResult> {
  const res = await fetch(OLLAMA_STATUS_ENDPOINT, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    return {
      status: "disconnected",
      modelAvailable: false,
      targetModel: GEMMA_MODEL,
      error: `Status check failed (${res.status})`,
    };
  }
  return (await res.json()) as OllamaStatusResult;
}

export function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus>("checking");
  const [modelAvailable, setModelAvailable] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [targetModel, setTargetModel] = useState(GEMMA_MODEL);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    try {
      let data: OllamaStatusResult;
      try {
        // Prefer direct HTTP proxy (works in Vite middleware / custom server entry)
        data = await fetchStatusHttp();
      } catch {
        // Fallback to TanStack server function
        data = (await getOllamaStatus()) as OllamaStatusResult;
      }
      setStatus(data.status);
      setModelAvailable(data.modelAvailable);
      setModels(data.models ?? []);
      setTargetModel(data.targetModel || GEMMA_MODEL);
      setError(data.error ?? null);
    } catch {
      setStatus("disconnected");
      setModelAvailable(false);
      setModels([]);
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

  return { status, modelAvailable, models, targetModel, error, recheck: check };
}
