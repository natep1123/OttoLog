import { useMemo, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { colors, radii, typography } from '../../theme/tokens';

type Item = { id: string; name: string };

type Props = {
  items: Item[];
  /** When false, omit the built-in “Each round” label (e.g. inside Visualize). */
  showLabel?: boolean;
};

/** Floor / ceiling so layout stays compact but names can breathe. */
const CHIP_W_MIN = 70;
const CHIP_W_MAX = 130;
const CHIP_H = 26;
/** Horizontal run between chips — longer than the old tight stub. */
const ARROW_GAP = 26;
const ROW_GAP = 40;
const LOOP_OUT = 14;
const LOOP_BOTTOM = 20;
/** Room for the inbound loop arrow into the first chip. */
const LEFT_PAD = 28;
/**
 * Chart palette — mixed theme accents so it reads as a schematic, not form chrome.
 * Gold paths; shared warm chip treatment for every node.
 */
const STROKE = colors.gold;
const STROKE_W = 1.75;
const LOOP_DASH = '6 5';
const PANEL_PAD_X = 4;
const PANEL_PAD_Y = 10;
const GRID_STEP = 12;
const GRID_MAJOR_EVERY = 4;
const GRID_MINOR = 'rgba(255, 180, 120, 0.05)';
const GRID_MAJOR = 'rgba(232, 184, 109, 0.14)';
const PANEL_BORDER = colors.borderStrong;

/** Blueprint-style major/minor grid behind the flowchart. */
function GraphGrid({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;

  const w = Math.round(width);
  const h = Math.round(height);
  const vertical: ReactNode[] = [];
  const horizontal: ReactNode[] = [];

  for (let x = 0, i = 0; x <= w; x += GRID_STEP, i += 1) {
    const major = i % GRID_MAJOR_EVERY === 0;
    vertical.push(
      <Line
        key={`v-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={h}
        stroke={major ? GRID_MAJOR : GRID_MINOR}
        strokeWidth={major ? 1 : 0.5}
      />,
    );
  }

  for (let y = 0, i = 0; y <= h; y += GRID_STEP, i += 1) {
    const major = i % GRID_MAJOR_EVERY === 0;
    horizontal.push(
      <Line
        key={`h-${i}`}
        x1={0}
        y1={y}
        x2={w}
        y2={y}
        stroke={major ? GRID_MAJOR : GRID_MINOR}
        strokeWidth={major ? 1 : 0.5}
      />,
    );
  }

  return (
    <>
      <Rect x={0} y={0} width={w} height={h} fill={colors.bgInset} />
      {vertical}
      {horizontal}
    </>
  );
}

function displayName(name: string): string {
  const t = name.trim();
  return t || '…';
}

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function rowWidth(count: number, chipW: number): number {
  if (count <= 0) return 0;
  return count * chipW + Math.max(0, count - 1) * ARROW_GAP;
}

/** Cap at 3 chips per row when width allows (sized at the minimum chip width). */
function chipsPerRowForWidth(availableWidth: number): number {
  if (availableWidth <= 0) return 1;
  for (let n = 3; n >= 1; n -= 1) {
    const need = LEFT_PAD + rowWidth(n, CHIP_W_MIN) + LOOP_OUT + 4;
    if (need <= availableWidth) return n;
  }
  return 1;
}

/**
 * Spend leftover horizontal space on chip width for a full-capacity row.
 * Always pass the layout column capacity (usually 3), never the item count —
 * otherwise 1–2 chip lines inflate and steal width from full rows.
 */
function chipWidthFor(availableWidth: number, cols: number): number {
  if (availableWidth <= 0 || cols < 1) return CHIP_W_MIN;
  const chrome = LEFT_PAD + LOOP_OUT + 4 + Math.max(0, cols - 1) * ARROW_GAP;
  const raw = Math.floor((availableWidth - chrome) / cols);
  return Math.max(CHIP_W_MIN, Math.min(CHIP_W_MAX, raw));
}

/**
 * Left edge of a row with `count` chips, centered inside a `frameCols`-wide grid.
 * 1 chip → middle column; 2 chips → nestled between the three above; 3 → flush.
 */
function rowOriginX(count: number, frameCols: number, chipW: number): number {
  return LEFT_PAD + (rowWidth(frameCols, chipW) - rowWidth(count, chipW)) / 2;
}

function chipX(
  ci: number,
  count: number,
  frameCols: number,
  chipW: number,
): number {
  return rowOriginX(count, frameCols, chipW) + ci * (chipW + ARROW_GAP);
}

function chipY(row: number) {
  return row * (CHIP_H + ROW_GAP);
}

function chipCx(
  ci: number,
  count: number,
  frameCols: number,
  chipW: number,
) {
  return chipX(ci, count, frameCols, chipW) + chipW / 2;
}

function chipCy(row: number) {
  return chipY(row) + CHIP_H / 2;
}

function gapY(ri: number) {
  return chipY(ri) + CHIP_H + ROW_GAP / 2;
}

function arrowHeadRight(x: number, y: number): string {
  const s = 4.5;
  return `M ${x - s} ${y - s} L ${x} ${y} L ${x - s} ${y + s}`;
}

function arrowHeadDown(x: number, y: number): string {
  const s = 4.5;
  return `M ${x - s} ${y - s} L ${x} ${y} L ${x + s} ${y - s}`;
}

type LineSeg = { d: string; head?: string; tone?: 'flow' | 'loop' };

/**
 * Centered flowchart for cluster round order.
 * Rows are up to 3 wide; short rows center under the full grid (upside-down pyramid).
 * Chip width is always sized for a full row so 1–2 chip lines stay compact.
 */
export function ClusterSequenceDiagram({ items, showLabel = true }: Props) {
  /** Content width inside the panel — never measure height for the grid (avoids feedback loops). */
  const [stageW, setStageW] = useState(0);
  const perRow = chipsPerRowForWidth(stageW);
  // Size for full-row capacity — not item count — so short lines don’t balloon.
  const chipW = chipWidthFor(stageW, Math.max(1, perRow));

  const onStageLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - stageW) > 1) setStageW(w);
  };

  const layout = useMemo(() => {
    const rows = chunkRows(items, perRow);
    const rowCount = Math.max(1, rows.length);
    // Frame to the widest real row — not perRow capacity — so a lone
    // 1- or 2-chip row isn’t floated inside an empty 3-wide grid.
    // Wrapped short rows still center under a fuller row above.
    const frameCols = Math.max(1, ...rows.map((r) => r.length));
    const contentRight = LEFT_PAD + rowWidth(frameCols, chipW);
    const contentH = rowCount * CHIP_H + Math.max(0, rowCount - 1) * ROW_GAP;

    const lastRow = rows[rowCount - 1] ?? [];
    const lastCount = Math.max(1, lastRow.length);
    const lastCol = lastCount - 1;
    const lastLeft = chipX(lastCol, lastCount, frameCols, chipW);
    const lastRight = lastLeft + chipW;
    const lastCy = chipCy(rowCount - 1);

    const firstCount = Math.max(1, rows[0]?.length ?? 1);
    const firstLeft = chipX(0, firstCount, frameCols, chipW);
    const firstCy = chipCy(0);

    const rightRail = lastRight + LOOP_OUT;
    const bottomY = contentH + LOOP_BOTTOM;
    const gutterX = 2;

    const lines: LineSeg[] = [];

    rows.forEach((row, ri) => {
      for (let ci = 0; ci < row.length - 1; ci += 1) {
        const y = chipCy(ri);
        const x0 = chipX(ci, row.length, frameCols, chipW) + chipW + 2;
        const tip = chipX(ci + 1, row.length, frameCols, chipW) - 2;
        lines.push({
          d: `M ${x0} ${y} L ${tip - 4} ${y}`,
          head: arrowHeadRight(tip, y),
        });
      }
    });

    for (let ri = 0; ri < rowCount - 1; ri += 1) {
      const from = rows[ri];
      const to = rows[ri + 1];
      const xStart = chipCx(from.length - 1, from.length, frameCols, chipW);
      const y0 = chipY(ri) + CHIP_H + 1;
      const midY = gapY(ri);
      const xEnd = chipCx(0, to.length, frameCols, chipW);
      const tip = chipY(ri + 1) - 1;

      lines.push({
        d: [
          `M ${xStart} ${y0}`,
          `L ${xStart} ${midY}`,
          `L ${xEnd} ${midY}`,
          `L ${xEnd} ${tip - 4}`,
        ].join(' '),
        head: arrowHeadDown(xEnd, tip),
      });
    }

    if (items.length > 1) {
      lines.push({
        d: [
          `M ${lastRight + 2} ${lastCy}`,
          `L ${rightRail} ${lastCy}`,
          `L ${rightRail} ${bottomY}`,
          `L ${gutterX} ${bottomY}`,
          `L ${gutterX} ${firstCy}`,
          `L ${firstLeft - 5} ${firstCy}`,
        ].join(' '),
        head: arrowHeadRight(firstLeft - 2, firstCy),
        tone: 'loop',
      });
    }

    const width = Math.ceil(Math.max(contentRight, rightRail) + 2);
    const height = Math.ceil(items.length > 1 ? bottomY + 2 : contentH);

    return { rows, lines, width, height, frameCols };
  }, [items, perRow, chipW]);

  if (items.length === 0) {
    return (
      <Text style={styles.empty}>Add exercises to build the round sequence.</Text>
    );
  }

  // Grid size is content-driven — never from measuring the panel that contains the SVG.
  const gridW = stageW > 0 ? Math.round(stageW + PANEL_PAD_X * 2) : 0;
  const gridH = Math.round(layout.height + PANEL_PAD_Y * 2);

  return (
    <View style={[styles.root, showLabel && styles.rootWithLabel]}>
      {showLabel ? <Text style={styles.label}>Each round</Text> : null}

      <View style={styles.panel}>
        {gridW > 0 ? (
          <View style={styles.gridLayer} pointerEvents="none">
            <Svg width={gridW} height={gridH}>
              <GraphGrid width={gridW} height={gridH} />
            </Svg>
          </View>
        ) : null}

        <View style={styles.stage} onLayout={onStageLayout}>
          {stageW > 0 ? (
            <View
              style={[
                styles.diagram,
                { width: layout.width, height: layout.height },
              ]}
            >
              <Svg
                width={layout.width}
                height={layout.height}
                style={styles.svg}
              >
                {layout.lines.map((line, i) => (
                  <Path
                    key={`line-${i}`}
                    d={line.head ? `${line.d} ${line.head}` : line.d}
                    stroke={STROKE}
                    strokeWidth={STROKE_W}
                    strokeDasharray={
                      line.tone === 'loop' ? LOOP_DASH : undefined
                    }
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={line.tone === 'loop' ? 0.88 : 0.95}
                  />
                ))}
              </Svg>

              {layout.rows.map((row, ri) =>
                row.map((item, ci) => (
                  <View
                    key={item.id}
                    style={[
                      styles.chip,
                      {
                        left: chipX(
                          ci,
                          row.length,
                          layout.frameCols,
                          chipW,
                        ),
                        top: chipY(ri),
                        width: chipW,
                        height: CHIP_H,
                      },
                    ]}
                  >
                    <Text
                      style={styles.chipText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {displayName(item.name)}
                    </Text>
                  </View>
                )),
              )}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
    paddingTop: 0,
  },
  rootWithLabel: {
    gap: 10,
    paddingTop: 4,
  },
  label: {
    fontFamily: typography.fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  empty: {
    fontFamily: typography.font,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  panel: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: PANEL_PAD_Y,
    paddingHorizontal: PANEL_PAD_X,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    borderRadius: radii.sm,
    backgroundColor: colors.bgInset,
    overflow: 'hidden',
  },
  /** Absolute wrapper so react-native-svg cannot expand the panel. */
  gridLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  stage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CHIP_H,
    zIndex: 1,
  },
  diagram: {
    position: 'relative',
    alignSelf: 'center',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  chip: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    backgroundColor: colors.bgPanel,
  },
  chipText: {
    fontFamily: typography.fontMedium,
    fontSize: 11,
    letterSpacing: -0.1,
    color: colors.text,
  },
});
