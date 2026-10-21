import { playCompletionSound } from '@/lib/completionSound';
import { useStore } from './store';

/**
 * The completion sound, played by whatever handles the click on a tick box.
 *
 * It belongs to the click, not to the store: a row lingers a moment before
 * the task is really completed, and the sound has to answer the finger, not
 * the row leaving. Pass the task being ticked: re-opening one is silent.
 */
export function completionTick(item?: { checked: boolean }): void {
  if (item?.checked) return;
  const choice = useStore.getState().prefs.completionSoundChoice;
  if (choice !== 'none') playCompletionSound(choice);
}
