import { useEffect, useState } from 'react';
import { Overlay } from './Overlay';
import { COLOUR_CHOICES } from './ProjectSheet';
import { Icon } from '../Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { colorValue, markerStyle } from '@/domain/colors';
import type { TranslationKey } from '@/i18n';

/** What the sheet was opened to do: make a tag, or change one by id. */
export type TagSheetTarget = { mode: 'create' } | { mode: 'edit'; labelId: string } | null;

/**
 * Making a tag, and changing its colour and star.
 *
 * The name is typed once, when the tag is made. Renaming one touches every
 * task that carries it and every setting kept under its name, which is its own
 * piece of work (#206), so an existing tag's name is shown here, not edited.
 */
export function TagSheet({ target, onClose }: { target: TagSheetTarget; onClose: () => void }) {
  const { t } = useT();
  const createLabel = useStore((s) => s.createLabel);
  const setLabelColour = useStore((s) => s.setLabelColour);
  const setLabelFavourite = useStore((s) => s.setLabelFavourite);
  const labels = useStore((s) => s.snapshot.labels);
  const editing = target?.mode === 'edit' ? labels[target.labelId] : undefined;

  const [name, setName] = useState('');
  const [color, setColor] = useState('charcoal');
  const [favourite, setFavourite] = useState(false);

  useEffect(() => {
    if (!target) return;
    setName(editing?.name ?? '');
    setColor(editing?.color ?? 'charcoal');
    setFavourite(editing?.is_favorite ?? false);
    // Read once, on opening: later edits are the user's draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  /* Todoist tag names carry no spaces; the store makes the same change. */
  const clean = name.trim().replace(/\s+/g, '-');
  const taken = !editing && Object.values(labels).some((l) => !l.is_deleted && l.name.toLowerCase() === clean.toLowerCase());
  const ready = editing ? true : clean !== '' && !taken;

  async function submit() {
    if (!ready || !target) return;
    onClose();
    if (editing) {
      if (color !== editing.color) await setLabelColour(editing.id, color);
      if (favourite !== editing.is_favorite) await setLabelFavourite(editing.id, favourite);
      return;
    }
    await createLabel(clean, color, favourite);
  }

  const title = editing ? t('labels.edit') : t('labels.new');

  return (
    <Overlay open={target !== null} onClose={onClose} label={title} size="sm">
      <div className="sheet-head">
        <h2>{title}</h2>
        <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <div className="sheet-body projectform">
        {/* One line, not two: a tag has a name and no description, so the
            card is drawn smaller and its name sits in the middle of it. */}
        <div className="pcx pcx-single" style={{ '--c': colorValue(color) } as React.CSSProperties}>
          <span className="pcx-icon static">
            <span className="hash" style={markerStyle(color)}><Icon name="tag" size="sm" /></span>
          </span>
          <div className="pcx-main">
            {editing ? (
              <span className="pcx-name">{editing.name}</span>
            ) : (
              <input
                className="pcx-name"
                data-autofocus
                value={name}
                placeholder={t('labels.newPlaceholder')}
                aria-label={t('labels.name')}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
                /* Kept from reaching the button focus returns to. */
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
              />
            )}
            {taken && <span className="pcx-desc filtererror">{t('labels.taken')}</span>}
          </div>
          <button
            type="button"
            className={`starbtn${favourite ? ' on' : ''}`}
            aria-pressed={favourite}
            title={t(favourite ? 'labels.unfavourite' : 'labels.favourite')}
            aria-label={t('labels.favourite')}
            onClick={() => setFavourite((v) => !v)}
          >
            <Icon name="star" size="sm" />
          </button>
        </div>

        <div className="formfield">
          <span className="fieldlabel" id="tag-colour">
            {t('project.colour')}
            <b className="cname">{t(`colour.${color}` as TranslationKey)}</b>
          </span>
          <div className="swatches" role="radiogroup" aria-labelledby="tag-colour">
            {COLOUR_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                role="radio"
                className={`swatch${color === choice ? ' selected' : ''}`}
                style={{ '--swatch': colorValue(choice) } as React.CSSProperties}
                aria-label={t(`colour.${choice}` as TranslationKey)}
                title={t(`colour.${choice}` as TranslationKey)}
                aria-checked={color === choice}
                onClick={() => setColor(choice)}
              >
                {color === choice && <Icon name="check" size="sm" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sheet-foot">
        <button className="btn quiet" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn primary" disabled={!ready} onClick={() => void submit()}>
          {editing ? t('common.save') : t('labels.create')}
        </button>
      </div>
    </Overlay>
  );
}
