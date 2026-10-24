import { useT } from '@/hooks/useT';
import { PRIVACY_EMAIL } from '@/app-info';

export function PrivacyInformation() {
  const { t } = useT();
  return <div className="privacy-information">
    <p>{t('privacy.intro')}</p>
    <h3>{t('privacy.todoistTitle')}</h3>
    <p>{t('privacy.todoist')}</p>
    <h3>{t('privacy.measureTitle')}</h3>
    <p>{t('privacy.measure')}</p>
    <p>{t('privacy.contact')} <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a></p>
  </div>;
}
