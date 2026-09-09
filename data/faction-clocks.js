/* Segment counts for the factions' Current Objective clocks.
 *
 * In the sourcebook each faction banner carries a star above the objective
 * text, and the star's POINTS are the clock's segments. The generated faction
 * data dropped that glyph, so the sizes live here, keyed by faction slug, and
 * are filled in by reading the book — a faction not listed defaults to
 * GOAL_CLOCK_DEFAULT.
 *
 * The clock a player sees remains resizable in the UI either way; this only
 * sets what a fresh clock starts as.
 */

export const GOAL_CLOCK_DEFAULT = 8;

export const GOAL_CLOCK_SIZES = {
  // 'guild-of-engineers': 8,
  // '51st-legion': 8,          // the "cleanse legion" banner reads as 8 points
};

export function goalClockSize(slug) {
  return GOAL_CLOCK_SIZES[slug] ?? GOAL_CLOCK_DEFAULT;
}
