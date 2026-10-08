import { describe, expect, it } from 'vitest';
import { continuation, pressEnter, readLine } from './descriptionLines';

describe('what a line is (#158)', () => {
  it('reads headings, bullets, numbers, tasks and plain text', () => {
    expect(readLine('# Title')).toMatchObject({ kind: 'heading', level: 1, text: 'Title', prefix: '# ' });
    expect(readLine('### Small')).toMatchObject({ kind: 'heading', level: 3 });
    expect(readLine('###### Deep')).toMatchObject({ kind: 'heading', level: 3 });
    expect(readLine('- one')).toMatchObject({ kind: 'bullet', text: 'one', prefix: '- ' });
    expect(readLine('  * two')).toMatchObject({ kind: 'bullet', prefix: '  * ' });
    expect(readLine('3. three')).toMatchObject({ kind: 'number', n: 3, text: 'three' });
    expect(readLine('2) two')).toMatchObject({ kind: 'number', n: 2 });
    expect(readLine('- [ ] open')).toMatchObject({ kind: 'task', checked: false, text: 'open', prefix: '- [ ] ' });
    expect(readLine('* [x] done')).toMatchObject({ kind: 'task', checked: true, text: 'done' });
    expect(readLine('plain **bold**')).toMatchObject({ kind: 'paragraph', text: 'plain **bold**' });
  });

  it('leaves a hash with no space, a dash with no space, and an empty marker as the right thing', () => {
    expect(readLine('#hashtag').kind).toBe('paragraph');
    expect(readLine('-no space').kind).toBe('paragraph');
    expect(readLine('- ')).toMatchObject({ kind: 'bullet', text: '' });
    expect(readLine('- [ ]')).toMatchObject({ kind: 'task', text: '' });
  });
});

describe('Enter', () => {
  it('carries a list on, with the next number, and keeps the text after the caret', () => {
    expect(pressEnter('- milk', 6)).toEqual({ line: '- milk', next: '- ', caret: 2 });
    expect(pressEnter('2. milk', 7)).toEqual({ line: '2. milk', next: '3. ', caret: 3 });
    expect(pressEnter('- [x] milk', 10)).toEqual({ line: '- [x] milk', next: '- [ ] ', caret: 6 });
    expect(pressEnter('- milk eggs', 6)).toEqual({ line: '- milk', next: '- eggs', caret: 2 });
  });

  it('ends the list on an empty item: the marker goes and no line is added', () => {
    expect(pressEnter('- ', 2)).toEqual({ line: '', next: null, caret: 0 });
    expect(pressEnter('4. ', 3)).toEqual({ line: '', next: null, caret: 0 });
    expect(pressEnter('- [ ] ', 6)).toEqual({ line: '', next: null, caret: 0 });
  });

  it('splits an ordinary line where the caret is', () => {
    expect(pressEnter('hello world', 5)).toEqual({ line: 'hello', next: ' world', caret: 0 });
    expect(pressEnter('# Title', 7)).toEqual({ line: '# Title', next: '', caret: 0 });
  });

  it('does not continue a list from inside its marker', () => {
    expect(pressEnter('- milk', 1)).toEqual({ line: '-', next: ' milk', caret: 0 });
  });

  it('knows what comes after a line', () => {
    expect(continuation(readLine('plain'))).toBeNull();
    expect(continuation(readLine('  - nested'))).toBe('  - ');
  });
});
