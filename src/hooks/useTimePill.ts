import { useStore } from '@/store/store';
import type { TimePillProps } from '@/components/PageHeader';

/**
 * What a page hands its header to offer the "I have time" pill (#159).
 *
 * The duration and the panel being open live in the store, not in the page:
 * moving from one page to the next keeps the question, and only the page the
 * pill was opened from decides what "in this page" means.
 */
export function useTimePill(): TimePillProps {
  const minutes = useStore((s) => s.timeFilter.minutes);
  const open = useStore((s) => s.sidePanel === 'time');
  const openSidePanel = useStore((s) => s.openSidePanel);
  const closeSidePanel = useStore((s) => s.closeSidePanel);
  const setTimeFilter = useStore((s) => s.setTimeFilter);
  return {
    minutes,
    open,
    onToggle: () => (open ? closeSidePanel('time') : openSidePanel('time')),
    onClear: () => setTimeFilter({ minutes: null }),
  };
}
