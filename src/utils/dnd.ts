/**
 * Drag-and-drop helpers for the custom Seneschal MIME type.
 *
 * Centralizes the MIME constant, the payload union type, and parse/write
 * helpers so call sites don't duplicate JSON parsing or any-casts.
 */

export const SENESCHAL_DND_MIME = 'application/x-seneschal-dnd';

export type DndPayload =
  | { kind: 'combatant'; payload: { uid: string } }
  | { kind: 'creatureRecord'; payload: { creatureId: string } };

/** Read and validate the Seneschal DnD payload from a drag event. */
export function readDndPayload(e: React.DragEvent | DragEvent): DndPayload | null {
  const dt = (e as DragEvent).dataTransfer;
  if (!dt) return null;
  const raw = dt.getData(SENESCHAL_DND_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as { kind?: unknown; payload?: unknown };
    if (obj.kind === 'combatant') {
      const p = obj.payload as { uid?: unknown } | undefined;
      if (p && typeof p.uid === 'string') {
        return { kind: 'combatant', payload: { uid: p.uid } };
      }
    } else if (obj.kind === 'creatureRecord') {
      const p = obj.payload as { creatureId?: unknown } | undefined;
      if (p && typeof p.creatureId === 'string') {
        return { kind: 'creatureRecord', payload: { creatureId: p.creatureId } };
      }
    }
  } catch {
    // Fall through to null.
  }
  return null;
}

/** Serialize a Seneschal DnD payload onto a DataTransfer. */
export function writeDndPayload(dt: DataTransfer, payload: DndPayload): void {
  dt.setData(SENESCHAL_DND_MIME, JSON.stringify(payload));
}
