import { describe, expect, it } from 'vitest';
import { plainTitle, renderTitle, titleLinks } from './markdown';

describe('task titles with links (#101)', () => {
  it('renders a Markdown link and a bare address as anchors that open a new tab', () => {
    const html = renderTitle('Read [the brief](https://example.com/a_b) and https://todoist.com/x');
    expect(html).toContain('<a href="https://example.com/a_b" target="_blank" rel="noopener noreferrer">the brief</a>');
    expect(html).toContain('<a href="https://todoist.com/x"');
  });

  it('never lets markup through', () => {
    expect(renderTitle('<img src=x onerror=alert(1)>')).not.toContain('<img');
    expect(renderTitle('[x](javascript:alert(1))')).not.toContain('<a');
  });

  it('reads as plain words where a title is text', () => {
    expect(plainTitle('Read [the brief](https://example.com) **now**')).toBe('Read the brief now');
  });

  it('lists the links a title carries, in order', () => {
    expect(titleLinks('[a](https://a.com) then https://b.com')).toEqual([
      { label: 'a', href: 'https://a.com' },
      { label: 'https://b.com', href: 'https://b.com' },
    ]);
    expect(titleLinks('no links here')).toEqual([]);
  });
});

describe('bare domains without a scheme (#101 follow-up)', () => {
  it('links a bare domain typed with no http:// in front of it', () => {
    const html = renderTitle('Voir free.fr pour le tarif');
    expect(html).toContain('<a href="https://free.fr" target="_blank" rel="noopener noreferrer">free.fr</a>');
  });

  it('keeps the path, but not trailing punctuation from the sentence', () => {
    expect(renderTitle('Voir example.com/tarifs.'))
      .toContain('<a href="https://example.com/tarifs" target="_blank" rel="noopener noreferrer">example.com/tarifs</a>');
  });

  it('never turns an abbreviation, an initial or a decimal into a link', () => {
    for (const text of ['e.g. see the docs', 'M. Dupont a appelé', 'Verse 3.5 says']) {
      expect(renderTitle(text)).not.toContain('<a');
    }
  });

  it('leaves the domain half of an email address alone', () => {
    expect(renderTitle('Contact user@example.com')).not.toContain('<a');
  });

  it('is listed by titleLinks and plainTitle keeps its own text', () => {
    expect(titleLinks('Voir free.fr')).toEqual([{ label: 'free.fr', href: 'https://free.fr' }]);
    expect(plainTitle('Voir free.fr')).toBe('Voir free.fr');
  });
});
