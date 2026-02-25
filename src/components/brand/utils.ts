/**
 * Formats HHmm slot strings to HH:mm display format.
 */
export function formatSlot(slot: string) {
  return slot.length === 4 ? `${slot.slice(0, 2)}:${slot.slice(2)}` : slot;
}
