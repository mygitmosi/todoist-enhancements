import { useEffect, useMemo, useRef, useState } from 'react';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { useT } from '@/hooks/useT';
import { renderTitle } from '@/domain/markdown';
import {
  localisedReleases, parseChangelog, type ChangeKind, type Release,
} from '@/domain/changelog';
import { COFFEE_URL, GITHUB_URL, VERSION } from '@/app-info';
import type { TranslationKey } from '@/i18n';

/**
 * Which releases the dialog is showing: the ones not seen yet after an
 * update, or the whole history when it is opened from Settings.
 */
export type WhatsNewScope = { versions: string[] } | 'all';

interface WhatsNewProps {
  scope: WhatsNewScope | null;
  onClose: () => void;
}

/**
 * The two changelogs, fetched only when the dialog opens.
 *
 * The English file is the whole history since 0.1 and has no business in the
 * bundle every page load downloads; the dialog is shown once per release.
 */
function useChangelog(open: boolean, locale: string) {
  const [releases, setReleases] = useState<Array<Release & { untranslated: boolean }> | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.all([
      import('../../../CHANGELOG.md?raw').then((m) => m.default),
      locale === 'fr'
        ? import('../../../CHANGELOG.fr.md?raw').then((m) => m.default)
        : Promise.resolve(null),
    ]).then(([english, french]) => {
      if (cancelled) return;
      setReleases(localisedReleases(
        parseChangelog(english),
        french === null ? null : parseChangelog(french),
      ));
    });
    return () => { cancelled = true; };
  }, [open, locale]);
  return releases;
}

const KIND_LABEL: Record<ChangeKind, TranslationKey> = {
  new: 'whatsNew.kind.new',
  design: 'whatsNew.kind.design',
  fix: 'whatsNew.kind.fix',
};

/** The id a release's section carries, for the pills that jump to it. */
const anchorOf = (version: string) => `whatsnew-${version.replace(/\./g, '-')}`;

/**
 * What changed, said inside the app (#115).
 *
 * Shown once after an update that brings something new, and on demand from
 * Settings. A list, not a showcase: the same lines the changelog on GitHub
 * carries, with the same three marks, in the reader's language where the
 * release has been translated. The title and the buttons hold still while
 * the list scrolls between them.
 *
 * After an update the title names the version, and a single release is its
 * list and nothing else: a heading repeating the version and a paragraph
 * summing up the list below it were two ways of saying the title again. The
 * whole history, from Settings, keeps a heading per release and a row of
 * pills to jump from one to the next.
 */
export function WhatsNew({ scope, onClose }: WhatsNewProps) {
  const { t, locale } = useT();
  const open = scope !== null;
  const all = useChangelog(open, locale);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<string | null>(null);

  const shown = useMemo(() => {
    if (!all || !scope) return [];
    if (scope === 'all') return all;
    return all.filter((release) => scope.versions.includes(release.version));
  }, [all, scope]);

  const history = scope === 'all';
  /* One release after an update: no heading of its own, the title says it. */
  const headings = history || shown.length > 1;
  const titleText = history
    ? t('whatsNew.historyTitle')
    : t('whatsNew.title', { version: VERSION });

  /* The pill of the release being read follows the scroll. */
  useEffect(() => {
    if (!history || shown.length === 0) return;
    setCurrent(shown[0].version);
    const body = bodyRef.current;
    if (!body) return;
    const onScroll = () => {
      const top = body.getBoundingClientRect().top;
      let at = shown[0].version;
      for (const release of shown) {
        const section = body.querySelector<HTMLElement>(`#${anchorOf(release.version)}`);
        if (section && section.getBoundingClientRect().top - top <= 24) at = release.version;
      }
      setCurrent(at);
    };
    body.addEventListener('scroll', onScroll, { passive: true });
    return () => body.removeEventListener('scroll', onScroll);
  }, [history, shown]);

  /* The pill of the release being read stays in the row's view. */
  const pillsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!current) return;
    pillsRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current]);

  const jump = (version: string) => {
    const body = bodyRef.current;
    const section = body?.querySelector<HTMLElement>(`#${anchorOf(version)}`);
    if (!body || !section) return;
    body.scrollTo({
      top: section.offsetTop - body.offsetTop - 8,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    setCurrent(version);
  };

  return (
    <Overlay open={open} onClose={onClose} label={titleText} size="sm">
      <div className="whatsnew">
        <div className="sheet-head whatsnew-head">
          <h2>{titleText}</h2>
          <button
            className="iconbtn"
            aria-label={t('common.close')}
            title={t('common.close')}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        {history && shown.length > 1 && (
          <nav className="whatsnew-pills" ref={pillsRef} aria-label={t('whatsNew.versions')}>
            {shown.map((release) => (
              <button
                key={release.version}
                type="button"
                className="whatsnew-pill"
                aria-current={current === release.version ? 'true' : undefined}
                onClick={() => jump(release.version)}
              >
                {release.version}
              </button>
            ))}
          </nav>
        )}

        <div className="whatsnew-body" ref={bodyRef}>
          {all === null && <p className="whatsnew-loading">{t('common.loading')}</p>}
          {shown.map((release) => (
            <section
              className="whatsnew-release"
              key={release.version}
              id={anchorOf(release.version)}
              aria-label={t('whatsNew.version', { version: release.version })}
            >
              {headings && (
                <h3>
                  {t('whatsNew.version', { version: release.version })}
                  {release.untranslated && (
                    <small className="whatsnew-lang">{t('whatsNew.untranslated')}</small>
                  )}
                </h3>
              )}
              {history && release.intro && <p className="whatsnew-intro">{release.intro}</p>}
              <ul>
                {release.changes.map((change, at) => (
                  <li className={`whatsnew-change ${change.kind}`} key={at}>
                    <span
                      className="whatsnew-mark"
                      role="img"
                      aria-label={t(KIND_LABEL[change.kind])}
                      title={t(KIND_LABEL[change.kind])}
                    >
                      {change.mark}
                    </span>
                    {/* The file is ours, and the renderer escapes it before
                        adding the few inline tags it knows. */}
                    <span dangerouslySetInnerHTML={{ __html: renderTitle(change.text) }} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {history && all !== null && (
            <p className="whatsnew-more">
              <a href={`${GITHUB_URL}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer noopener">
                <Icon name="external" size="sm" />
                {t('whatsNew.onGitHub')}
              </a>
            </p>
          )}
        </div>

        <div className="sheet-foot whatsnew-foot">
          <a className="btn coffee" href={COFFEE_URL} target="_blank" rel="noreferrer noopener">
            <Icon name="coffee" size="sm" />
            {t('coffee.offer')}
          </a>
          <button className="btn primary" data-autofocus onClick={onClose}>
            {t('whatsNew.continue')}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
