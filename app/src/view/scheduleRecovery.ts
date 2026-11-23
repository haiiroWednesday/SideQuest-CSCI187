// Keep this destructive-recovery prompt consistent between the active M2
// Schedule and the preserved M1 Schedule view. No recovery is automatic.
export const SCHEDULE_RECOVERY_CONFIRMATION =
  'Replace unreadable schedule data with the valid plan IDs currently loaded? Invalid entries will be discarded. Original events will not change.'
