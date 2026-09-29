# One component language (#114)

The same concept — a date, a place, a priority, a tag, an estimate — appears
in the composer, the task panel, a row's menus, the bulk bar, filters and
settings. This page is the inventory of where each one lives, which
implementation is the canonical one, which variants are legitimate, and what
is still left to migrate. A new recurring control extends a family here
instead of starting another one-off picker.

It is migrated one family at a time, never all at once.

## Foundations

All of them are tokens on `:root` (`src/styles/app.css`), redefined for dark
where the value depends on the scheme.

| Foundation | Tokens | Rule |
| --- | --- | --- |
| Type | `--fs-11` … `--fs-32` | 11 hint/meta · 12 helper text, secondary values · **13 field values, menu lines, labels in controls** · 14 task titles · 16 composer title · 20 sheet headings and the task panel's title · 26/32 page titles |
| Weight | 400 / 600 / 700 | 400 prose · 600 a value you set (field text, typed text) · 700 headings and a column's name |
| Spacing | `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 | Inside a control: `--s2`. Between controls in a group: `--s2`–`--s3`. Between groups: `--s4`–`--s5`. |
| Control height | `--ctl-h-sm` 28 · `--ctl-h` 34 · `--ctl-h-touch` 44 | A minimum, not a fixed height: content may make an instance taller. 44 wherever the phone layout applies. |
| Radius | `--r-xs` 4 · `--r-sm` 6 · `--r-md` 8 · `--r-ctl` 10 · `--r-lg` 12 · `--r-full` | 6 for a line inside a menu and a field inside a menu · 8 for a menu, a card · 10 for a standalone button or field · 12 for a sheet, a column, a group card · full for a chip or a pill |
| Icons | `--ic-sm` 14 · `--ic-md` 16 · `--ic-lg` 20 (`Icon size="sm" \| "md" \| "lg"`) | 14 beside a label or inside a dense control · 16 on its own (icon buttons) · 20 page-level. Stroke 1.75 everywhere. Muted (`--muted`) at rest, `--text` on hover, accent when it is the thing chosen. |
| Surfaces | `--surface`, `--subtle`, `--border`, `--border-strong`, `--sh-sm/md/lg` | A menu: surface + border + `--sh-md`. A sheet: `--sh-lg`. A field: surface + `--border-strong`. |
| Focus | `--focus-ring` + `--accent` edge | A field that has the keyboard: accent border and the soft ring. A line in a menu: accent-soft fill. A grid cell or a row: a 2px accent outline or inset border. Never removed without a replacement. |

## States

| State | Look | Where it is already right |
| --- | --- | --- |
| Hover | `--hover` fill, text to `--text` | every menu line, icon buttons |
| Focus (keyboard) | see Focus above | fields (`.pickersearch`), menu lines in the date picker, date grid, task rows |
| Selected / chosen | accent-soft fill + accent-dark text, or a ✓ at the end of the line | `Select` options, date grid (filled accent) |
| Picked (a selection of tasks) | `--row-marked` fill | task rows |
| Disabled | 40% opacity, no hover | date grid, date choices |
| Error | `--late` text, `--late-wash` behind | the typed date field when it reads nothing uses `--faint` instead: not an error, a "not yet" |
| Loading | `common.loading` text in `--muted`; no spinner | What's new, review |

## Popups

Every popup follows the same rules:

- **Placement.** Drawn into the document, never inside the thing that opened
  it, so no scrolling box can clip it; placed against its trigger, below by
  default, above only when that side has room and this one does not, and
  scrolling inside itself when neither does. (`DateField`, `Select`, the row
  menus since #111.)
- **Dismissal.** Escape closes the innermost popup only; a click outside
  closes it; closing gives the focus back to what opened it.
- **Keyboard.** The typed field has the caret on open. ↓ / ↑ walk the lines,
  Enter picks, and Enter never also reaches the row or list behind.
- **Touch.** On the phone layout a row's menus are sheets along the bottom
  edge with 44px lines.

## Families

Status: ✅ one implementation · 🟡 one behaviour, looks still differ · 🔴 two
implementations.

### Date and deadline — ✅ (#110)

| Where | Now |
| --- | --- |
| Row schedule menu (hover → calendar, ⌘S, T) | `DatePicker` in a `.rowmenu` |
| Bulk bar → Date (T on a selection) | `DatePicker` in a `.bulkpop` |
| Composer: Date, Deadline | `DateField variant="chip"` → `DatePicker` in a `.datepanel` |
| Task panel: Start date, Deadline | `DateField` → `DatePicker` |
| Insights: custom range | `DateField` with `min`/`max`, `clearable={false}` |

Canonical: **`DatePicker`** (`src/components/DatePicker.tsx`) — typed field,
suggestions, quick choices, month, context footer.
Legitimate variants: *acting on tasks* (row, bulk: the choices add This week
and Someday, via `taskShortcuts`) and *a field* (`DateField`: today,
tomorrow, next week, and Clear). Keyboard: #97, kept.

### Project and section — 🔴

| Where | Now |
| --- | --- |
| Row → Move (hover → folder, ⇧⌘M, V) | own list in `TaskActions.tsx` (`.movemenu`), typed filter |
| Bulk bar → Move | own list in `BulkBar.tsx` (`.bulkpop-list`) |
| Composer, task panel: Project | `PlacementField` → `Select` (searchable) |
| Title shorthand `#project/section` | `TaskNameField` list (`.namepicker`) |
| Project sheet: parent | `Select` |

Canonical to converge on: one **destination list** (projects, each followed
by its sections, typed filter on both names, the current one marked) used by
Move, bulk Move and `PlacementField`. The title's `#` list stays its own
variant: it is inline autocomplete, not a menu.

### Chips — a variant, not a family (#113)

The composer's planning line draws `DateField`, `PlacementField` and
`Select` with `variant="chip"`: the same pickers, a rounded face that says
the value, or a dashed "+ Deadline" while nothing is set (`unset`). The
estimate chip opens `EstimateField` in place. A new planning value in the
composer is one more chip on that line, using the same variant.

### Priority — 🟡

| Where | Now |
| --- | --- |
| Composer, task panel | `Select` |
| Bulk bar → Priority | own list |
| Keys 1–4 | no UI |
| Title shorthand `p1`–`p4` | mark |

Same values and flags everywhere; the bulk list should become the same
`Select` option rendering.

### Labels — 🔴

| Where | Now |
| --- | --- |
| Composer, task panel | `.tagpicker` popover, built twice (`Composer.tsx`, `TaskDetail.tsx`) |
| Bulk bar → Tags | own checkbox list (`.checkrow`), tri-state |
| Title shorthand `@tag` | `TaskNameField` list |

Canonical to converge on: one **tag picker** with the bulk bar's tri-state as
its variant for a selection.

### Duration / estimate — ✅

`EstimateField` everywhere (composer, task panel, row, review, Things to
settle). Variant: the phone sheet adds quick chips above it.

### Searchable selects and typed fields in menus — ✅ look (#114)

Every "type to narrow" field at the top of a menu is `.pickersearch`: one
bordered field, `--ctl-h`, the same focus ring, sticky at the top of a list
that scrolls — the date picker, row Move, bulk Move and Tags, `Select`, the
tag pickers. (Migrated in this pass; before it there were two looks: a
borderless header strip and a bordered field.)

### Text fields, text areas, inline edit — 🟡

| Where | Now |
| --- | --- |
| Composer and task panel titles | `TaskNameField` (marks, #112) |
| Descriptions | `EditableDescription` (project), textareas (composer, panel) |
| Section, project names | `.gnamefield`, `EditableTitle` |
| New section on a board | `.addsection-field` (#108) |

Next: one inline-edit field style (transparent at rest, `--border` on hover,
accent + ring on focus) shared by `.gnamefield`, `EditableTitle` and
`.addsection-field`.

### Actions — 🟡

`.btn` + `primary` (the one thing the surface is for), `quiet`, `outline`,
`danger` (destructive, always confirmed), `sm`; `.iconbtn` for icon-only.
`.btn.coffee` (#115) is the only decorative one and never the way out.
Next: `.btn.danger` and `.opt.danger` share one colour pair; `sm` becomes
`--ctl-h-sm` everywhere.

## Next migrations, in order

1. Project and section: one destination list (Move, bulk Move, `PlacementField`).
2. Labels: one tag picker with a tri-state variant.
3. Inline-edit fields: one style.
4. Priority in the bulk bar through `Select`'s option rendering.
