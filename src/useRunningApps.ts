import { useCallback, useEffect, useState } from "react";
import { command, desktop } from "./bridge";

export interface RunningApp {
  id: string;
  name: string;
  instances: number;
  canClose: boolean;
}

export function useRunningApps() {
  const [running, setRunning] = useState<RunningApp[]>([]);
  const refreshRunning = useCallback(async () => {
    if (desktop) setRunning(await command<RunningApp[]>("get_running_apps"));
  }, []);
  useEffect(() => {
    if (!desktop) return;
    void refreshRunning().catch(() => {});
    const timer = setInterval(
      () => void refreshRunning().catch(() => {}),
      3000,
    );
    return () => clearInterval(timer);
  }, [refreshRunning]);
  return { running, refreshRunning };
}
