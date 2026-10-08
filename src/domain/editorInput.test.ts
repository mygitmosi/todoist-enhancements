import { describe, expect, it } from 'vitest';
import { normalizeLink, richEnter } from './editorInput';
import { pressEnter } from './descriptionLines';
import { inlineSpans } from './inlineMarks';

describe('rich paragraph breaks', () => {
  it('carries bold to the next paragraph with balanced invisible delimiters', () => {
    expect(richEnter('**hello**', 7, pressEnter)).toEqual({line:'**hello**',next:'****',caret:2});
    expect(richEnter('**hello world**',7,pressEnter)).toEqual({line:'**hello**',next:'** world**',caret:2});
  });
  it('carries formatting in a checklist, leaving its checkbox outside the style', () => {
    expect(richEnter('- [ ] **hello**',13,pressEnter)).toEqual({line:'- [ ] **hello**',next:'- [ ] ****',caret:8});
  });
  it('ends a link at Enter while preserving nested bold on both paragraphs', () => {
    const text='**[hello world](https://free.fr)**';
    const result=richEnter(text,8,pressEnter);
    expect(result).toEqual({line:'**[hello](https://free.fr)**',next:'** world**',caret:2});
    expect(inlineSpans(result.line).map(s=>s.kind)).toEqual(['strong','link']);
  });
  it('does not extend a link when Enter follows its hidden closing delimiter', () => {
    const text='[hello](https://free.fr)';
    expect(richEnter(text,text.length,pressEnter)).toEqual({line:text,next:'',caret:0});
  });
});
describe('web addresses in the link dialog and clipboard', () => {
  it('accepts bare domains, paths, queries and explicit HTTP addresses', () => {
    for(const text of ['google.fr','www.free.fr/path?q=hello#anchor','example.dev:8080/test']) expect(normalizeLink(text)).toBe(`https://${text}`);
    expect(normalizeLink(' http://localhost:5195/ ')).toBe('http://localhost:5195/');
  });
  it('leaves ordinary text and unsafe schemes as text', () => {
    for(const text of ['word word','javascript:alert(1)','data:text/html,test','not-an-address','https://']) expect(normalizeLink(text)).toBeNull();
  });
});
