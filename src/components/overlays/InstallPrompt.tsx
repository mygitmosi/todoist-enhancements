import { useEffect, useState } from 'react';
import { Overlay } from './Overlay';
import { overlayCount } from './overlayStack';
import { Icon } from '../Icon';
import { useT } from '@/hooks/useT';
import { usePhone } from '@/hooks/usePhone';
import {
  countVisit, finishInstall, installNow, installWay, onInstallChange, shouldOffer, snoozeInstall, type InstallWay,
} from '@/lib/install';

/** Safari's Share glyph: a square with an arrow leaving it. */
const Share = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M8 7l4-4 4 4M5 12v8h14v-8" />
  </svg>
);
const AddBox = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" />
  </svg>
);

/**
 * An invitation to put the app on the home screen (#273), once a phone has
 * seen it twice: it opens full screen, without the browser's bar. "Later"
 * hides it for a week, and what is done is done; nothing on a wide screen,
 * and nothing once the app is installed.
 */
export function InstallPrompt() {
  const { t } = useT();
  const phone = usePhone();
  const [way, setWay] = useState<InstallWay | null>(null);

  useEffect(() => {
    if (!phone) return;
    countVisit();
    /* Not over something already open, and not the instant the app appears:
       the first screen has to be seen before it is asked anything. */
    const ask = () => {
      if (overlayCount() > 0 || !shouldOffer()) return;
      setWay(installWay());
    };
    const timer = window.setTimeout(ask, 2500);
    const off = onInstallChange(() => window.setTimeout(ask, 500));
    return () => { window.clearTimeout(timer); off(); };
  }, [phone]);

  if (!way) return null;
  const later = () => { snoozeInstall(); setWay(null); };
  const done = () => { finishInstall(); setWay(null); };

  return (
    <Overlay open onClose={later} label={t('install.title')} size="sm">
      <div className="installprompt">
        <div className="sheet-head">
          <span />
          <button className="iconbtn" aria-label={t('common.close')} onClick={later}><Icon name="close" /></button>
        </div>
        <div className="sheet-body">
          <div className="install-id">
            <img src="/icon-192.png" alt="" width={60} height={60} />
            <div>
              <h2>{t('install.title')}</h2>
              <span>{t('install.name')}</span>
            </div>
          </div>
          <p className="install-why">{t('install.why')}</p>
          {way === 'ios' ? (
            <ol className="install-steps">
              <li><span>{t('install.ios1')} <b className="ico"><Share /></b></span></li>
              <li><span>{t('install.ios2')} <b className="ico"><AddBox /></b></span></li>
              <li><span>{t('install.ios3')}</span></li>
            </ol>
          ) : (
            <p className="install-why">{t('install.prompt')}</p>
          )}
        </div>
        <div className="install-foot">
          <button className="btn" onClick={later}>{t('install.later')}</button>
          {way === 'ios'
            ? <button className="btn primary" onClick={done}>{t('install.gotIt')}</button>
            : <button className="btn primary" onClick={() => void installNow().then((installed) => { if (installed) setWay(null); })}>{t('install.install')}</button>}
        </div>
      </div>
    </Overlay>
  );
}
