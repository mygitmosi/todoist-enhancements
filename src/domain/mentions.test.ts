import { describe, expect, it } from 'vitest';
import { encodeMentions, mentionQuery, mentionedUids, renderWithMentions } from './mentions';
import { renderMarkdown } from './markdown';

describe('mentions (#254)', () => {
  it("reads Todoist's own format", () => {
    expect(mentionedUids('[Demo a](todoist-mention://44999528) and [Jules B](todoist-mention://34215813)')).toEqual(['44999528', '34215813']);
  });

  it('starts a mention only after a space or at the start, never inside an e-mail', () => {
    expect(mentionQuery('Hi @al', 6)).toEqual({ start: 3, query: 'al' });
    expect(mentionQuery('@', 1)).toEqual({ start: 0, query: '' });
    expect(mentionQuery('write to anne@example', 21)).toBeNull();
  });

  it('stores picked names as Todoist mentions and leaves other text alone', () => {
    expect(encodeMentions('@Alex M can you check? cc @Sam', [{ id: '1', name: 'Alex M' }]))
      .toBe('[Alex M](todoist-mention://1) can you check? cc @Sam');
  });

  it('renders a mention as a chip, escaped', () => {
    expect(renderWithMentions('Hi [A<b>](todoist-mention://1)!', renderMarkdown)).toContain('<span class="mention">@A&lt;b&gt;</span>');
  });
});
