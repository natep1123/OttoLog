import type { OutlineNode } from './targetSummaries';

export const CONTINUATION_SUFFIX = ' (cont.)';

export type PaginateOptions = {
  /** Modal header covers the root title — skip row + use chrome-only height. */
  omitRootHeader?: boolean;
  /** Measured ÷ estimated — calibrates row packing to real layout. */
  heightScale?: number;
};

type RowKind =
  | 'header'
  | 'exercise-title'
  | 'set-line'
  | 'notes'
  | 'override-line'
  | 'override-notes';

type AncestorRef = {
  depth: number;
  title: string;
  meta?: string;
  kind?: OutlineNode['kind'];
  pathKey: string;
};

export type PreviewRow = {
  kind: RowKind;
  depth: number;
  title: string;
  meta?: string;
  outlineKind?: OutlineNode['kind'];
  line?: string;
  pathKey: string;
  ancestorKeys: string[];
  ancestors: AncestorRef[];
  exerciseKey?: string;
  /** Header / exercise pathKey that owns a notes row. */
  ownerKey?: string;
};

/** Heights aligned to LockedOutline styles (padding/gaps/lineHeights). */
const ROOT_CHROME = 18;
const NESTED_HEADER = 24;
const NESTED_META = 16;
const EXERCISE_TITLE = 22;
const SET_LINE = 20;
const OVERRIDE_LINE = 20;
const OVERRIDE_NOTES_LINE_HEIGHT = 16;
const OVERRIDE_BLOCK_TOP = 7;
const OVERRIDE_ITEM_GAP = 6;
const NOTES_LINE_HEIGHT = 17;
const NOTES_MARGIN_TOP = 2;
/** Approx chars/line for italic 12px notes in the modal body. */
const NOTES_CHARS_PER_LINE = 44;
const SIBLING_GAP = 6;
/** Tiny slack so packed pages stay inside the fixed body. */
const PACK_SAFETY = 4;

function isExerciseNode(node: OutlineNode): boolean {
  return (
    node.kind === 'exercise' ||
    Boolean(
      (node.lines?.length || node.overrides?.length) && !node.children?.length,
    )
  );
}

function makePathKey(
  parentKey: string,
  node: OutlineNode,
  depth: number,
  index: number,
): string {
  return `${parentKey}|${depth}:${node.kind ?? 'node'}:${node.title}#${index}`;
}

/** Word-aware wrap used for notes height estimates and page splits. */
export function wrapNotesText(
  text: string,
  charsPerLine = NOTES_CHARS_PER_LINE,
): string[] {
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      if (lines.length) lines.push('');
      continue;
    }
    const words = para.trim().split(/\s+/);
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= charsPerLine) {
        current = next;
        continue;
      }
      if (current) lines.push(current);
      if (word.length > charsPerLine) {
        let rest = word;
        while (rest.length > charsPerLine) {
          lines.push(rest.slice(0, charsPerLine));
          rest = rest.slice(charsPerLine);
        }
        current = rest;
      } else {
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines.length ? lines : [''];
}

function notesHeightForLineCount(lineCount: number): number {
  return NOTES_MARGIN_TOP + Math.max(1, lineCount) * NOTES_LINE_HEIGHT;
}

/** Estimated rendered height for a notes block (matches LockedOutline notes style). */
export function estimateNotesHeight(text: string): number {
  return notesHeightForLineCount(wrapNotesText(text).length);
}

function maxNotesLinesForHeight(availablePx: number): number {
  if (availablePx < NOTES_MARGIN_TOP + NOTES_LINE_HEIGHT) return 0;
  return Math.floor((availablePx - NOTES_MARGIN_TOP) / NOTES_LINE_HEIGHT);
}

function estimateOverrideNotesHeight(text: string): number {
  return (
    Math.max(1, wrapNotesText(text).length) * OVERRIDE_NOTES_LINE_HEIGHT
  );
}

function isOverrideRow(kind: RowKind): boolean {
  return kind === 'override-line' || kind === 'override-notes';
}

export function rowHeight(row: PreviewRow, previous?: PreviewRow): number {
  let h = 0;
  if (row.kind === 'header') {
    if (row.depth === 0) {
      h = ROOT_CHROME;
    } else {
      h = NESTED_HEADER;
      if (row.meta) h += NESTED_META;
    }
  } else if (row.kind === 'exercise-title') {
    h = EXERCISE_TITLE;
  } else if (row.kind === 'notes') {
    h = estimateNotesHeight(row.line ?? '');
  } else if (row.kind === 'override-line') {
    h = OVERRIDE_LINE;
    if (!previous || !isOverrideRow(previous.kind)) {
      h += OVERRIDE_BLOCK_TOP;
    } else {
      h += OVERRIDE_ITEM_GAP;
    }
  } else if (row.kind === 'override-notes') {
    h = estimateOverrideNotesHeight(row.line ?? '');
  } else {
    h = SET_LINE;
  }

  h += Math.max(0, row.depth) * 2;

  if (
    previous &&
    previous.pathKey !== row.pathKey &&
    row.kind !== 'set-line' &&
    row.kind !== 'notes' &&
    !isOverrideRow(row.kind)
  ) {
    h += SIBLING_GAP;
  }

  return h;
}

/** Sum of estimated row heights — used to calibrate against a real measure. */
export function estimateOutlineHeight(
  root: OutlineNode,
  options: PaginateOptions = {},
): number {
  const { omitRootHeader = false } = options;
  const rows: PreviewRow[] = [];
  flattenToRows(root, 0, [], 'root', rows, omitRootHeader);
  if (!rows.length) return ROOT_CHROME;

  let total = omitRootHeader ? ROOT_CHROME : 0;
  for (let i = 0; i < rows.length; i += 1) {
    total += rowHeight(rows[i], rows[i - 1]);
  }
  return total;
}

/** Max page-body height inside the popup card. */
export function pageBodyBudget(
  windowHeight: number,
  chromeHeight: number,
  reservePagination: boolean,
): number {
  const stagePadding = 32;
  const bodyPadding = 32;
  const pagination = reservePagination ? 52 : 0;
  const maxCard = windowHeight * 0.94 - stagePadding;
  return Math.max(240, maxCard - chromeHeight - pagination - bodyPadding);
}

function flattenToRows(
  node: OutlineNode,
  depth: number,
  ancestors: AncestorRef[],
  parentKey: string,
  rows: PreviewRow[],
  omitRootHeader: boolean,
  index = 0,
): void {
  const pathKey = makePathKey(parentKey, node, depth, index);

  if (isExerciseNode(node)) {
    rows.push({
      kind: 'exercise-title',
      depth,
      title: node.title,
      outlineKind: node.kind ?? 'exercise',
      pathKey,
      ancestorKeys: ancestors.map((a) => a.pathKey),
      ancestors: [...ancestors],
      exerciseKey: pathKey,
    });

    if (node.notes) {
      rows.push({
        kind: 'notes',
        depth,
        title: node.title,
        line: node.notes,
        outlineKind: node.kind ?? 'exercise',
        pathKey: `${pathKey}|notes`,
        ancestorKeys: [...ancestors.map((a) => a.pathKey), pathKey],
        ancestors: [...ancestors],
        exerciseKey: pathKey,
        ownerKey: pathKey,
      });
    }

    for (
      let lineIndex = 0;
      lineIndex < (node.lines?.length ?? 0);
      lineIndex += 1
    ) {
      const line = node.lines![lineIndex];
      rows.push({
        kind: 'set-line',
        depth,
        title: node.title,
        line,
        outlineKind: 'exercise',
        pathKey: `${pathKey}|line:${lineIndex}`,
        ancestorKeys: [...ancestors.map((a) => a.pathKey), pathKey],
        ancestors: [...ancestors],
        exerciseKey: pathKey,
      });
    }

    for (
      let overrideIndex = 0;
      overrideIndex < (node.overrides?.length ?? 0);
      overrideIndex += 1
    ) {
      const item = node.overrides![overrideIndex];
      rows.push({
        kind: 'override-line',
        depth,
        title: node.title,
        line: item.summary,
        outlineKind: 'exercise',
        pathKey: `${pathKey}|ov:${overrideIndex}`,
        ancestorKeys: [...ancestors.map((a) => a.pathKey), pathKey],
        ancestors: [...ancestors],
        exerciseKey: pathKey,
      });
      if (item.notes) {
        rows.push({
          kind: 'override-notes',
          depth,
          title: node.title,
          line: item.notes,
          outlineKind: 'exercise',
          pathKey: `${pathKey}|ov:${overrideIndex}|notes`,
          ancestorKeys: [...ancestors.map((a) => a.pathKey), pathKey],
          ancestors: [...ancestors],
          exerciseKey: pathKey,
        });
      }
    }
    return;
  }

  const selfRef: AncestorRef = {
    depth,
    title: node.title,
    meta: node.meta,
    kind: node.kind,
    pathKey,
  };
  const nextAncestors = [...ancestors, selfRef];

  if (!(depth === 0 && omitRootHeader)) {
    rows.push({
      kind: 'header',
      depth,
      title: node.title,
      meta: node.meta,
      outlineKind: node.kind,
      pathKey,
      ancestorKeys: ancestors.map((a) => a.pathKey),
      ancestors: [...ancestors],
    });
  }

  if (node.notes) {
    rows.push({
      kind: 'notes',
      depth,
      title: node.title,
      meta: node.meta,
      line: node.notes,
      outlineKind: node.kind,
      pathKey: `${pathKey}|notes`,
      ancestorKeys: ancestors.map((a) => a.pathKey),
      ancestors: [...ancestors],
      ownerKey: pathKey,
    });
  }

  for (
    let childIndex = 0;
    childIndex < (node.children?.length ?? 0);
    childIndex += 1
  ) {
    flattenToRows(
      node.children![childIndex],
      depth + 1,
      nextAncestors,
      pathKey,
      rows,
      omitRootHeader,
      childIndex,
    );
  }
}

function continuationChrome(
  row: PreviewRow,
  shownOnPage: Set<string>,
  omitRootHeader: boolean,
): number {
  let extra = 0;

  for (const anc of row.ancestors) {
    if (omitRootHeader && anc.depth === 0) continue;
    if (shownOnPage.has(anc.pathKey)) continue;

    extra += rowHeight({
      kind: 'header',
      depth: anc.depth,
      title: anc.title,
      meta: anc.meta,
      outlineKind: anc.kind,
      pathKey: anc.pathKey,
      ancestorKeys: [],
      ancestors: [],
    });
    shownOnPage.add(anc.pathKey);
  }

  if (
    (row.kind === 'set-line' ||
      row.kind === 'notes' ||
      isOverrideRow(row.kind)) &&
    row.exerciseKey &&
    !shownOnPage.has(row.exerciseKey)
  ) {
    extra += rowHeight({
      kind: 'exercise-title',
      depth: row.depth,
      title: row.title,
      outlineKind: row.outlineKind,
      pathKey: row.exerciseKey,
      ancestorKeys: row.ancestorKeys,
      ancestors: row.ancestors,
      exerciseKey: row.exerciseKey,
    });
    shownOnPage.add(row.exerciseKey);
  }

  if (
    row.kind === 'notes' &&
    row.ownerKey &&
    !row.exerciseKey &&
    !shownOnPage.has(row.ownerKey)
  ) {
    if (!(omitRootHeader && row.depth === 0)) {
      extra += rowHeight({
        kind: 'header',
        depth: row.depth,
        title: row.title,
        meta: row.meta,
        outlineKind: row.outlineKind,
        pathKey: row.ownerKey,
        ancestorKeys: [],
        ancestors: [],
      });
    }
    shownOnPage.add(row.ownerKey);
  }

  return extra;
}

function notesChunkRow(
  base: PreviewRow,
  text: string,
  chunkIndex: number,
): PreviewRow {
  return {
    ...base,
    line: text,
    pathKey: `${base.ownerKey ?? base.pathKey}|notes:${chunkIndex}`,
  };
}

type PackState = {
  pages: PreviewRow[][];
  current: PreviewRow[];
  height: number;
  shownOnPage: Set<string>;
  leadingChrome: number;
  maxHeight: number;
  omitRootHeader: boolean;
};

function isOwnerHeaderForNotes(
  row: PreviewRow,
  notes: PreviewRow,
): boolean {
  if (notes.exerciseKey) {
    return (
      row.kind === 'exercise-title' && row.pathKey === notes.exerciseKey
    );
  }
  return (
    Boolean(notes.ownerKey) &&
    row.kind === 'header' &&
    row.pathKey === notes.ownerKey
  );
}

/** Rebuild height + shown set after mutating `state.current`. */
function recomputePackHeight(state: PackState): void {
  let height = state.leadingChrome;
  const shown = new Set<string>();
  for (let i = 0; i < state.current.length; i += 1) {
    const row = state.current[i];
    const previous = state.current[i - 1];
    const cont = continuationChrome(row, shown, state.omitRootHeader);
    height += cont + rowHeight(row, previous);
    if (row.kind === 'header' || row.kind === 'exercise-title') {
      shown.add(row.pathKey);
    }
    if (row.exerciseKey) shown.add(row.exerciseKey);
    if (row.ownerKey) shown.add(row.ownerKey);
  }
  state.height = height;
  state.shownOnPage = shown;
}

/**
 * Pack notes atomically when they fit; otherwise move the whole note to the
 * next page. Only split by wrapped lines when a note exceeds a full page.
 * When moving notes forward, pull a trailing owner header along so it isn't
 * left orphaned on the previous page.
 */
function packNotesIntoPages(row: PreviewRow, state: PackState): void {
  const startNewPage = () => {
    if (state.current.length) state.pages.push(state.current);
    state.current = [];
    state.height = state.leadingChrome;
    state.shownOnPage = new Set<string>();
  };

  const placeChunk = (chunk: PreviewRow) => {
    const previous = state.current[state.current.length - 1];
    const cont = continuationChrome(
      chunk,
      state.shownOnPage,
      state.omitRootHeader,
    );
    state.current.push(chunk);
    if (chunk.kind === 'header' || chunk.kind === 'exercise-title') {
      state.shownOnPage.add(chunk.pathKey);
    }
    if (chunk.exerciseKey) state.shownOnPage.add(chunk.exerciseKey);
    if (chunk.ownerKey) state.shownOnPage.add(chunk.ownerKey);
    state.height += cont + rowHeight(chunk, previous);
  };

  const wouldFit = (chunk: PreviewRow): boolean => {
    const previous = state.current[state.current.length - 1];
    const previewShown = new Set(state.shownOnPage);
    const cont = continuationChrome(
      chunk,
      previewShown,
      state.omitRootHeader,
    );
    return state.height + cont + rowHeight(chunk, previous) <= state.maxHeight;
  };

  // Prefer keeping the whole note together.
  let pulledHeader: PreviewRow | null = null;
  if (!wouldFit(row) && state.current.length > 0) {
    const last = state.current[state.current.length - 1];
    if (last && isOwnerHeaderForNotes(last, row)) {
      pulledHeader = state.current.pop() ?? null;
      recomputePackHeight(state);
    }
    startNewPage();
    if (pulledHeader) placeChunk(pulledHeader);
  }

  if (wouldFit(row)) {
    placeChunk(row);
    return;
  }

  // Note taller than a full page — split by wrapped lines.
  const wrapped = wrapNotesText(row.line ?? '');
  let offset = 0;
  let chunkIndex = 0;

  while (offset < wrapped.length) {
    const previewShown = new Set(state.shownOnPage);
    const cont = continuationChrome(row, previewShown, state.omitRootHeader);
    const remaining = state.maxHeight - state.height - cont;
    let maxLines = maxNotesLinesForHeight(remaining);

    if (maxLines <= 0) {
      if (state.current.length === 0) {
        // Pathological tiny budget — force one line so we make progress.
        maxLines = 1;
      } else {
        startNewPage();
        continue;
      }
    }

    const take = Math.min(maxLines, wrapped.length - offset);
    const chunkText = wrapped.slice(offset, offset + take).join('\n');
    placeChunk(notesChunkRow(row, chunkText, chunkIndex));
    offset += take;
    chunkIndex += 1;

    if (offset < wrapped.length) {
      startNewPage();
    }
  }
}

function packRows(
  rows: PreviewRow[],
  maxHeight: number,
  leadingChrome = 0,
  omitRootHeader = false,
): PreviewRow[][] {
  const state: PackState = {
    pages: [],
    current: [],
    height: leadingChrome,
    shownOnPage: new Set<string>(),
    leadingChrome,
    maxHeight,
    omitRootHeader,
  };

  const startNewPage = () => {
    if (state.current.length) state.pages.push(state.current);
    state.current = [];
    state.height = leadingChrome;
    state.shownOnPage = new Set<string>();
  };

  for (const row of rows) {
    if (row.kind === 'notes') {
      packNotesIntoPages(row, state);
      continue;
    }

    const previous = state.current[state.current.length - 1];
    const rh = rowHeight(row, previous);
    const previewShown = new Set(state.shownOnPage);
    const contChrome = continuationChrome(row, previewShown, omitRootHeader);

    if (
      state.current.length > 0 &&
      state.height + contChrome + rh > maxHeight
    ) {
      startNewPage();
    }

    const contForRow = continuationChrome(
      row,
      state.shownOnPage,
      omitRootHeader,
    );
    state.current.push(row);
    if (row.kind === 'header' || row.kind === 'exercise-title') {
      state.shownOnPage.add(row.pathKey);
    }
    if (row.exerciseKey) state.shownOnPage.add(row.exerciseKey);
    state.height +=
      contForRow + rowHeight(row, state.current[state.current.length - 2]);
  }

  if (state.current.length) state.pages.push(state.current);
  return state.pages.length ? state.pages : [[]];
}

function contTitle(title: string, pathKey: string, prev: Set<string>): string {
  if (!prev.has(pathKey)) return title;
  if (title.endsWith(CONTINUATION_SUFFIX)) return title;
  return `${title}${CONTINUATION_SUFFIX}`;
}

function headerNode(
  ref: Pick<AncestorRef, 'title' | 'meta' | 'kind' | 'pathKey'>,
  prev: Set<string>,
): OutlineNode {
  const continued = prev.has(ref.pathKey);
  return {
    title: contTitle(ref.title, ref.pathKey, prev),
    meta: continued ? undefined : ref.meta,
    kind: ref.kind,
    children: [],
  };
}

function appendNotes(node: OutlineNode, text: string): void {
  node.notes = node.notes ? `${node.notes}\n${text}` : text;
}

function buildPageTree(
  pageRows: PreviewRow[],
  root: OutlineNode,
  rootKey: string,
  prevPathKeys: Set<string>,
): OutlineNode {
  const tree: OutlineNode = {
    ...headerNode(
      { title: root.title, meta: root.meta, kind: root.kind, pathKey: rootKey },
      prevPathKeys,
    ),
  };
  const nodes = new Map<string, OutlineNode>([[rootKey, tree]]);

  function ensureNode(ref: AncestorRef, chain: AncestorRef[]): OutlineNode {
    if (ref.depth === 0 || ref.pathKey === rootKey) return tree;

    const existing = nodes.get(ref.pathKey);
    if (existing) return existing;

    let parent: OutlineNode = tree;
    const parentRef = chain.find((a) => a.depth === ref.depth - 1);
    if (parentRef) {
      parent = ensureNode(parentRef, chain);
    }

    if (!parent.children) parent.children = [];
    const node = headerNode(ref, prevPathKeys);
    parent.children.push(node);
    nodes.set(ref.pathKey, node);
    return node;
  }

  function ensureExercise(row: PreviewRow): OutlineNode {
    const key = row.exerciseKey ?? row.pathKey;
    const existing = nodes.get(key);
    if (existing) return existing;

    for (const anc of row.ancestors) {
      ensureNode(anc, row.ancestors);
    }

    const parentKey =
      row.ancestors[row.ancestors.length - 1]?.pathKey ?? rootKey;
    const parent = nodes.get(parentKey) ?? tree;
    if (!parent.children) parent.children = [];

    const node: OutlineNode = {
      title: contTitle(row.title, key, prevPathKeys),
      kind: row.outlineKind ?? 'exercise',
      lines: [],
    };
    parent.children.push(node);
    nodes.set(key, node);
    return node;
  }

  for (const row of pageRows) {
    if (row.kind === 'header') {
      if (row.depth === 0) continue;
      ensureNode(
        {
          depth: row.depth,
          title: row.title,
          meta: row.meta,
          kind: row.outlineKind,
          pathKey: row.pathKey,
        },
        row.ancestors,
      );
    } else if (row.kind === 'exercise-title') {
      ensureExercise(row);
    } else if (row.kind === 'set-line' && row.line) {
      const ex = ensureExercise(row);
      ex.lines = [...(ex.lines ?? []), row.line];
    } else if (row.kind === 'override-line' && row.line) {
      const ex = ensureExercise(row);
      ex.overrides = [
        ...(ex.overrides ?? []),
        { summary: row.line },
      ];
    } else if (row.kind === 'override-notes' && row.line) {
      const ex = ensureExercise(row);
      if (!ex.overrides?.length) {
        ex.overrides = [{ summary: '', notes: row.line }];
      } else {
        const last = ex.overrides[ex.overrides.length - 1];
        last.notes = last.notes ? `${last.notes}\n${row.line}` : row.line;
      }
    } else if (row.kind === 'notes' && row.line) {
      if (row.exerciseKey) {
        appendNotes(ensureExercise(row), row.line);
      } else if (
        !row.ownerKey ||
        row.ownerKey === rootKey ||
        row.depth === 0
      ) {
        appendNotes(tree, row.line);
      } else {
        const owner = ensureNode(
          {
            depth: row.depth,
            title: row.title,
            meta: row.meta,
            kind: row.outlineKind,
            pathKey: row.ownerKey,
          },
          row.ancestors,
        );
        appendNotes(owner, row.line);
      }
    }
  }

  return pruneEmptyChildren(tree);
}

function pruneEmptyChildren(node: OutlineNode): OutlineNode {
  if (!node.children?.length) {
    const { children: _c, ...rest } = node;
    return rest;
  }
  const children = node.children.map(pruneEmptyChildren);
  return {
    ...node,
    children: children.length ? children : undefined,
  };
}

function collectShownPathKeys(pageRows: PreviewRow[]): Set<string> {
  const keys = new Set<string>();
  for (const row of pageRows) {
    if (row.kind === 'header' || row.kind === 'exercise-title') {
      keys.add(row.pathKey);
    }
    if (row.exerciseKey) keys.add(row.exerciseKey);
    if (row.ownerKey) keys.add(row.ownerKey);
    for (const anc of row.ancestors) {
      keys.add(anc.pathKey);
    }
  }
  return keys;
}

function paginateOnce(
  root: OutlineNode,
  budget: number,
  omitRootHeader: boolean,
): OutlineNode[] {
  const rows: PreviewRow[] = [];
  const rootKey = makePathKey('root', root, 0, 0);
  flattenToRows(root, 0, [], 'root', rows, omitRootHeader, 0);

  if (!rows.length) {
    return [root];
  }

  const pageGroups = packRows(
    rows,
    Math.max(120, budget - PACK_SAFETY),
    omitRootHeader ? ROOT_CHROME : 0,
    omitRootHeader,
  );
  const pages: OutlineNode[] = [];
  let prevPathKeys = new Set<string>();

  for (const group of pageGroups) {
    if (!group.length) {
      pages.push(root);
      continue;
    }
    pages.push(buildPageTree(group, root, rootKey, prevPathKeys));
    prevPathKeys = collectShownPathKeys(group);
  }

  return pages.length ? pages : [root];
}

/**
 * Paginate an outline into nested subtrees for LockedOutline.
 * Packs row-by-row into the page-body budget; continued layers get "(cont.)".
 * Notes stay atomic when they fit; only split when taller than one page.
 */
export function paginateOutline(
  root: OutlineNode,
  pageHeightPx: number,
  options: PaginateOptions = {},
): OutlineNode[] {
  const { omitRootHeader = false, heightScale = 1 } = options;
  const scale = heightScale > 0 ? heightScale : 1;
  const estimateBudget = Math.max(180, pageHeightPx / scale);
  return paginateOnce(root, estimateBudget, omitRootHeader);
}
