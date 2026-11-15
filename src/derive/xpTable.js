// @ts-check
const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000,
  48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
]

/**
 * @param {number} level
 */
export function xpForLevel(level) {
  return XP_THRESHOLDS[Math.min(Math.max(level, 1), 20) - 1]
}

/**
 * @param {number} xp
 * @param {number} currentLevel
 */
export function xpProgressForLevel(xp, currentLevel) {
  if (currentLevel >= 20) return 1
  return Math.min(1, Math.max(0, xp / XP_THRESHOLDS[currentLevel]))
}

/**
 * @param {number} xp
 * @param {number} currentLevel
 */
export function isLevelUpReady(xp, currentLevel) {
  if (currentLevel >= 20) return false
  return xp >= XP_THRESHOLDS[currentLevel]
}

/**
 * @param {number} xp
 * @param {number} currentLevel
 */
export function xpToNextLevel(xp, currentLevel) {
  if (currentLevel >= 20) return 0
  return Math.max(0, XP_THRESHOLDS[currentLevel] - xp)
}
