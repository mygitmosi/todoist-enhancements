import { useEffect, useState } from 'react';
import { startOfDay } from 'date-fns';
import { msUntilNextDay } from '@/domain/dates';

/**
 * The local day it is right now, kept up to date while the page stays open.
 *
 * A view that works out "today" while it draws only knows what day it was the
 * last time something made it draw. Upcoming left open across midnight kept
 * its old first column and never added the new last one, so a task that had
 * just come inside the horizon stayed hidden until you left and came back
 * (#146). The value here changes exactly once per day: at the next midnight,
 * and when the tab comes back to the front or the device wakes, which is when a
 * timer that was set before the night can no longer be trusted.
 *
 * Views use it as a dependency of whatever they compute from the date, and as
 * the date they compute it from.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      const now = startOfDay(new Date());
      setToday((was) => (was.getTime() === now.getTime() ? was : now));
      if (timer !== undefined) clearTimeout(timer);
      /* A second past midnight, so a timer that fires a touch early still
         lands on the new day. */
      timer = setTimeout(check, msUntilNextDay(new Date()) + 1000);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };

    check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
    };
  }, []);

  return today;
}
