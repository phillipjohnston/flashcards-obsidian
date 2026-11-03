import { Notice, Platform } from "obsidian";
import { Anki } from "src/services/anki";

const pollIntervalMs = 1000;
const launchTimeoutMs = 60 * 1000;

async function isReachable(anki: Anki): Promise<boolean> {
  try {
    return await anki.ping();
  } catch {
    return false;
  }
}

function launchCommand(): { cmd: string; args: string[] } | undefined {
  if (Platform.isMacOS) return { cmd: "open", args: ["-g", "-a", "Anki"] };
  if (Platform.isWin) return { cmd: "cmd", args: ["/c", "start", "", "anki"] };
  if (Platform.isLinux) return { cmd: "anki", args: [] };
  return undefined;
}

function startAnki(): boolean {
  const command = launchCommand();
  if (!command || !Platform.isDesktopApp) return false;
  try {
    // Loaded at runtime so the bundle stays free of Node imports.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { spawn } = (window as any).require("child_process");
    const child = spawn(command.cmd, command.args, {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", (err: unknown) => console.error(err));
    child.unref();
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

/**
 * Make sure AnkiConnect answers before a sync touches Anki or the note.
 * When Anki is closed and autoStart is on, launch it and poll until it is up.
 * Clicking the waiting notice cancels. Returns false if Anki never answered.
 */
export async function ensureAnkiRunning(
  anki: Anki,
  autoStart: boolean
): Promise<boolean> {
  if (await isReachable(anki)) return true;
  if (!autoStart || !startAnki()) return false;

  let cancelled = false;
  const notice = new Notice("Starting Anki… (click to cancel)", 0);
  notice.noticeEl.addEventListener("click", () => {
    cancelled = true;
  });

  try {
    const deadline = Date.now() + launchTimeoutMs;
    while (!cancelled && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      if (await isReachable(anki)) return true;
    }
    return false;
  } finally {
    notice.hide();
  }
}
