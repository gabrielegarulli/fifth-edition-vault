import type { NoteFoldersSettings, StateVault } from '../../platform'
import { planHomebrewTemplates, templateFolderProblem } from '../model/homebrewTemplates'

/**
 * Write the twenty-one homebrew templates into `folder` (MYDND-236), through the
 * SRD seeder's path: a `StateVault`, one `write` per file created, and **never
 * over a file that is there**.
 *
 * The templates carry no stamp, as the seeder's bases carry none: an
 * `export_hash` in a template would be copied into every note made from it, and
 * that note would then claim to be the exporter's. So a file at a template's
 * path is either the same text (`unchanged`) or someone's (`preserved`), and a
 * newer template reaches a vault only once the old file is deleted.
 *
 * | at the target path | outcome     |
 * | ------------------ | ----------- |
 * | nothing            | `created`   |
 * | the same text      | `unchanged`, not touched |
 * | anything else      | `preserved` |
 */

export interface TemplatesReport {
  folder: string
  created: number
  unchanged: number
  /** Paths left alone: a file was there with other text. */
  preserved: string[]
}

/** Line endings and trailing whitespace are not a difference. */
const normal = (text: string) => text.replace(/\r\n/g, '\n').trimEnd()

/** Throws, with the sentence the dialog shows, for a folder a catalog reads. */
export async function writeHomebrewTemplates(
  vault: StateVault,
  folder: string,
  folders: NoteFoldersSettings,
): Promise<TemplatesReport> {
  const problem = templateFolderProblem(folder, folders)
  if (problem) throw new Error(problem)

  const plan = planHomebrewTemplates(folder)
  const report: TemplatesReport = { folder: plan[0].path.slice(0, plan[0].path.lastIndexOf('/')), created: 0, unchanged: 0, preserved: [] }
  for (const file of plan) {
    const before = await vault.read(file.path)
    if (before === null || before === '') {
      // Written only over the nothing that was read: a file that appeared in
      // between is left as it now is.
      let raced = false
      await vault.write(file.path, current => {
        if (current === '') return file.text
        raced = true
        return current
      })
      if (raced) report.preserved.push(file.path)
      else report.created += 1
    } else if (normal(before) === normal(file.text)) {
      report.unchanged += 1
    } else {
      report.preserved.push(file.path)
    }
  }
  return report
}

/** The report in one line, for a Notice. */
export function describeTemplatesReport(report: TemplatesReport): string {
  const parts = [`${report.created} created`, `${report.unchanged} already there`]
  if (report.preserved.length > 0) parts.push(`${report.preserved.length} left alone because a different file is at that name`)
  return `Homebrew templates in "${report.folder}": ${parts.join(', ')}.`
}
