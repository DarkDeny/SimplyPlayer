import { app, autoUpdater } from 'electron';
import { dbg } from './debug-log';

// Squirrel.Windows update feed pointing at the local electron-forge make
// output. After every `make-win.cmd` build the new RELEASES + .nupkg appear
// there, so the installed app picks updates up on the next launch.
const UPDATE_FEED =
  'D:\\Projects\\Personal\\SimplyPlayer\\out\\make\\squirrel.windows\\x64';

export function setupAutoUpdate(): void {
  if (!app.isPackaged || process.platform !== 'win32') {
    dbg('Auto-update skipped (dev mode or non-Windows)');
    return;
  }

  try {
    autoUpdater.setFeedURL({ url: UPDATE_FEED });
  } catch (err) {
    dbg(`Auto-update: setFeedURL failed: ${err}`);
    return;
  }

  autoUpdater.on('error', (err) => dbg(`Auto-update error: ${err.message}`));
  autoUpdater.on('checking-for-update', () => dbg('Auto-update: checking'));
  autoUpdater.on('update-available', () => dbg('Auto-update: update available, downloading'));
  autoUpdater.on('update-not-available', () => dbg('Auto-update: already up to date'));
  autoUpdater.on('update-downloaded', (_e, _notes, name) =>
    dbg(`Auto-update: ${name} downloaded, will install on next launch`),
  );

  autoUpdater.checkForUpdates();
}
