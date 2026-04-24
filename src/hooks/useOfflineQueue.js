import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const QUEUE_KEY = 'workgrid_offline_task_queue';

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch { return []; }
}

function writeQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

/**
 * Provides an offline-safe task status updater.
 *
 * - Online  → updates the server immediately.
 * - Offline → queues the update locally and shows a pending indicator.
 * - On reconnect → flushes the queue automatically.
 *
 * Returns { updateTaskStatus, pendingCount, isSyncing, isOnline }
 */
export function useOfflineQueue(onSynced) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(() => readQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLockRef = useRef(false);

  // Track online/offline state
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Flush the queue
  const flushQueue = useCallback(async () => {
    if (syncLockRef.current) return;
    const queue = readQueue();
    if (queue.length === 0) return;

    syncLockRef.current = true;
    setIsSyncing(true);

    const failed = [];
    for (const item of queue) {
      try {
        await base44.entities.Task.update(item.taskId, item.updates);
      } catch {
        failed.push(item);
      }
    }

    writeQueue(failed);
    setPendingCount(failed.length);
    setIsSyncing(false);
    syncLockRef.current = false;

    if (failed.length < queue.length) {
      onSynced?.(); // Trigger a data refetch after successful syncs
    }
  }, [onSynced]);

  // Auto-flush when coming back online
  useEffect(() => {
    if (isOnline) flushQueue();
  }, [isOnline, flushQueue]);

  // Also flush when SW sends SYNC_REQUESTED
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'SYNC_REQUESTED') flushQueue();
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [flushQueue]);

  /**
   * updateTaskStatus(taskId, updates)
   * - Online: writes directly to server
   * - Offline: queues locally, applies optimistic update
   */
  const updateTaskStatus = useCallback(async (taskId, updates) => {
    if (isOnline) {
      await base44.entities.Task.update(taskId, updates);
    } else {
      const queue = readQueue();
      // Merge with any existing queued update for the same task
      const idx = queue.findIndex(q => q.taskId === taskId);
      if (idx >= 0) {
        queue[idx].updates = { ...queue[idx].updates, ...updates };
      } else {
        queue.push({ taskId, updates, queuedAt: new Date().toISOString() });
      }
      writeQueue(queue);
      setPendingCount(queue.length);
    }
  }, [isOnline]);

  return { updateTaskStatus, pendingCount, isSyncing, isOnline };
}