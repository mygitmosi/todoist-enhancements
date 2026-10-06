import { describe, expect, it } from 'vitest';
import { splitPastedList } from './pastedList';

describe('a pasted list (#152)', () => {
  it('is one title per line, in order, whether or not it has bullets', () => {
    expect(splitPastedList('Buy milk\nCall the garage\nBook a dentist appointment')).toEqual([
      'Buy milk', 'Call the garage', 'Book a dentist appointment',
    ]);
    expect(splitPastedList('- Buy milk\n- Call the garage\n- Book a dentist appointment')).toEqual([
      'Buy milk', 'Call the garage', 'Book a dentist appointment',
    ]);
  });

  it('takes recognised bullets off, and Markdown task boxes with them', () => {
    expect(splitPastedList('• one\n* two\n– three\n- [ ] four\n- [x] five')).toEqual([
      'one', 'two', 'three', 'four', 'five',
    ]);
  });

  it('keeps punctuation that belongs to the title', () => {
    expect(splitPastedList('-5 degrees tonight\n*important* call\nReview (5 pages)!\n1. Intro')).toEqual([
      '-5 degrees tonight', '*important* call', 'Review (5 pages)!', '1. Intro',
    ]);
  });

  it('ignores blank lines and surrounding spaces, and reads any line ending', () => {
    expect(splitPastedList('  one  \r\n\r\n   \r\n\ttwo\t\rthree\n')).toEqual(['one', 'two', 'three']);
  });

  it('is not a list with fewer than two non-empty lines', () => {
    expect(splitPastedList('')).toBeNull();
    expect(splitPastedList('Just one line')).toBeNull();
    expect(splitPastedList('One line\n\n   \n')).toBeNull();
    expect(splitPastedList('- \n- Only one')).toBeNull();
  });
});
