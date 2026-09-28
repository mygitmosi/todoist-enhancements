import { describe, expect, it } from 'vitest';
import { parseShorthand } from './shorthand';
import { emptySnapshot, type Project, type Section, type Snapshot } from './types';

const project = (id: string, name: string): Project => ({
  id, name, color: 'grey', parent_id: null, child_order: 1,
  is_archived: false, is_deleted: false, is_favorite: false, workspace_id: null,
});
const section = (id: string, project_id: string, name: string): Section => ({
  id, project_id, name, section_order: 1, is_archived: false, is_deleted: false,
});

const snapshot: Snapshot = {
  ...emptySnapshot(),
  projects: {
    alias: project('alias', 'aliasdigital.'),
    perso: project('perso', 'Perso'),
    rd: project('rd', 'R&D'),
    home: project('home', 'Maison 🏡'),
  },
  sections: {
    site: section('site', 'alias', 'Site internet'),
    admin: section('admin', 'perso', 'Admin'),
  },
};

const read = (raw: string) => parseShorthand(raw, snapshot, false);
const marked = (raw: string) => {
  const range = read(raw).ranges.find((r) => r.kind === 'project');
  return range ? raw.slice(range.start, range.end) : null;
};

describe('#project names with any character (#102)', () => {
  it('reads a project whose name ends with a full stop, as the list inserts it', () => {
    const parsed = read('Refaire le site #aliasdigital. ');
    expect(parsed.projectId).toBe('alias');
    expect(marked('Refaire le site #aliasdigital. ')).toBe('#aliasdigital.');
  });

  it('reads a project and its section, the section squashed as the list inserts it', () => {
    const parsed = read('Refaire #aliasdigital./Siteinternet ');
    expect(parsed.projectId).toBe('alias');
    expect(parsed.sectionId).toBe('site');
    expect(marked('Refaire #aliasdigital./Siteinternet ')).toBe('#aliasdigital./Siteinternet');
  });

  it('lets go of the full stop that ends a sentence', () => {
    expect(read('Appeler Anne #Perso.').projectId).toBe('perso');
    expect(marked('Appeler Anne #Perso.')).toBe('#Perso');
    expect(read('Ranger #Perso/Admin.').sectionId).toBe('admin');
  });

  it('reads names with & and emoji', () => {
    expect(read('Budget #R&D').projectId).toBe('rd');
    expect(read('Peindre #Maison🏡').projectId).toBe('home');
  });

  it('still reads a plain project, and nothing when the name does not exist', () => {
    expect(read('Courses #perso').projectId).toBe('perso');
    expect(read('Courses #inconnu').projectId).toBeNull();
    expect(read('C# est un langage').projectId).toBeNull();
  });

  it('gives the reading up when it is refused', () => {
    const raw = 'Refaire #aliasdigital. ';
    const start = raw.indexOf('#');
    expect(parseShorthand(raw, snapshot, false, [{ start, end: start + 14 }]).projectId).toBeNull();
  });
});
