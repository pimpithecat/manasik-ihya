const root = document.querySelector<HTMLElement>('[data-reader]')

if (root) {
  const allSlides = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'))
  const closeButton = root.querySelector<HTMLAnchorElement>('[data-reader-close]')
  const count = root.querySelector<HTMLElement>('[data-reader-count]')
  const stageLabel = root.querySelector<HTMLElement>('[data-reader-stage]')
  const progress = root.querySelector<HTMLElement>('[data-reader-progress]')
  const prev = root.querySelector<HTMLButtonElement>('[data-reader-prev]')
  const next = root.querySelector<HTMLButtonElement>('[data-reader-next]')
  const sizeButton = root.querySelector<HTMLButtonElement>('[data-size-cycle]')
  const wakeButton = root.querySelector<HTMLButtonElement>('[data-wake]')
  const announce = document.getElementById('pengumuman')

  const params = new URLSearchParams(location.search)
  const stage = params.get('tahap')
  const byStage = stage ? allSlides.filter((slide) => slide.dataset.stage === stage) : []
  let order = byStage.length ? byStage : allSlides
  let position = 0

  const readHash = () => {
    const raw = decodeURIComponent(location.hash.replace(/^#/, ''))
    return raw.startsWith('dua-') ? raw.slice(4) : raw
  }

  const hash = readHash()
  if (hash) {
    const filtered = order.findIndex((slide) => slide.dataset.dua === hash)
    if (filtered >= 0) {
      position = filtered
    } else {
      const global = allSlides.findIndex((slide) => slide.dataset.dua === hash)
      if (global >= 0) {
        order = allSlides
        position = global
      }
    }
  }

  function paint() {
    const active = order[position]
    if (!active) return

    for (const slide of allSlides) slide.hidden = slide !== active

    if (count) count.textContent = `${position + 1} / ${order.length}`
    if (stageLabel) stageLabel.textContent = active.dataset.stageLabel ?? ''
    if (progress) progress.style.width = `${((position + 1) / order.length) * 100}%`
    if (prev) prev.disabled = position === 0
    if (next) next.disabled = position === order.length - 1

    const title = active.querySelector<HTMLElement>('.dua__title')?.textContent ?? ''
    if (announce) {
      announce.textContent = `${title} — ${position + 1} dari ${order.length}`.trim()
    }

    const id = active.dataset.dua
    if (id) {
      history.replaceState(null, '', `${location.pathname}${location.search}#dua-${id}`)
    }

    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  function go(delta: number) {
    const target = position + delta
    if (target < 0 || target >= order.length) return
    position = target
    paint()
  }

  // Tautan dalam ke #dua-... saat halaman ini sudah terbuka.
  window.addEventListener('hashchange', () => {
    const target = readHash()
    if (!target) return
    let index = order.findIndex((slide) => slide.dataset.dua === target)
    if (index < 0) {
      index = allSlides.findIndex((slide) => slide.dataset.dua === target)
      if (index >= 0) order = allSlides
    }
    if (index >= 0) {
      position = index
      paint()
    }
  })

  // Kembali ke halaman asal (beranda atau tahap), bukan ke daftar panduan.
  function closeReader() {
    const fromSameSite = document.referrer.startsWith(location.origin)
    if (window.history.length > 1 && fromSameSite) {
      window.history.back()
    } else {
      location.href = '/'
    }
  }

  prev?.addEventListener('click', () => go(-1))
  next?.addEventListener('click', () => go(1))

  closeButton?.addEventListener('click', (event) => {
    event.preventDefault()
    closeReader()
  })

  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault()
      go(1)
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault()
      go(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      position = 0
      paint()
    } else if (event.key === 'End') {
      event.preventDefault()
      position = order.length - 1
      paint()
    } else if (event.key === 'Escape') {
      closeReader()
    }
  })

  let touchX = 0
  let touchY = 0
  root.addEventListener(
    'touchstart',
    (event) => {
      touchX = event.changedTouches[0]?.clientX ?? 0
      touchY = event.changedTouches[0]?.clientY ?? 0
    },
    { passive: true }
  )
  root.addEventListener(
    'touchend',
    (event) => {
      const x = event.changedTouches[0]?.clientX ?? 0
      const y = event.changedTouches[0]?.clientY ?? 0
      const dx = x - touchX
      const dy = y - touchY
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        go(dx < 0 ? 1 : -1)
      }
    },
    { passive: true }
  )

  // Ukuran teks: satu tombol yang berputar kecil → sedang → besar.
  const SIZE_KEY = 'manasik:text-size'
  const SIZES = ['kecil', 'sedang', 'besar']
  const rootEl = document.documentElement

  function currentSize(): string {
    const value = rootEl.dataset.size
    return value === 'kecil' || value === 'besar' ? value : 'sedang'
  }

  function paintSize() {
    const size = currentSize()
    if (!sizeButton) return
    sizeButton.textContent = size === 'kecil' ? 'Aa−' : size === 'besar' ? 'Aa+' : 'Aa'
    sizeButton.title = `Ukuran teks: ${size}`
    sizeButton.setAttribute('aria-label', `Ukuran teks: ${size}. Tekan untuk mengganti.`)
  }

  sizeButton?.addEventListener('click', () => {
    const index = SIZES.indexOf(currentSize())
    const size = SIZES[(index + 1) % SIZES.length]
    if (size === 'sedang') delete rootEl.dataset.size
    else rootEl.dataset.size = size
    try {
      localStorage.setItem(SIZE_KEY, size)
    } catch {}
    paintSize()
  })

  paintSize()

  // Tampilkan atau sembunyikan terjemah; pilihan disimpan di peramban.
  const translationButton = root.querySelector<HTMLButtonElement>('[data-translation-toggle]')
  const TRANSLATION_KEY = 'manasik:translation'

  function translationOn(): boolean {
    return rootEl.dataset.translation !== 'off'
  }

  function paintTranslation() {
    if (!translationButton) return
    const on = translationOn()
    translationButton.setAttribute('aria-pressed', String(on))
    translationButton.title = on ? 'Sembunyikan terjemah' : 'Tampilkan terjemah'
  }

  translationButton?.addEventListener('click', () => {
    const on = !translationOn()
    if (on) delete rootEl.dataset.translation
    else rootEl.dataset.translation = 'off'
    try {
      localStorage.setItem(TRANSLATION_KEY, on ? 'on' : 'off')
    } catch {}
    paintTranslation()
  })

  paintTranslation()

  // Layar tetap menyala selama membaca.
  let wake: WakeLockSentinel | null = null
  let wakeWanted = false

  async function requestWake() {
    if (!('wakeLock' in navigator)) return
    try {
      wake = await navigator.wakeLock.request('screen')
      wake.addEventListener('release', () => {
        wake = null
        if (wakeWanted) paintWake(false)
      })
      paintWake(true)
    } catch {
      paintWake(false)
    }
  }

  function paintWake(on: boolean) {
    if (!wakeButton) return
    wakeButton.setAttribute('aria-pressed', String(on))
  }

  if (wakeButton && 'wakeLock' in navigator) {
    wakeButton.addEventListener('click', async () => {
      wakeWanted = !wakeWanted
      if (wakeWanted) {
        await requestWake()
      } else {
        wake?.release()
        wake = null
        paintWake(false)
      }
    })

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && wakeWanted && !wake) void requestWake()
    })
  } else {
    wakeButton?.remove()
  }

  paint()
}
