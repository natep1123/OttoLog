import type { OutlineNode } from './targetSummaries';

export const CONTINUATION_SUFFIX = ' (cont.)';

export type PaginateOptions = {
  /** Modal header covers the root title — skip row + use chrome-only height. */
  omitRootHeader?: boolean;
  /** Measured ÷ estimated — calibrates row packing to real layout. */
  heightScale?: number;
};

type RowKind = 'header' | 'exercise-title' | 'set-line';

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
};

/** Heights aligned to LockedOutline styles (padding/gaps/lineHeights). */
const ROOT_CHROME = 18;
const NESTED_HEADER = 24;
const NESTED_META = 16;
const EXERCISE_TITLE = 22;
const SET_LINE = 20;
const SIBLING_GAP = 6;
/** Tiny slack so packed pages stay inside the fixed body. */
const PACK_SAFETY = 4;

function isExerciseNode(node: OutlineNode): boolean {
  return (
    node.kind === 'exercise' ||
    Boolean(node.lines?.length && !node.children?.length)
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
  } else {
    h = SET_LINE;
  }

  h += Math.max(0, row.depth) * 2;

  if (
    previous &&
    previous.pathKey !== row.pathKey &&
    row.kind !== 'set-line'
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

    for (let lineIndex = 0; lineIndex < (node.lines?.length ?? 0); lineIndex += 1) {
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

  for (let childIndex = 0; childIndex < (node.children?.length ?? 0); childIndex += 1) {
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
    row.kind === 'set-line' &&
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

  return extra;
}

function packRows(
  rows: PreviewRow[],
  maxHeight: number,
  leadingChrome = 0,
  omitRootHeader = false,
): PreviewRow[][] {
  const pages: PreviewRow[][] = [];
  let current: PreviewRow[] = [];
  let height = leadingChrome;
  let shownOnPage = new Set<string>();

  const startNewPage = () => {
    if (current.length) pages.push(current);
    current = [];
    height = leadingChrome;
    shownOnPage = new Set<string>();
  };

  for (const row of rows) {
    const previous = current[current.length - 1];
    const rh = rowHeight(row, previous);
    const previewShown = new Set(shownOnPage);
    const contChrome = continuationChrome(row, previewShown, omitRootHeader);

    if (current.length > 0 && height + contChrome + rh > maxHeight) {
      startNewPage();
    }

    const contForRow = continuationChrome(row, shownOnPage, omitRootHeader);
    current.push(row);
    // Mark structural rows so later children don't re-bill ancestor chrome.
    if (row.kind === 'header' || row.kind === 'exercise-title') {
      shownOnPage.add(row.pathKey);
    }
    if (row.exerciseKey) shownOnPage.add(row.exerciseKey);
    height += contForRow + rowHeight(row, current[current.length - 2]);
  }

  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
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
