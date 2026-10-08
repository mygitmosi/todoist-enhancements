import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { markerStyle } from '@/domain/colors';

/** What a preview is about, so it shows only what the choice beside it changes. */
export type PreviewStage = 'appearance' | 'accent' | 'density' | 'organisation' | 'metadata';

/**
 * A small picture of the workspace that follows the choices made beside it.
 *
 * It is drawn from the same tokens and the same chip rules as the real
 * page, so a colour, a density, a chip mode or a layout is shown exactly as it
 * will look; the tasks in it are illustrative and are not a second task store,
 * and nothing in it can be clicked, focused or changed (#177, #178). The
 * Quick Tasks callout is blue whatever the accent is, Eisenhower is only ever
 * a destination in the sidebar, and a split week gets its own Today.
 */
export function WorkspacePreview({ stage, layout = 'inline' }: {
  stage: PreviewStage;
  /** `inline` sits between settings; `stage` fills the room a setup step gives it. */
  layout?: 'inline' | 'stage';
}) {
  const { t } = useT();
  const density = useStore((s) => s.prefs.density);
  const weekLayout = useStore((s) => s.prefs.weekLayout);
  const eisenhower = useStore((s) => s.prefs.eisenhowerEnabled);
  const quick = useStore((s) => s.prefs.showQuickGroup);
  const organisation = stage === 'organisation';
  const split = organisation && weekLayout === 'split';

  return (
    <aside
      className={`polish-preview ${layout === 'stage' ? 'preview-stage-fill' : 'preview-inline'}`}
      data-density={density}
      data-stage={stage}
      role="img"
      aria-label={t('preview.title')}
    >
      <div className="preview-workspace" aria-hidden="true">
        <div className="preview-sidebar">
          <div className="preview-person"><b>RH</b><span>{t('preview.person')}</span></div>
          <div className="preview-search"><Icon name="search" />{t('nav.search')}</div>
          <span className="preview-nav"><Icon name="inbox" />{t('nav.inbox')}</span>
          {split && <span className="preview-nav"><Icon name="calendar" />{t('nav.today')}</span>}
          <span className="preview-nav preview-active"><Icon name="week" />{t('nav.week')}</span>
          <span className="preview-nav"><Icon name="upcoming" />{t('nav.upcoming')}</span>
          {organisation && eisenhower && (
            <span className="preview-nav"><Icon name="dashboard" />{t('nav.matrix')}</span>
          )}
          <div className="preview-projects">
            <small>{t('nav.favourites')}</small>
            <span># Website</span>
          </div>
          <span className="preview-add"><Icon name="plus" />{t('nav.addTask')}</span>
        </div>
        <section className="preview-content">
          <div className="preview-pagehead">
            <h3>{t('nav.week')}</h3>
            <div><Icon name="sliders" /><Icon name="trend" /></div>
          </div>
          <div className="preview-summary">{t('preview.summary')}</div>
          {stage === 'accent' ? (
            <div className="preview-composer">
              <strong>{t('preview.task.homepage')}</strong>
              <p>{t('preview.composer.desc')}</p>
              <div className="meta">
                <span className="at"><Icon name="calendar" size="sm" />{t('common.today')}</span>
                <span className="proj" style={markerStyle('blue')}># Website</span>
              </div>
              <footer>
                <span>{t('common.cancel')}</span>
                <span className="preview-primary">{t('composer.add')}</span>
              </footer>
            </div>
          ) : (
            <>
              {organisation && quick && (
                <div className="preview-group preview-callout">
                  <h4>{t('group.quick')}<span>2</span></h4>
                  <PreviewTask title={t('preview.task.proposal')} minutes="5 min" />
                  <PreviewTask title={t('preview.task.meeting')} minutes="3 min" />
                </div>
              )}
              <div className="preview-group">
                <h4>{split ? t('group.anytime') : t('common.today')}<span>3</span></h4>
                <PreviewTask
                  title={t('preview.task.homepage')} description={t('preview.task.homepageDesc')} minutes="45 min"
                />
                <PreviewTask title={t('preview.task.invoice')} minutes="10 min" />
              </div>
              {!split && (
                <div className="preview-group">
                  <h4>{t('group.anytime')}<span>4</span></h4>
                  <PreviewTask
                    title={t('preview.task.rebuild')} description={t('preview.task.rebuildDesc')} minutes="2 h"
                  />
                  <div className="preview-subtask">
                    <PreviewTask title={t('preview.task.images')} minutes="30 min" />
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </aside>
  );
}

function PreviewTask({ title, description, minutes }: {
  title: string; description?: string; minutes: string;
}) {
  const { t } = useT();
  return (
    <div className="preview-task">
      <span className="check p4" />
      <div>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
        <span className="meta">
          <span className="at"><Icon name="calendar" size="sm" />{t('common.today')}</span>
          <span className="est"><Icon name="clock" size="sm" />{minutes}</span>
          <span className="proj" style={markerStyle('blue')}># Website</span>
        </span>
      </div>
    </div>
  );
}
