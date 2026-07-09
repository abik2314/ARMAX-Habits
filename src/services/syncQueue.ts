import type { SyncQueueItem } from '../types/habit'
import { useHabitStore } from '../store/habitsStore'

export const syncQueueService = {
  addToSyncQueue: (item: Omit<SyncQueueItem, 'id' | 'attempts' | 'createdAt' | 'updatedAt'>) =>
    useHabitStore.getState().addToSyncQueue(item),
  markSynced: (itemId: string) => useHabitStore.getState().markSynced(itemId),
  markFailed: (itemId: string, error?: string) => useHabitStore.getState().markFailed(itemId, error),
  retryPending: () => useHabitStore.getState().retryPending(),
  getSyncStatus: () => useHabitStore.getState().getSyncStatus(),
}
