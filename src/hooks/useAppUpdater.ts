import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { useCallback, useEffect, useState } from 'react';

type UpdaterStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error';

interface DownloadProgress {
  downloaded: number;
  total: number;
}

/**
 * Checks for an app update on mount and exposes a way to download, install,
 * and relaunch into it. Failures (e.g. no network, no updater configured in
 * dev mode) are swallowed into an 'error' status rather than thrown, since an
 * update check should never block using the app.
 */
export function useAppUpdater() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<UpdaterStatus>('idle');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('checking');

    check()
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setUpdate(result);
          setStatus('available');
        } else {
          setStatus('idle');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const installUpdate = useCallback(async () => {
    if (!update) return;

    setStatus('downloading');
    let total = 0;
    let downloaded = 0;

    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength ?? 0;
            setProgress({ downloaded: 0, total });
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            setProgress({ downloaded, total });
            break;
          case 'Finished':
            setStatus('installing');
            break;
        }
      });
      await relaunch();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [update]);

  return { status, update, progress, error, installUpdate };
}
