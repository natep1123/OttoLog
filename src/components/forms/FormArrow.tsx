import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/tokens';

type Props = {
  color?: string;
  /** Total drawn width — shaft + head. */
  width?: number;
  height?: number;
};

/**
 * Solid rightwards arrow matching ClusterSequenceDiagram flow arrows:
 * thin stroke, chevron head (not a text glyph).
 */
export function FormArrow({
  color = colors.textDim,
  width = 22,
  height = 12,
}: Props) {
  const cy = height / 2;
  const tip = width - 1;
  const shaftEnd = tip - 4;
  const head = 4.5;
  const d = [
    `M 1 ${cy} L ${shaftEnd} ${cy}`,
    `M ${tip - head} ${cy - head} L ${tip} ${cy} L ${tip - head} ${cy + head}`,
  ].join(' ');

  return (
    <Svg
      width={width}
      height={height}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Path
        d={d}
        stroke={color}
        strokeWidth={1.75}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
