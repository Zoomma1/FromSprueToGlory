// ─── Status weights for completion calculation ───────────
export const STATUS_WEIGHT: Record<string, number> = {
  WANT: 0,
  BOUGHT: 5,
  ASSEMBLED: 30,
  WIP: 60,
  FINISHED: 100,
};
