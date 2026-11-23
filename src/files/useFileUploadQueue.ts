'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FileUploadInput } from './fileManagerAdapter.ts';
import type { FileAreaKey, FileAreaView, FileFamily, FileItemId, FileLinkRef, FileView } from './fileView.ts';
import { precheckUpload, uploadFamilyOf } from './uploadPrecheck.ts';
import { isUploadAborted, type UploadProgressCallbacks, uploadErrorMessage } from './uploadWithProgress.ts';

/** Uploads run three at a time; the rest wait in the tray. */
export const UPLOAD_CONCURRENCY = 3;

export type UploadItemStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'cancelled' | 'refused';

/** Where a batch of dropped / picked files goes (the open folder, plus a link tab's links). */
export interface UploadTarget {
  areaKey: FileAreaKey;
  folderId: FileItemId | null;
  /** The folder's (or the area's) name for the tray and the drop overlay. */
  label: string;
  links: readonly FileLinkRef[];
}

export interface UploadItem {
  id: string;
  file: File;
  family: FileFamily;
  target: UploadTarget;
  status: UploadItemStatus;
  /** Bytes sent. */
  loaded: number;
  /** The refusal (client pre-check) or the server's / network's message. */
  error: string | null;
  /** The created file once the server answered. */
  result: FileView | null;
}

export interface FileUploadQueue {
  items: readonly UploadItem[];
  /** Queued + uploading. */
  activeCount: number;
  /** Queues the files; refused ones (type, size, quota) stay in the tray with the reason and send nothing. */
  add: (files: readonly File[], target: UploadTarget) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
  /** Removes every finished, failed, refused and cancelled entry. */
  clearFinished: () => void;
}

export interface UseFileUploadQueueOptions {
  upload: (input: FileUploadInput, callbacks: UploadProgressCallbacks) => Promise<FileView>;
  /** The target area: the client pre-check (allow-list, per-file limit, quota) reads it. */
  area: FileAreaView | undefined;
  /** Each successful upload (the manager toasts; the adapter's cache tags refetch the list). */
  onUploaded?: (file: FileView) => void;
  concurrency?: number;
}

let sequence = 0;
const nextId = () => {
  sequence += 1;
  return `upload-${Date.now()}-${sequence}`;
};

/**
 * The upload tray's queue: one request per file, `concurrency` in parallel, per-file progress, cancel (aborts the
 * request), retry, the server's error per file. The requests go through the adapter's `upload`.
 */
export const useFileUploadQueue = ({ upload, area, onUploaded, concurrency = UPLOAD_CONCURRENCY }: UseFileUploadQueueOptions): FileUploadQueue => {
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const controllersRef = useRef(new Map<string, AbortController>());
  const uploadRef = useRef(upload);
  uploadRef.current = upload;
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  const patch = useCallback((id: string, change: Partial<UploadItem>) => {
    setItems(previous => previous.map(item => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  const start = useCallback(
    (item: UploadItem) => {
      const controller = new AbortController();
      controllersRef.current.set(item.id, controller);
      let lastPercent = -1;
      const input: FileUploadInput = {
        areaKey: item.target.areaKey,
        folderId: item.target.folderId,
        file: item.file,
        links: item.target.links,
      };
      uploadRef
        .current(input, {
          signal: controller.signal,
          onProgress: (loaded, total) => {
            // One render per percent, not per progress event.
            const percent = total > 0 ? Math.floor((loaded / total) * 100) : 0;
            if (percent === lastPercent) return;
            lastPercent = percent;
            patch(item.id, { loaded: Math.min(loaded, item.file.size) });
          },
        })
        .then(result => {
          patch(item.id, { status: 'done', loaded: item.file.size, result, error: null });
          onUploadedRef.current?.(result);
        })
        .catch((error: unknown) => {
          if (isUploadAborted(error) || controller.signal.aborted) patch(item.id, { status: 'cancelled', error: null });
          else patch(item.id, { status: 'failed', error: uploadErrorMessage(error) });
        })
        .finally(() => controllersRef.current.delete(item.id));
    },
    [patch]
  );

  // The pump: start queued items while fewer than `concurrency` run.
  useEffect(() => {
    const running = items.filter(item => item.status === 'uploading').length;
    const free = concurrency - running;
    if (free <= 0) return;
    const next = items.filter(item => item.status === 'queued').slice(0, free);
    if (next.length === 0) return;
    const ids = new Set(next.map(item => item.id));
    setItems(previous => previous.map(item => (ids.has(item.id) ? { ...item, status: 'uploading', loaded: 0 } : item)));
    for (const item of next) start(item);
  }, [items, concurrency, start]);

  // Leaving the page aborts what still runs.
  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      for (const controller of controllers.values()) controller.abort();
    };
  }, []);

  const add = useCallback(
    (files: readonly File[], target: UploadTarget) => {
      if (files.length === 0) return;
      // Bytes already promised to queued / running uploads of this area count against the quota.
      let reserved = itemsRef.current
        .filter(item => String(item.target.areaKey) === String(target.areaKey) && (item.status === 'queued' || item.status === 'uploading'))
        .reduce((sum, item) => sum + item.file.size, 0);
      const added: UploadItem[] = files.map(file => {
        const refusal = precheckUpload(file, area, reserved);
        if (!refusal) reserved += file.size;
        return {
          id: nextId(),
          file,
          family: uploadFamilyOf(file.name, area),
          target,
          status: refusal ? 'refused' : 'queued',
          loaded: 0,
          error: refusal,
          result: null,
        };
      });
      setItems(previous => [...previous, ...added]);
    },
    [area]
  );

  const cancel = useCallback(
    (id: string) => {
      const controller = controllersRef.current.get(id);
      if (controller) controller.abort();
      else patch(id, { status: 'cancelled' });
    },
    [patch]
  );

  const retry = useCallback(
    (id: string) => {
      const item = itemsRef.current.find(candidate => candidate.id === id);
      if (!item || (item.status !== 'failed' && item.status !== 'cancelled')) return;
      patch(id, { status: 'queued', loaded: 0, error: null });
    },
    [patch]
  );

  const dismiss = useCallback((id: string) => {
    controllersRef.current.get(id)?.abort();
    setItems(previous => previous.filter(item => item.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setItems(previous => previous.filter(item => item.status === 'queued' || item.status === 'uploading'));
  }, []);

  const activeCount = useMemo(() => items.filter(item => item.status === 'queued' || item.status === 'uploading').length, [items]);

  return { items, activeCount, add, cancel, retry, dismiss, clearFinished };
};
