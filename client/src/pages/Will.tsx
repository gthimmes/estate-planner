import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { isMinor, type Person, type ResiduaryShare, type WillGift, type WillPlanInput } from '../types'

type StepId = 'about' | 'executor' | 'guardian' | 'gifts' | 'estate' | 'review'

const STEP_TITLES: Record<StepId, string> = {
  about: 'About you',
  executor: 'Your executor',
  guardian: 'Guardians for your children',
  gifts: 'Specific gifts',
  estate: 'The rest of your estate',
  review: 'Review & finish',
}

function PersonSelect({
  people,
  value,
  onChange,
  exclude = [],
  allowNone = true,
  noneLabel = 'Not chosen yet',
}: {
  people: Person[]
  value: string | null
  onChange: (id: string | null) => void
  exclude?: (string | null)[]
  allowNone?: boolean
  noneLabel?: string
}) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      {allowNone && <option value="">{noneLabel}</option>}
      {people
        .filter((p) => !exclude.includes(p.id))
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.firstName} {p.lastName}
          </option>
        ))}
    </select>
  )
}

export function Will({ householdId }: { householdId: string }) {
  const navigate = useNavigate()
  const [people, setPeople] = useState<Person[]>([])
  const [form, setForm] = useState<WillPlanInput | null>(null)
  const [stateSupported, setStateSupported] = useState(true)
  const [step, setStep] = useState<StepId>('about')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.getWill(householdId), api.listPeople(householdId)])
      .then(([will, ppl]) => {
        setPeople(ppl)
        setStateSupported(will.stateSupported)
        // prev ?? …: a late duplicate response (React StrictMode double-mount)
        // must never clobber selections the user has already made
        setForm(
          (prev) =>
            prev ?? {
              testatorPersonId: will.testatorPersonId,
              executorPersonId: will.executorPersonId,
              backupExecutorPersonId: will.backupExecutorPersonId,
              waiveExecutorBond: will.waiveExecutorBond,
              guardianPersonId: will.guardianPersonId,
              backupGuardianPersonId: will.backupGuardianPersonId,
              residuaryStrategy: will.residuaryStrategy,
              gifts: will.gifts,
              residuaryShares: will.residuaryShares,
            },
        )
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [householdId])

  const adults = useMemo(() => people.filter((p) => !isMinor(p)), [people])
  const hasMinors = useMemo(() => people.some((p) => isMinor(p)), [people])
  const hasSpouse = people.some((p) => p.role === 'Spouse')
  const hasChildren = people.some((p) => p.role === 'Child')

  const steps: StepId[] = useMemo(
    () =>
      hasMinors
        ? ['about', 'executor', 'guardian', 'gifts', 'estate', 'review']
        : ['about', 'executor', 'gifts', 'estate', 'review'],
    [hasMinors],
  )

  if (error && !form)
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  if (!form) return <p className="loading">Loading your will…</p>

  if (!stateSupported) {
    return (
      <div>
        <header className="page-header">
          <h1>Your will</h1>
        </header>
        <section className="card">
          <h2>Louisiana needs an attorney</h2>
          <p>
            Louisiana follows a civil-law system unlike every other state, and self-help will
            software (ours included) doesn't safely cover it. A local estate attorney is the right
            path — the rest of your plan here (family, assets, beneficiary tracking) still works.
          </p>
        </section>
      </div>
    )
  }

  if (people.length === 0) {
    return (
      <div>
        <header className="page-header">
          <h1>Your will</h1>
        </header>
        <section className="card">
          <p>
            Before writing your will, add the people in your life — yourself, and anyone you want
            to name as executor, guardian, or beneficiary.
          </p>
          <Link to="/family">Add your family first →</Link>
        </section>
      </div>
    )
  }

  const stepIndex = steps.indexOf(step)

  async function saveAndGo(next: StepId) {
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      await api.saveWill(householdId, form)
      setStep(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function finish() {
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      await api.saveWill(householdId, form)
      await api.completeWill(householdId)
      navigate('/will/document')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish')
    } finally {
      setSaving(false)
    }
  }

  const set = (patch: Partial<WillPlanInput>) => setForm({ ...form, ...patch })

  const totalPercent = form.residuaryShares.reduce((sum, s) => sum + (s.percent || 0), 0)

  return (
    <div className="wizard">
      <header className="page-header">
        <h1>Your will</h1>
        <p className="subtitle">
          Step {stepIndex + 1} of {steps.length}: {STEP_TITLES[step]}
        </p>
        <ol className="step-dots" aria-hidden="true">
          {steps.map((s, i) => (
            <li key={s} className={i <= stepIndex ? 'active' : ''} />
          ))}
        </ol>
      </header>

      {step === 'about' && (
        <section className="card">
          <h2>Whose will is this?</h2>
          <p>
            A will speaks for one person. Pick who this will is for — you can make another for your
            spouse afterward.
          </p>
          <label>
            This will is for
            <PersonSelect
              people={adults}
              value={form.testatorPersonId}
              onChange={(id) => set({ testatorPersonId: id })}
            />
          </label>
          <div className="wizard-nav">
            <span />
            <button
              onClick={() => saveAndGo('executor')}
              disabled={saving || !form.testatorPersonId}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 'executor' && (
        <section className="card">
          <h2>Who settles your estate?</h2>
          <p>
            Your <strong>executor</strong> gathers your assets, pays your debts, and carries out
            this will. Most people choose their spouse or an adult child, with a backup in case
            they can't serve.
          </p>
          <label>
            Executor
            <PersonSelect
              people={adults}
              value={form.executorPersonId}
              onChange={(id) => set({ executorPersonId: id })}
              exclude={[form.testatorPersonId]}
            />
          </label>
          <label>
            Backup executor (recommended)
            <PersonSelect
              people={adults}
              value={form.backupExecutorPersonId}
              onChange={(id) => set({ backupExecutorPersonId: id })}
              exclude={[form.testatorPersonId, form.executorPersonId]}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.waiveExecutorBond}
              onChange={(e) => set({ waiveExecutorBond: e.target.checked })}
            />
            Don't make my executor buy a bond
          </label>
          <p className="hint">
            Courts can require executors to buy insurance ("post bond") against mismanagement.
            Waiving it saves your estate money — the standard choice when you trust your executor.
            Skipping this waiver is one of the most common DIY-will mistakes.
          </p>
          <div className="wizard-nav">
            <button className="secondary" onClick={() => setStep('about')}>
              Back
            </button>
            <button
              onClick={() => saveAndGo(hasMinors ? 'guardian' : 'gifts')}
              disabled={saving || !form.executorPersonId}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 'guardian' && (
        <section className="card">
          <h2>Who raises your children?</h2>
          <p>
            If both parents are gone, the court decides who raises your minor children — unless
            your will nominates someone. This is the single most important reason parents write a
            will.
          </p>
          <label>
            Guardian
            <PersonSelect
              people={adults}
              value={form.guardianPersonId}
              onChange={(id) => set({ guardianPersonId: id })}
              exclude={[form.testatorPersonId]}
            />
          </label>
          <label>
            Backup guardian (recommended)
            <PersonSelect
              people={adults}
              value={form.backupGuardianPersonId}
              onChange={(id) => set({ backupGuardianPersonId: id })}
              exclude={[form.testatorPersonId, form.guardianPersonId]}
            />
          </label>
          <p className="hint">
            Don't see the right person? Add them under <Link to="/family">Family</Link> first —
            grandparents, siblings, and close friends are all common choices.
          </p>
          <div className="wizard-nav">
            <button className="secondary" onClick={() => setStep('executor')}>
              Back
            </button>
            <button onClick={() => saveAndGo('gifts')} disabled={saving || !form.guardianPersonId}>
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 'gifts' && (
        <section className="card">
          <h2>Any specific gifts?</h2>
          <p>
            Optional: leave particular things to particular people — "my wedding ring to my
            daughter," "my truck to my brother." Everything else is handled in the next step.
          </p>
          {form.gifts.map((gift, i) => (
            <div key={i} className="gift-row">
              <label>
                What
                <input
                  value={gift.description}
                  placeholder="e.g. my wedding ring"
                  onChange={(e) => {
                    const gifts = [...form.gifts]
                    gifts[i] = { ...gift, description: e.target.value }
                    set({ gifts })
                  }}
                />
              </label>
              <label>
                To whom
                <PersonSelect
                  people={people}
                  value={gift.recipientPersonId}
                  onChange={(id) => {
                    const gifts = [...form.gifts]
                    gifts[i] = { ...gift, recipientPersonId: id }
                    set({ gifts })
                  }}
                  noneLabel="Someone else…"
                />
              </label>
              {!gift.recipientPersonId && (
                <label>
                  Their name
                  <input
                    value={gift.recipientName ?? ''}
                    placeholder="Full name"
                    onChange={(e) => {
                      const gifts = [...form.gifts]
                      gifts[i] = { ...gift, recipientName: e.target.value }
                      set({ gifts })
                    }}
                  />
                </label>
              )}
              <button
                className="link danger"
                onClick={() => set({ gifts: form.gifts.filter((_, j) => j !== i) })}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="secondary"
            onClick={() =>
              set({
                gifts: [
                  ...form.gifts,
                  { description: '', recipientPersonId: null, recipientName: null } as WillGift,
                ],
              })
            }
          >
            + Add a gift
          </button>
          <div className="wizard-nav">
            <button
              className="secondary"
              onClick={() => setStep(hasMinors ? 'guardian' : 'executor')}
            >
              Back
            </button>
            <button onClick={() => saveAndGo('estate')} disabled={saving}>
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 'estate' && (
        <section className="card">
          <h2>Who gets everything else?</h2>
          <p>
            After specific gifts, debts, and expenses, the rest of your estate — usually the bulk
            of it — goes to the people you choose here.
          </p>
          <div className="radio-group" role="radiogroup" aria-label="Residuary strategy">
            {hasSpouse && (
              <label className="radio">
                <input
                  type="radio"
                  name="residuary"
                  checked={form.residuaryStrategy === 'SpouseThenChildren'}
                  onChange={() => set({ residuaryStrategy: 'SpouseThenChildren' })}
                />
                Everything to my spouse — then split among my children if my spouse doesn't survive
                me
              </label>
            )}
            {hasChildren && (
              <label className="radio">
                <input
                  type="radio"
                  name="residuary"
                  checked={form.residuaryStrategy === 'ChildrenEqually'}
                  onChange={() => set({ residuaryStrategy: 'ChildrenEqually' })}
                />
                Split equally among my children
              </label>
            )}
            <label className="radio">
              <input
                type="radio"
                name="residuary"
                checked={form.residuaryStrategy === 'Custom'}
                onChange={() => set({ residuaryStrategy: 'Custom' })}
              />
              Let me split it myself
            </label>
          </div>

          {form.residuaryStrategy === 'Custom' && (
            <div className="shares">
              {form.residuaryShares.map((share, i) => (
                <div key={i} className="gift-row">
                  <label>
                    Beneficiary
                    <PersonSelect
                      people={people}
                      value={share.personId}
                      onChange={(id) => {
                        const shares = [...form.residuaryShares]
                        shares[i] = { ...share, personId: id }
                        set({ residuaryShares: shares })
                      }}
                      noneLabel="Someone else…"
                    />
                  </label>
                  {!share.personId && (
                    <label>
                      Their name
                      <input
                        value={share.name ?? ''}
                        placeholder="Full name or charity"
                        onChange={(e) => {
                          const shares = [...form.residuaryShares]
                          shares[i] = { ...share, name: e.target.value }
                          set({ residuaryShares: shares })
                        }}
                      />
                    </label>
                  )}
                  <label>
                    Share (%)
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={share.percent || ''}
                      onChange={(e) => {
                        const shares = [...form.residuaryShares]
                        shares[i] = { ...share, percent: Number(e.target.value) }
                        set({ residuaryShares: shares })
                      }}
                    />
                  </label>
                  <button
                    className="link danger"
                    onClick={() =>
                      set({ residuaryShares: form.residuaryShares.filter((_, j) => j !== i) })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                className="secondary"
                onClick={() =>
                  set({
                    residuaryShares: [
                      ...form.residuaryShares,
                      { personId: null, name: null, percent: 0 } as ResiduaryShare,
                    ],
                  })
                }
              >
                + Add a beneficiary
              </button>
              <p className={totalPercent === 100 ? 'hint' : 'error'}>
                Shares total {totalPercent}% {totalPercent !== 100 && '— they must add up to 100%'}
              </p>
            </div>
          )}
          <div className="wizard-nav">
            <button className="secondary" onClick={() => setStep('gifts')}>
              Back
            </button>
            <button onClick={() => saveAndGo('review')} disabled={saving}>
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 'review' && (
        <section className="card">
          <h2>Almost there</h2>
          <ul className="review-list">
            <li>
              <strong>This will is for:</strong>{' '}
              {adults.find((p) => p.id === form.testatorPersonId)?.firstName ?? '—'}{' '}
              {adults.find((p) => p.id === form.testatorPersonId)?.lastName ?? ''}
            </li>
            <li>
              <strong>Executor:</strong>{' '}
              {people.find((p) => p.id === form.executorPersonId)?.firstName ?? '—'}{' '}
              {people.find((p) => p.id === form.executorPersonId)?.lastName ?? ''}
              {form.waiveExecutorBond && ' (no bond required)'}
            </li>
            {hasMinors && (
              <li>
                <strong>Guardian:</strong>{' '}
                {people.find((p) => p.id === form.guardianPersonId)?.firstName ?? '—'}{' '}
                {people.find((p) => p.id === form.guardianPersonId)?.lastName ?? ''}
              </li>
            )}
            <li>
              <strong>Specific gifts:</strong> {form.gifts.length || 'none'}
            </li>
            <li>
              <strong>Everything else:</strong>{' '}
              {form.residuaryStrategy === 'SpouseThenChildren'
                ? 'spouse first, then children'
                : form.residuaryStrategy === 'ChildrenEqually'
                  ? 'split equally among children'
                  : `custom split (${totalPercent}%)`}
            </li>
          </ul>
          <p className="hint">
            Finishing generates your document. It only becomes legally effective once you print it
            and sign it with witnesses — we'll walk you through that.
          </p>
          <div className="wizard-nav">
            <button className="secondary" onClick={() => setStep('estate')}>
              Back
            </button>
            <button onClick={finish} disabled={saving}>
              {saving ? 'Finishing…' : 'Finish my will'}
            </button>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  )
}
