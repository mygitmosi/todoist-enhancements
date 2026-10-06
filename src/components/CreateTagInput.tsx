import { useState } from 'react';
import { useCreateTag } from '@/hooks/useCreateTag';
import { useT } from '@/hooks/useT';
import { Icon } from './Icon';

export function CreateTagInput({ onCreated }: { onCreated: (name: string) => void }) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const tag = useCreateTag(query);
  async function create() {
    const name = await tag.create();
    if (name) { onCreated(name); setQuery(''); }
  }
  return <div className="create-tag-input">
    <div className="pickersearch"><Icon name="plus" size="sm" /><input value={query} aria-label={t('estimates.newTag')} placeholder={t('estimates.newTag')} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && tag.available) { event.preventDefault(); event.stopPropagation(); void create(); } }} /></div>
    {tag.available && <button className="opt" disabled={tag.busy} onClick={() => void create()}><Icon name="plus" size="sm" />{t('estimates.createTag', { name: tag.name })}</button>}
  </div>;
}
