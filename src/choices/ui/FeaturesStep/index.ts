/**
 * Every question a class, its subclass and its levels ask (MYDND-29) — the web
 * builder's `LevelProgressionAccordions` and its eleven pickers, as one list of
 * sections in a pane.
 *
 * Each section is outlined while it is unanswered and never blocks Next, the
 * web builder's rule: an unanswered choice is saved as it stands and finished
 * in Edit. Every answer goes into `featureChoices` under the feature's
 * `featureId` — the key the bake reads it back by — in the web app's own shape,
 * so `@vault/derive` resolves it unchanged.
 *
 * **Each pick shows what it does under its select** (MYDND-155): a native select
 * cannot show text beside an option, but a pick is free to change. The level-up
 * panel renders this step, so it gets the same.
 *
 * Since MYDND-197 it is a folder, one picker per kind of question, matching
 * `model/choices/`. `FeaturesStep.tsx` lists the sections and its `Picker`
 * chooses each one's picker; this file is the surface, the three names other
 * files import, exactly as when it was one file.
 */

export { type MasteryWeapon, type FeaturesStepProps } from './types'
export { FeaturesStep } from './FeaturesStep'
