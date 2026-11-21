import { app, autoUpdater } from 'electron';
import { dbg } from './debug-log';

// GitHub repo whose Releases feed update.electronjs.org (public repo required).
const GITHUB_REPO = 'DarkDeny/SimplyPlayer';

// Update feed resolution:
// 1. SIMPLYPLAYER_UPDATE_FEED env var — local dev override, e.g. the
//    electron-forge make output folder (D:\...\out\make\squirrel.windows\x64)
//    or any other Squirrel-compatible feed.
// 2. Default — update.electronjs.org backed by GitHub Releases.
function resolveFeedUrl(): string {
  if (process.env.SIMPLYPLAYER_UPDATE_FEED) {
    return process.env.SIMPLYPLAYER_UPDATE_FEED;
  }
  return `https://update.electronjs.org/${GITHUB_REPO}/${process.platform}-${process.arch}/${app.getVersion()}`;
}

export function setupAutoUpdate(): void {
  if (!app.isPackaged || process.platform !== 'win32') {
    dbg('Auto-update skipped (dev mode or non-Windows)');
    return;
  }

  const feedUrl = resolveFeedUrl();
  try {
    autoUpdater.setFeedURL({ url: feedUrl });
  } catch (err) {
    dbg(`Auto-update: setFeedURL failed: ${err}`);
    return;
  }
  dbg(`Auto-update: feed ${feedUrl}`);

  autoUpdater.on('error', (err) => dbg(`Auto-update error: ${err.message}`));
  autoUpdater.on('checking-for-update', () => dbg('Auto-update: checking'));
  autoUpdater.on('update-available', () => dbg('Auto-update: update available, downloading'));
  autoUpdater.on('update-not-available', () => dbg('Auto-update: already up to date'));
  autoUpdater.on('update-downloaded', (_e, _notes, name) =>
    dbg(`Auto-update: ${name} downloaded, will install on next launch`),
  );

  autoUpdater.checkForUpdates();
}
