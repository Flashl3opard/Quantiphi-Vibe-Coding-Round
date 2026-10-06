export const AVATAR_PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#059669",
  "#d97706",
  "#0891b2",
  "#4f46e5",
  "#ca8a04",
];

export function nextAvatarColor(existingCount: number): string {
  return AVATAR_PALETTE[existingCount % AVATAR_PALETTE.length];
}
