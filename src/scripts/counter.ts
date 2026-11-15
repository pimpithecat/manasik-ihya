interface CounterState {
  round: number
  stop: number
  done: boolean
}

function setupCounter(root: HTMLElement) {
  const name = root.dataset.counter ?? 'hitung'
  const key = `manasik:${name}`
  const total = Number(root.dataset.total ?? '7')
  const stops = Array.from(root.querySelectorAll<HTMLElement>('[data-panel]'))

  const roundEl = root.querySelector<HTMLElement>('[data-round]')
  const unitLabel = root.querySelector<HTMLElement>('[data-unit-label]')
  const directionEl = root.querySelector<HTMLElement>('[data-direction]')
  const dots = Array.from(root.querySelectorAll<HTMLElement>('[data-dot]'))
  const stopLabel = root.querySelector<HTMLElement>('[data-stop-label]')
  const stopPrev = root.querySelector<HTMLButtonElement>('[data-stop-prev]')
  const stopNext = root.querySelector<HTMLButtonElement>('[data-stop-next]')
  const doneButton = root.querySelector<HTMLButtonElement>('[data-round-done]')
  const resetButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-reset]'))
  const complete = root.querySelector<HTMLElement>('[data-complete]')
  const live = root.querySelector<HTMLElement>('[data-counter-status]')
  const restore = root.querySelector<HTMLElement>('[data-restore]')
  const body = root.querySelector<HTMLElement>('[data-counter-body]')

  let state: CounterState = { round: 1, stop: 0, done: false }
  let restored = false

  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CounterState>
      if (typeof parsed.round === 'number' && parsed.round >= 1 && parsed.round <= total) {
        state = {
          round: parsed.round,
          stop: Math.max(0, Math.min(stops.length - 1, Number(parsed.stop) || 0)),
          done: Boolean(parsed.done),
        }
        restored = true
      }
    }
  } catch {}

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {}
  }

  function announce(message: string) {
    if (live) live.textContent = message
  }

  function render() {
    if (roundEl) roundEl.textContent = String(state.round)
    if (unitLabel) unitLabel.textContent = root.dataset.unit ?? 'Putaran'

    if (directionEl) {
      const pair = root.dataset.pair
      if (pair) {
        const [a, b] = pair.split('|')
        directionEl.textContent = state.round % 2 === 1 ? `${a} → ${b}` : `${b} → ${a}`
      }
    }

    for (const dot of dots) {
      const index = Number(dot.dataset.dot)
      const status = state.done || index < state.round - 1 ? 'done' : index === state.round - 1 ? 'active' : 'idle'
      dot.dataset.state = status
    }

    stops.forEach((panel, index) => {
      panel.hidden = index !== state.stop
    })

    const activeStop = stops[state.stop]
    const label = activeStop?.dataset.panelLabel ?? ''
    if (stopLabel) {
      stopLabel.textContent =
        stops.length > 1 ? `Posisi ${state.stop + 1} dari ${stops.length} · ${label}` : label
    }

    if (stopPrev) stopPrev.disabled = state.stop === 0
    if (stopNext) stopNext.disabled = state.stop === stops.length - 1

    if (doneButton) {
      doneButton.hidden = state.done
      doneButton.textContent =
        state.round === total ? (name === 'tawaf' ? 'Selesaikan tawaf' : 'Selesaikan sa’i') : `${root.dataset.unit ?? 'Putaran'} selesai`
    }

    if (complete) complete.hidden = !state.done
    if (body) body.hidden = state.done

    if (restore) {
      restore.hidden = !restored || state.done
    }

    announce(
      state.done
        ? `${root.dataset.name ?? 'Hitungan'} selesai.`
        : `${root.dataset.unit ?? 'Putaran'} ${state.round} dari ${total}. ${label}.`
    )
  }

  doneButton?.addEventListener('click', () => {
    if (state.round < total) {
      state.round += 1
      state.stop = 0
    } else {
      state.done = true
    }
    save()
    render()
  })

  stopPrev?.addEventListener('click', () => {
    if (state.stop > 0) {
      state.stop -= 1
      save()
      render()
    }
  })

  stopNext?.addEventListener('click', () => {
    if (state.stop < stops.length - 1) {
      state.stop += 1
      save()
      render()
    }
  })

  for (const button of resetButtons) {
    button.addEventListener('click', () => {
      state = { round: 1, stop: 0, done: false }
      restored = false
      save()
      render()
      announce('Hitungan dimulai dari awal.')
    })
  }

  render()
}

document.querySelectorAll<HTMLElement>('[data-counter]').forEach(setupCounter)
