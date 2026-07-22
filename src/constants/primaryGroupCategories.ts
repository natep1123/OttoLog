/**
 * Primary Group `category` — balance Insights axis (greenfield NOT NULL).
 * Matches sql/greenfield/005_analytics.sql CHECK.
 */

export const PRIMARY_GROUP_CATEGORIES = [
  'Push',
  'Pull',
  'Lower',
  'Core',
  'Power',
  'Skill',
  'Cardio',
  'Combat',
  'Mobility',
  'Wellness',
] as const;

export type PrimaryGroupCategory = (typeof PRIMARY_GROUP_CATEGORIES)[number];

export const PRIMARY_GROUP_CATEGORY_OPTIONS: {
  id: PrimaryGroupCategory;
  label: string;
}[] = PRIMARY_GROUP_CATEGORIES.map((id) => ({ id, label: id }));

export function isPrimaryGroupCategory(
  value: string,
): value is PrimaryGroupCategory {
  return (PRIMARY_GROUP_CATEGORIES as readonly string[]).includes(value);
}

/** Default when creating a PG without an explicit pick (exercise inline create). */
export const DEFAULT_PRIMARY_GROUP_CATEGORY: PrimaryGroupCategory = 'Skill';
