import { ApiError, request } from './client';
import type { CompletedItem, Item, Note } from '@/domain/types';

/**
 * One task read straight from Todoist, completed ones included.
 *
 * The sync only carries open tasks, so a task ticked off before this device
 * last synced is not in the snapshot. `GET /tasks/{id}` answers for it all the
 * same, with `checked: true`. Null when Todoist no longer has it (deleted).
 */
export async function fetchTask(id: string): Promise<Item | null> {
  try {
    const task = await request<Partial<Item> & { is_collapsed?: boolean }>(`/tasks/${id}`);
    return toItem(task);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

/** A task's comments, oldest first. */
export async function fetchComments(taskId: string): Promise<Note[]> {
  const notes: Note[] = [];
  let cursor: string | undefined;
  do {
    const page = await request<{ results?: Array<Partial<Note> & { task_id?: string }>; next_cursor?: string | null }>(
      '/comments', { query: { task_id: taskId, cursor } },
    );
    for (const note of page.results ?? []) {
      notes.push({
        ...note,
        item_id: note.item_id ?? note.task_id ?? taskId,
        project_id: note.project_id ?? null,
        is_deleted: note.is_deleted ?? false,
      } as Note);
    }
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return notes;
}

/** Fills in what the REST answer leaves out, so every list can read it. */
function toItem(task: Partial<Item> & { is_collapsed?: boolean }): Item {
  return {
    user_id: '',
    section_id: null,
    parent_id: null,
    description: '',
    priority: 1,
    due: null,
    deadline: null,
    duration: null,
    labels: [],
    child_order: 0,
    day_order: -1,
    checked: false,
    is_deleted: false,
    added_at: null,
    completed_at: null,
    updated_at: null,
    responsible_uid: null,
    ...task,
    collapsed: task.collapsed ?? task.is_collapsed ?? false,
  } as Item;
}

/**
 * A task drawn from its Logbook entry alone: what the demo has, and what is
 * shown for a task Todoist could not be asked about.
 */
export function itemFromCompleted(entry: CompletedItem): Item {
  return toItem({
    id: entry.task_id ?? entry.id,
    user_id: entry.user_id,
    project_id: entry.project_id,
    section_id: entry.section_id,
    content: entry.content,
    labels: entry.labels ?? [],
    priority: entry.priority ?? 1,
    checked: true,
    completed_at: entry.completed_at,
    note_count: entry.note_count,
  });
}
