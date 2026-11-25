import { convertPath } from '../../platform'
import { useGo } from '../../platform/host'
import { useDdbConvert } from './context'
import { FilePicker } from './FilePicker'

/**
 * The roster's "Import from a file" (MYDND-257), the characters domain's
 * `FileImport` slot: pick the saved file, and the review opens on it. Nothing
 * is written until the review's Convert.
 */
export function FileImport() {
  const { holdFile } = useDdbConvert()
  const go = useGo()
  return (
    <FilePicker
      onFile={file => {
        holdFile(file)
        go(convertPath(file.ddbId))
      }}
    />
  )
}
