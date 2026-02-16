"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  OfflineReservation,
  SyncConflict,
  ChannelReservation,
  SyncLog,
  getOfflineQueue,
  addToOfflineQueue,
  removeFromQueue,
  clearSyncedFromQueue,
  getChannelBuffer,
  getUnresolvedConflicts,
  getSyncLog,
  syncReservations,
  resolveConflict as resolveConflictService,
  seedChannelData,
  ConflictResolution,
  ChannelSource,
} from "@/lib/offline-sync";
import { RoomType } from "@/lib/types";

export interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  queue: OfflineReservation[];
  conflicts: SyncConflict[];
  channelBuffer: ChannelReservation[];
  syncLog: SyncLog[];
  pendingCount: number;
  conflictCount: number;
  addReservation: (data: NewReservationData) => OfflineReservation;
  removeReservation: (id: string) => void;
  triggerSync: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => void;
  clearSynced: () => void;
  lastSyncResult: SyncResult | null;
}

export interface NewReservationData {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  roomType: RoomType;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  ratePerNight: number;
  totalAmount: number;
  source: ChannelSource;
  specialRequests?: string;
}

export interface SyncResult {
  synced: number;
  conflicts: number;
  errors: number;
  timestamp: string;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queue, setQueue] = useState<OfflineReservation[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [channelBuffer, setChannelBuffer] = useState<ChannelReservation[]>([]);
  const [syncLog, setSyncLog] = useState<SyncLog[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const autoSyncRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh all state from localStorage
  const refreshState = useCallback(() => {
    setQueue(getOfflineQueue());
    setConflicts(getUnresolvedConflicts());
    setChannelBuffer(getChannelBuffer());
    setSyncLog(getSyncLog());
  }, []);

  // Online/offline detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    seedChannelData(); // Seed demo channel data on first load
    refreshState();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      setTimeout(() => {
        triggerSyncInternal();
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (autoSyncRef.current) {
        clearInterval(autoSyncRef.current);
        autoSyncRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (autoSyncRef.current) clearInterval(autoSyncRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerSyncInternal = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);

    try {
      const result = await syncReservations();
      setLastSyncResult({
        synced: result.synced,
        conflicts: result.conflicts.length,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
      refreshState();
    }
  }, [refreshState]);

  const addReservation = useCallback((data: NewReservationData): OfflineReservation => {
    const res = addToOfflineQueue(data);
    refreshState();
    return res;
  }, [refreshState]);

  const removeReservation = useCallback((id: string) => {
    removeFromQueue(id);
    refreshState();
  }, [refreshState]);

  const triggerSync = useCallback(async () => {
    await triggerSyncInternal();
  }, [triggerSyncInternal]);

  const handleResolveConflict = useCallback((conflictId: string, resolution: ConflictResolution) => {
    resolveConflictService(conflictId, resolution);
    refreshState();
  }, [refreshState]);

  const clearSynced = useCallback(() => {
    clearSyncedFromQueue();
    refreshState();
  }, [refreshState]);

  const pendingCount = queue.filter((r) => r.syncStatus === "pending" || r.syncStatus === "error").length;
  const conflictCount = conflicts.length;

  return {
    isOnline,
    isSyncing,
    queue,
    conflicts,
    channelBuffer,
    syncLog,
    pendingCount,
    conflictCount,
    addReservation,
    removeReservation,
    triggerSync,
    resolveConflict: handleResolveConflict,
    clearSynced,
    lastSyncResult,
  };
}
