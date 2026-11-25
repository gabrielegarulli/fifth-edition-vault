// The note builders' page (MYDND-233): the form, the live preview through the
// kind's own catalog, the checks, and Save. `/homebrew/new/<kind>` writes a new
// homebrew note; `/homebrew/edit/<kind>?path=…` (MYDND-272) opens a saved one
// and replaces it. The decision is docs/adr/0014.

import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useCompendium } from '../../compendium/host'
import { countValues, isUnderFolder, NOTE_BUILDER_PREFIX, NOTE_EDIT_PREFIX } from '../../platform'
import { useCatalogRows, useElementWidth, useGo } from '../../platform/host'
import { formProblems, readBackProblems } from '../model/check'
import { nameClash, suggestName, type NamedRow } from '../model/destination'
import { buildNote, slugOf } from '../model/emit'
import { emptyForm, prefilledForm, type BuilderForm } from '../model/forms'
import { BUILDER_CATALOG, BUILDER_LABEL, isBuilderKind, type BuilderKind } from '../model/kinds'
import { loadNote } from '../model/parse'
import { useHomebrew } from './context'
import { TextArea, TextField } from './fields'
import { KindFields } from './KindFields'
import { NoteMarkdown, NotePreview } from './Preview'
import { SaveDialog } from './SaveDialog'

/**
 * `/homebrew/new/<kind>`: a note builder (MYDND-233). The form on the left, the
 * note as its catalog will draw it on the right, and Save, which writes one new
 * file under the homebrew folder (ADR 0014). Below `NARROW_WIDTH` the two are
 * tabs, with the markdown a third. Measured on the pane, never the window.
 *
 * `/homebrew/edit/<kind>?path=…` (MYDND-272) is the same builder over a saved
 * homebrew note: the name locked, and Save replacing that file (ADR 0014's
 * amendment).
 *
 * The plugin's only: `app` draws it through the `noteBuilder` slot, which the
 * web build never fills.
 */

/** Below this the form and the preview do not fit side by side. */
export const NARROW_WIDTH = 760

/** Where each kind's catalog page is: a condition has none. */
const CATALOG_PAGE: Readonly<Record<BuilderKind, string | null>> = {
  spell: '/spells',
  condition: null,
  item: '/items',
  'magic-item': '/magic-items',
  feat: '/feats',
}

export function NoteBuilderPage() {
  const { pathname, search } = useLocation()
  const editing = pathname.startsWith(NOTE_EDIT_PREFIX)
  const kind = pathname.slice((editing ? NOTE_EDIT_PREFIX : NOTE_BUILDER_PREFIX).length)
  if (!isBuilderKind(kind)) {
    return (
      <div className="my-dnd-vault__scroll p-4">
        <h2 className="text-ui-larger font-bold text-normal">No such builder</h2>
        <p className="mt-1 text-muted">
          There is no note builder for <code>{kind}</code>.
        </p>
      </div>
    )
  }
  // Keyed, so another kind's route, or another prefill or note, starts a fresh form.
  if (editing) return <EditNote key={kind + search} kind={kind} path={new URLSearchParams(search).get('path') ?? ''} />
  return <Builder key={kind + search} kind={kind} prefill={search} />
}

type Loaded = { state: 'loading' } | { state: 'refused'; reasons: string[] } | { state: 'ready'; form: BuilderForm; text: string }

/**
 * `/homebrew/edit/<kind>?path=…` (MYDND-272): the note read, checked that a
 * save would keep everything in it (`loadNote`), then the same builder over
 * it. A note that is not a homebrew one, or that a save would change, is
 * refused with every reason, and the form never opens.
 */
function EditNote({ kind, path }: { kind: BuilderKind; path: string }) {
  const host = useHomebrew()
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    const settle = (next: Loaded) => {
      if (!cancelled) setLoaded(next)
    }
    if (!isUnderFolder(host.homebrewFolder(), path)) {
      settle({ state: 'refused', reasons: [`${path || 'This note'} is not under your homebrew folder, “${host.homebrewFolder()}”. Only a homebrew note opens in its builder; an exported note stays read-only.`] })
      return
    }
    void host.read(path).then(async text => {
      if (text === null) return settle({ state: 'refused', reasons: [`There is no note at ${path}.`] })
      const result = await loadNote(kind, path, text)
      settle(result.ok ? { state: 'ready', form: result.form, text } : { state: 'refused', reasons: result.reasons })
    })
    return () => {
      cancelled = true
    }
  }, [host, kind, path])

  if (loaded.state === 'ready') return <Builder kind={kind} prefill="" edit={{ path, form: loaded.form, text: loaded.text }} />
  return (
    <div className="my-dnd-vault__scroll p-4">
      <h2 className="text-ui-larger font-bold text-normal">Edit homebrew {BUILDER_LABEL[kind]}</h2>
      {loaded.state === 'loading' ? (
        <p className="mt-1 text-muted">Reading {path}…</p>
      ) : (
        <div role="alert" className="bst-banner bst-banner--err bst-nb-col mt-2">
          <p>
            <strong>Its builder cannot open {path}</strong> without losing something on save. Change it in Obsidian, or leave it as a note you edit by hand:
          </p>
          <ul className="bst-nb-problems">
            {loaded.reasons.map(r => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm bst-nb-self-start" onClick={() => host.openNote(path)}>
            Open the note
          </button>
        </div>
      )}
    </div>
  )
}

type Tab = 'form' | 'preview' | 'markdown'

/** What Edit hands the builder: the note, the form it fills, and its text as read, which a save must still find. */
interface Editing {
  path: string
  form: BuilderForm
  text: string
}

/** `prefill` is the route's query: a conversion's "Create note" (MYDND-257). `edit` is a saved note (MYDND-272). */
function Builder({ kind, prefill, edit }: { kind: BuilderKind; prefill: string; edit?: Editing }) {
  const host = useHomebrew()
  const compendium = useCompendium()
  const go = useGo()
  const [rootRef, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < NARROW_WIDTH

  const [defaults] = useState(() => host.defaults(kind))
  const [form, setForm] = useState<BuilderForm>(() => edit?.form ?? prefilledForm(kind, defaults.source, new URLSearchParams(prefill)))
  // The note's text as last read or saved: a save replaces only that (`replaceHomebrewNote`).
  const [onDisk, setOnDisk] = useState(edit?.text ?? '')
  // What the form wrote when opened or last saved. "No changes" is judged on
  // this, not on the file: a note Obsidian re-quoted is the same note.
  const [baseline, setBaseline] = useState(() => (edit ? buildNote(edit.form).text : ''))
  const [saveError, setSaveError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('form')
  const [showMarkdown, setShowMarkdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState(false)

  const rows = useCatalogRows(() => compendium[BUILDER_CATALOG[kind]].list() as unknown as NamedRow[])
  const classes = useCatalogRows(() => compendium.classes.list())
  const spells = useCatalogRows(() => compendium.spells.list())
  const suggestions = useMemo(
    () => ({ classes: [...new Set(classes.map(c => c.name))].sort(), spells: [...new Set(spells.map(s => s.name))].sort() }),
    [classes, spells],
  )
  const sources = useMemo(() => countValues(rows as unknown as Array<{ source: string | null }>, r => r.source).map(([value]) => value), [rows])

  const built = useMemo(() => buildNote(form), [form])
  const problems = useMemo(() => formProblems(form), [form])
  // Editing, the note is its own row, and its name is locked: no clash to warn of.
  const clash = !edit && form.name.trim() ? nameClash(rows, built.slug, form.name) : null

  // The reader's verdict, a moment after typing stops: one note, in memory.
  const [readBack, setReadBack] = useState<{ text: string; problems: string[] } | null>(null)
  useEffect(() => {
    if (problems.length > 0) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void readBackProblems(built).then(found => {
        if (!cancelled) setReadBack({ text: built.text, problems: found })
      })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [built, problems])
  const checked = problems.length === 0 && readBack?.text === built.text ? readBack.problems : null
  const canSave = problems.length === 0 && checked !== null && checked.length === 0

  const set = (patch: Partial<BuilderForm>) => {
    setForm(f => ({ ...f, ...patch }) as BuilderForm)
    setSaved(null)
    setSaveError(null)
    setDiscarding(false)
  }
  // Editing, Discard goes back to the note as it was opened, never to a blank form.
  const reset = () => {
    setForm(edit ? edit.form : emptyForm(kind, form.source))
    setDiscarding(false)
    setSaved(null)
    setSaveError(null)
  }
  const [replacing, setReplacing] = useState(false)
  const replace = async () => {
    if (!edit || !canSave || replacing) return
    setReplacing(true)
    setSaveError(null)
    try {
      await host.replace(edit.path, onDisk, built.text)
      setOnDisk(built.text)
      setBaseline(built.text)
      setSaved(edit.path)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setReplacing(false)
    }
  }

  const label = BUILDER_LABEL[kind]
  const catalogPage = CATALOG_PAGE[kind]

  const formPane = (
    <form className="my-dnd-vault__scroll bst-nb-form" aria-label={`The ${label}`} onSubmit={e => e.preventDefault()}>
      <div className="bst-nb-grid bst-nb-grid--name">
        <TextField
          label="Name"
          value={form.name}
          onChange={name => set({ name })}
          readOnly={edit !== undefined}
          hint={
            edit ? (
              <>
                Locked: the name is the note’s identity, <code className="bst-nb-mono">{built.fileName}</code>. Rename it in Obsidian.
              </>
            ) : built.slug ? (
              <>
                Saved as <code className="bst-nb-mono">{built.fileName}</code>
              </>
            ) : (
              'Its file is named after it.'
            )
          }
        />
        <TextField label="Source" value={form.source} list="bst-nb-sources" onChange={source => set({ source })} hint="Its own shelf in Books in play." />
        <datalist id="bst-nb-sources">
          {[...new Set(['Homebrew', ...sources])].map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      {clash ? (
        <p role="status" className="bst-banner bst-banner--warn">
          “{clash.name}” is already a {label} ({clash.path}). Save will offer another name.
        </p>
      ) : null}
      <KindFields form={form} set={set} suggestions={suggestions} />
      <TextArea
        label={kind === 'feat' ? 'Introduction' : 'Description'}
        rows={kind === 'feat' ? 2 : 6}
        value={form.description}
        onChange={description => set({ description })}
        hint={kind === 'feat' ? 'The sentence before the benefits.' : 'Markdown, shown as the note’s text.'}
      />
    </form>
  )

  const checks = (
    <section aria-label="Checks" className="bst-nb-card bst-nb-checkcard">
      <h3 className="bst-nb-h">Before it can be saved</h3>
      {problems.length > 0 ? (
        <ul className="bst-nb-problems">
          {problems.map(p => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : checked === null ? (
        <p className="bst-nb-hint">Reading it back through the {BUILDER_CATALOG[kind]} catalog…</p>
      ) : checked.length > 0 ? (
        <>
          <p className="bst-nb-hint">The form is complete, but the note would not read back as filled in. This is the builder’s bug, not yours:</p>
          <ul className="bst-nb-problems">
            {checked.map(p => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="bst-nb-checks">
          <li>✓ Lists in the {BUILDER_CATALOG[kind]} catalog from your homebrew folder</li>
          <li>✓ Reads back every field as written</li>
        </ul>
      )}
    </section>
  )

  const previewPane = (markdown: boolean) => (
    <section className="my-dnd-vault__scroll bst-nb-preview" aria-label="Preview">
      {narrow ? null : (
        <div className="bst-nb-row bst-nb-row--wrap">
          <h3 className="bst-nb-h">{showMarkdown ? 'The markdown' : `As ${catalogPage ?? 'the note'} will show it`}</h3>
          <span className="bst-nb-spacer" />
          <div className="bst-cb-seg" role="group" aria-label="Preview">
            <button type="button" className="bst-plain bst-cb-seg-btn" aria-pressed={!showMarkdown} onClick={() => setShowMarkdown(false)}>
              Page
            </button>
            <button type="button" className="bst-plain bst-cb-seg-btn" aria-pressed={showMarkdown} onClick={() => setShowMarkdown(true)}>
              Show the markdown
            </button>
          </div>
        </div>
      )}
      {markdown ? <NoteMarkdown built={built} /> : problems.some(p => p.startsWith('Give it a name')) ? <p className="bst-nb-hint">Name it to see it.</p> : <NotePreview built={built} />}
      {checks}
    </section>
  )

  return (
    <div ref={rootRef} className="bst bst-cb bst-nb">
      <header className="bst-nb-head">
        {catalogPage ? (
          <button type="button" className="bst-plain bst-cb-link" onClick={e => go(catalogPage, e)}>
            ← {catalogPage.slice(1).replace('-', ' ').replace(/^./, c => c.toUpperCase())}
          </button>
        ) : null}
        <h2 className="bst-nb-title">{edit ? `Edit homebrew ${label}` : `New homebrew ${label}`}</h2>
        <span className="bst-nb-spacer" />
        <span className="bst-nb-hint" role="status">
          {saved ? 'Saved' : edit && built.text === baseline ? 'No changes' : 'Not saved'}
        </span>
        {discarding ? (
          <button type="button" className="bst-plain bst-btn-danger bst-btn-sm" onClick={reset}>
            Discard this {label}?
          </button>
        ) : (
          <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm" onClick={() => setDiscarding(true)}>
            Discard
          </button>
        )}
        {edit ? (
          <button type="button" className="bst-plain bst-btn-primary bst-btn-sm" disabled={!canSave || replacing || built.text === baseline} onClick={() => void replace()}>
            {replacing ? 'Saving…' : 'Save'}
          </button>
        ) : (
          <button type="button" className="bst-plain bst-btn-primary bst-btn-sm" disabled={!canSave} onClick={() => setSaving(true)}>
            Save…
          </button>
        )}
      </header>

      {saveError ? (
        <p role="alert" className="bst-banner bst-banner--err">
          {saveError}
        </p>
      ) : null}

      {saved ? (
        <div role="status" className="bst-banner bst-nb-saved">
          <span>
            {edit ? 'Saved' : 'Created'} <code className="bst-nb-mono">{saved}</code>.
          </span>
          <span className="bst-nb-row bst-nb-row--wrap">
            {catalogPage ? (
              <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm" onClick={e => go(catalogPage, e)}>
                Open {catalogPage}
              </button>
            ) : null}
            <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm" onClick={() => host.openNote(saved)}>
              Open the note
            </button>
            {edit ? null : (
              <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm" onClick={reset}>
                New {label}
              </button>
            )}
          </span>
        </div>
      ) : null}

      {narrow ? (
        <div className="bst-cb-seg bst-nb-tabs" role="group" aria-label="Builder">
          {(['form', 'preview', 'markdown'] as const).map(t => (
            <button key={t} type="button" className="bst-plain bst-cb-seg-btn" aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t === 'form' ? 'Form' : t === 'preview' ? 'Preview' : 'Markdown'}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`bst-nb-body${narrow ? '' : ' bst-nb-body--wide'}`}>
        {narrow ? (tab === 'form' ? formPane : previewPane(tab === 'markdown')) : (
          <>
            {formPane}
            {previewPane(showMarkdown)}
          </>
        )}
      </div>

      {saving ? (
        <SaveDialog
          kind={kind}
          built={built}
          folder={host.defaults(kind).folder}
          clash={clash}
          suggestion={suggestName(rows, form.name, slugOf)}
          onRename={name => set({ name })}
          onCancel={() => setSaving(false)}
          onSaved={(path, folder) => {
            setSaving(false)
            setSaved(path)
            void host.remember(kind, { folder, source: form.source.trim() })
          }}
        />
      ) : null}
    </div>
  )
}
