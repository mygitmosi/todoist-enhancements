import { describe, expect, it } from 'vitest';
import { splitQuery } from './filters';

describe('splitQuery', () => {
  it('keeps a query with no comma whole', () => {
    expect(splitQuery('today & p1')).toEqual(['today & p1']);
  });

  it('cuts at top-level commas, one list per part', () => {
    expect(splitQuery('overdue, today ,  p1')).toEqual(['overdue', 'today', 'p1']);
  });

  it('leaves commas inside parentheses alone', () => {
    expect(splitQuery('(a, b) & c, d')).toEqual(['(a, b) & c', 'd']);
  });

  it('leaves an escaped comma in a name alone', () => {
    expect(splitQuery('#Work\\, home & today, overdue')).toEqual(['#Work\\, home & today', 'overdue']);
  });

  it('drops empty parts', () => {
    expect(splitQuery('today,, ,overdue,')).toEqual(['today', 'overdue']);
  });
});
