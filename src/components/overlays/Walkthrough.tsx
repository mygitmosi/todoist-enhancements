import { canStoreDurations } from '@/domain/estimates';
import { useEffect, useState } from 'react';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import {
  AccentChoice, DensityChoice, EstimateStorageChoice, TaskChipsChoice, ThemeChoice,
} from '../Choosers';
import { WorkspacePreview, type PreviewStage } from '../WorkspacePreview';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { markOnboarded } from '@/domain/onboarding';
import { WEEK_LAYOUTS } from '@/store/prefs';
import type { TranslationKey } from '@/i18n';

/**
 * The first run, once, per account.
 *
 * Five short screens, one decision each, in a compact neutral window: the
 * picture of the workspace above, the choice under it, and the same two
 * buttons in the same place on every one. Nothing here has to be answered for
 * the app to work, every answer is already a defensible default, and every
 * one of them is in Settings afterwards: this is a greeting that happens to be
 * adjustable rather than a form standing between somebody and their tasks.
 *
 * Each choice takes effect the moment it is made, on the app behind the
 * dialog as well as in the picture inside it. The picture shows what the
 * choice does to a list and a sidebar; it is never a place to act on a real
 * task. Estimate storage, which is about where a number is kept and not about
 * how anything looks, has no picture, and nothing is converted.
 *
 * The settings are written immediately; the *record of having been asked* is
 * written by "Use these settings" or by the last step. Closing the window
 * means being asked again rather than silently never being asked. Going back,
 * or opening it again from Settings, shows the choices as they are now.
 */
const STEPS = [
  { id: 'appearance', preview: 'appearance' },
  { id: 'accent', preview: 'accent' },
  { id: 'density', preview: 'density' },
  { id: 'organise', preview: 'organisation' },
  { id: 'estimates', preview: null },
] as const satisfies ReadonlyArray<{ id: string; preview: PreviewStage | null }>;

export function Walkthrough({
  open, onDone,
}: { open: boolean; onDone: () => void }) {
  const { t } = useT();
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const user = useStore((s) => s.snapshot.user);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  // Replaying it starts from the first screen, with what is chosen now.
  useEffect(() => { if (open) setStep(0); }, [open]);

  /* Finishing records the account and hands over to the tour. "Use these
     settings" records it too and stops there: somebody who skipped the rest
     did not ask to be shown round either. */
  const finish = () => {
    markOnboarded(user?.id);
    // With the settings too, so the account's other browsers know.
    setPrefs({
      onboarded: true,
      estimateStorage: prefs.estimateStorage === 'duration' && canStoreDurations(user) ? 'duration' : 'tag',
    });
    setStep(0);
    onDone();
  };

  const title = t(`setup.${current.id}.title` as TranslationKey);
  const hint = t(`setup.${current.id}.hint` as TranslationKey);

  return (
    <Overlay
      open={open}
      /* The scrim and Escape both land here. Leaving early is leaving, not
         finishing: it is not recorded, so the next launch asks again. */
      onClose={onDone}
      label={t('walkthrough.title')}
      size="md"
    >
      <div className="setup" data-step={current.id}>
        <header className="setup-head">
          <div>
            <h2>{title}</h2>
            <p>{hint}</p>
          </div>
          <button className="setup-skip" onClick={finish}>{t('setup.useThese')}</button>
        </header>

        <div className="setup-body">
          {current.preview && (
            <div className="setup-preview">
              <WorkspacePreview stage={current.preview} layout="stage" />
            </div>
          )}

          <div className="setup-controls">
            {current.id === 'appearance' && (
              <ThemeChoice value={prefs.theme} onChange={(theme) => setPrefs({ theme })} />
            )}

            {current.id === 'accent' && (
              <AccentChoice
                value={prefs.accent}
                custom={prefs.accentCustom}
                onChange={(accent) => setPrefs({ accent })}
                onCustom={(accentCustom) => setPrefs({ accent: 'custom', accentCustom })}
              />
            )}

            {current.id === 'density' && (
              <div className="setup-pair">
                <div>
                  <h3>{t('settings.density')}</h3>
                  <DensityChoice value={prefs.density} onChange={(density) => setPrefs({ density })} />
                </div>
                <div>
                  <h3>{t('settings.taskChips')}</h3>
                  <TaskChipsChoice value={prefs.taskChips} onChange={(taskChips) => setPrefs({ taskChips })} />
                </div>
              </div>
            )}

            {current.id === 'organise' && (
              <div className="setup-organise">
                <div className="setup-layouts" role="radiogroup" aria-label={t('settings.weekLayout')}>
                  {WEEK_LAYOUTS.map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      role="radio"
                      aria-checked={prefs.weekLayout === layout}
                      className={prefs.weekLayout === layout ? 'selected' : undefined}
                      onClick={() => setPrefs({ weekLayout: layout })}
                    >
                      <span className={`setup-layout-picture ${layout}`} aria-hidden="true"><i /><i /></span>
                      <strong>{t(`setup.layout.${layout}` as TranslationKey)}</strong>
                      <small>{t(`setup.layout.${layout}Hint` as TranslationKey)}</small>
                      {prefs.weekLayout === layout && <Icon name="check" size="sm" />}
                    </button>
                  ))}
                </div>
                <div className="setup-switches">
                  <SwitchRow
                    icon="dashboard"
                    title={t('settings.eisenhower')}
                    hint={t('setup.eisenhowerHint')}
                    checked={prefs.eisenhowerEnabled}
                    onChange={() => setPrefs({ eisenhowerEnabled: !prefs.eisenhowerEnabled })}
                  />
                  <SwitchRow
                    icon="clock"
                    title={t('settings.showQuick')}
                    hint={t('setup.quickHint')}
                    checked={prefs.showQuickGroup}
                    onChange={() => setPrefs({ showQuickGroup: !prefs.showQuickGroup })}
                  />
                </div>
              </div>
            )}

            {current.id === 'estimates' && (
              <EstimateStorageChoice
                value={prefs.estimateStorage}
                allowed={canStoreDurations(user)}
                onChange={(value) => setPrefs({ estimateStorage: value })}
              />
            )}
          </div>
        </div>

        <footer className="setup-foot">
          <nav className="setup-progress" aria-label={t('walkthrough.step', { current: step + 1, total: STEPS.length })}>
            {STEPS.map((entry, at) => {
              const name = t(`setup.${entry.id}.title` as TranslationKey);
              return (
                <button
                  key={entry.id}
                  aria-label={name}
                  title={name}
                  aria-current={at === step ? 'step' : undefined}
                  onClick={() => setStep(at)}
                ><i /></button>
              );
            })}
          </nav>
          <div className="setup-actions">
            {step > 0 && (
              <button className="btn" onClick={() => setStep((at) => at - 1)}>
                <Icon name="arrow-left" size="sm" />
                {t('review.back')}
              </button>
            )}
            <button className="btn primary" onClick={() => (last ? finish() : setStep((at) => at + 1))}>
              {last ? t('walkthrough.finish') : t('setup.continue')}
              <Icon name="arrow-right" size="sm" />
            </button>
          </div>
        </footer>
      </div>
    </Overlay>
  );
}

/** A choice that is on or off: its words, and one switch that is not nested in anything else. */
function SwitchRow({ icon, title, hint, checked, onChange }: {
  icon: 'dashboard' | 'clock';
  title: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="setup-switch">
      <Icon name={icon} />
      <span><strong>{title}</strong><small>{hint}</small></span>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
      />
    </div>
  );
}
