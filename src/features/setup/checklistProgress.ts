/**
 * Pure helpers for the checklist's completed-items state, kept
 * separate from the screen so the toggle rule is unit-testable
 * without rendering anything.
 */

export function toggleChecklistItem(
  completed: ReadonlySet<string>,
  id: string,
): Set<string> {
  const next = new Set(completed);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function countCompleted(
  items: { id: string }[],
  completed: ReadonlySet<string>,
): number {
  return items.reduce(
    (count, item) => (completed.has(item.id) ? count + 1 : count),
    0,
  );
}
