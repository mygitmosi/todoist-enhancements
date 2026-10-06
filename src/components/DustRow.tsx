import { useConfirm } from '@/components/overlays/Confirm';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { ageInMonths } from '@/domain/views';
import type { Item } from '@/domain/types';

/** How long a task has been there, in the group's warm colour (#161). */
export function DustAge({ item }: { item: Item }) {
  const { t } = useT();
  return <span className="dustage">{t('dust.age', { count: ageInMonths(item) })}</span>;
}

/**
 * The three things to do with a task that has been gathering dust: commit to
 * it this week, keep it on purpose, or let it go.
 *
 * Each one is the app's own path rather than a copy of it: "This week" is the
 * same send as dropping on Anytime this week, with its toast and undo; Delete
 * asks first and then goes through the same deletion, which brings the
 * subtasks back with it on undo; Keep is only a note on this device.
 */
export function DustActions({ item }: { item: Item }) {
  const { t } = useT();
  const sendTo = useStore((s) => s.sendTo);
  const removeTask = useStore((s) => s.removeTask);
  const keepInSomeday = useStore((s) => s.keepInSomeday);
  const confirm = useConfirm();

  const remove = () => {
    void confirm({
      title: t('task.deleteTitle'),
      body: t('task.deleteConfirm', { name: item.content }),
      confirmLabel: t('task.delete'),
      destructive: true,
    }).then((ok) => { if (ok) void removeTask(item.id); });
  };

  return (
    <span className="dustacts" onClick={(e) => e.stopPropagation()}>
      <button
        className="btn sm quiet"
        title={t('dust.thisWeekHint')}
        onClick={() => void sendTo(item.id, { kind: 'anytime' }, t('nav.week'))}
      >
        {t('dust.thisWeek')}
      </button>
      <button
        className="btn sm quiet"
        title={t('dust.keepHint')}
        onClick={() => keepInSomeday(item.id)}
      >
        {t('dust.keep')}
      </button>
      <button className="btn sm quiet del" onClick={remove}>
        {t('dust.delete')}
      </button>
    </span>
  );
}
