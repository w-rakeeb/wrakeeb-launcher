import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export function onSecondMonitor(pid) {
  execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resolve("tests/second-monitor.ps1"), "-AppProcessId", String(pid)], { windowsHide: true, stdio: "pipe" });
}
