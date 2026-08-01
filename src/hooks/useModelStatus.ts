import { useState, useEffect } from "react";
import { hasWebGPUSupport, initWebGPUEngine } from "@/lib/webgpu-llm";
import { OLLAMA_STATUS_ENDPOINT } from "@/lib/ollama";

export type ModelStatus = {
  status: "connected" | "disconnected" | "loading" | "unsupported";
  modelAvailable: boolean;
  targetModel: string;
  error?: string;
  progressText?: string;
  isWebGPU: boolean;
};

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatus>({
    status: "disconnected",
    modelAvailable: false,
    targetModel: "Checking...",
    isWebGPU: false,
  });

  useEffect(() => {
    let mounted = true;

    async function checkStatus() {
      if (hasWebGPUSupport()) {
        try {
          setStatus((s) => ({
            ...s,
            status: "loading",
            targetModel: "gemma-2-2b-it-q4f16_1-MLC",
            progressText: "Initializing WebGPU...",
            isWebGPU: true,
          }));

          // Start initialization in background to load cache
          await initWebGPUEngine((progress) => {
            if (!mounted) return;
            setStatus((s) => ({
              ...s,
              status: "loading",
              progressText: progress.text,
            }));
          });

          if (!mounted) return;
          setStatus({
            status: "connected",
            modelAvailable: true,
            targetModel: "gemma-2-2b-it-q4f16_1-MLC",
            isWebGPU: true,
          });
          return;
        } catch (err) {
          console.warn("WebGPU initialization failed:", err);
          if (!mounted) return;
          // Fall back to Ollama
        }
      }

      // Ollama fallback
      try {
        const res = await fetch(OLLAMA_STATUS_ENDPOINT);
        if (!res.ok) throw new Error("Ollama not reachable");
        const data = await res.json();
        
        if (mounted) {
          setStatus({
            ...data,
            isWebGPU: false,
          });
        }
      } catch (err) {
        if (mounted) {
          setStatus({
            status: "disconnected",
            modelAvailable: false,
            targetModel: "Local Ollama",
            error: "Cannot reach Ollama",
            isWebGPU: false,
          });
        }
      }
    }

    checkStatus();
    // Poll Ollama if not WebGPU
    const interval = setInterval(() => {
      if (!hasWebGPUSupport()) checkStatus();
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}
