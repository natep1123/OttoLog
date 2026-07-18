import { layer, radii } from '../../theme/tokens';

/**
 * Nestable form layers resolve all structural color from `theme.layer`.
 */
export type FormNodeKind = keyof typeof layer;

export const formRadii = {
  node: radii.sm,
  panel: radii.md,
} as const;

/** Every layer uses the same internal inset and aligned outer bounds. */
export const nodePaddingX = 12;
export const nodeBorderWidth = 1;

/**
 * A child escapes its parent's rail + inset on the left and inset on the
 * right, placing its outer box and rail directly over the parent's.
 * Vertical padding/gaps briefly reveal the parent rail between child boxes.
 */
const nestedItemsLayout = {
  marginLeft: -(nodeBorderWidth + nodePaddingX),
  marginRight: -(nodeBorderWidth + nodePaddingX),
  paddingVertical: 8,
} as const;

export const sessionItemsLayout = nestedItemsLayout;
export const blockItemsLayout = nestedItemsLayout;
export const clusterItemsLayout = nestedItemsLayout;

/** Add controls use the exact shared token of the layer they create. */
export function addLayerButtonColors(creates: FormNodeKind) {
  const token = layer[creates];
  return {
    border: token.chip.color,
    wash: token.chip.background,
    label: token.chip.color,
  };
}

/** Fixed CoordRow geometry used to align section chrome with card titles. */
export const layerHeaderLeadingWidth = 28;

/** Shared disclosure / coord chevron — keep CoordRow and Disclosure in sync. */
export const formChevron = {
  fontSize: 22,
  lineHeight: 24,
} as const;
