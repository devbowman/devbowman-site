'use client'

import {useCallback, useEffect, useRef, useState} from 'react'

const ORDER = ['about', 'selects', 'ohp']
const LABELS = {about: 'Dev Bowman', selects: 'Selects', ohp: 'ONE HOUR PHOTO'}
const ALIASES = {index: 'selects'} // old links keep working

// Shown until a bio is written in the Studio (Site settings).
const FALLBACK_BIO = [
  'Dev Bowman is a photographer, writer, and editor based in Brooklyn, New York.',
  'His work has been published in Interview, Nylon, PAPER, Rolling Stone, The Cut, Vanity Fair, InStyle, Forbes and more.',
]
const FALLBACK_EMAIL = 'dev@onehour.photo'
const FALLBACK_LINKS = [{label: '@dev.baby', url: 'https://www.instagram.com/dev.baby/'}]

function hash(s) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

function Bio({blocks}) {
  if (!blocks?.length) return FALLBACK_BIO.map((p, i) => <p key={i}>{p}</p>)
  return blocks
    .filter((b) => b._type === 'block')
    .map((b) => (
      <p key={b._key}>
        {b.children?.map((c) => {
          const link = b.markDefs?.find((d) => c.marks?.includes(d._key) && d._type === 'link')
          return link ? (
            <a key={c._key} href={link.href}>
              {c.text}
            </a>
          ) : (
            <span key={c._key}>{c.text}</span>
          )
        })}
      </p>
    ))
}

function Thumb({frame}) {
  const [ready, setReady] = useState(false)
  return (
    <img
      src={frame.thumb}
      alt={frame.alt}
      loading="lazy"
      decoding="async"
      className={ready ? 'ready' : ''}
      onLoad={() => setReady(true)}
      ref={(el) => el?.complete && !ready && setReady(true)}
    />
  )
}

function Grid({projects, offset, onHover, onOpen}) {
  const cells = []
  projects.forEach((p, pi) => {
    p.frames.forEach((f, j) =>
      cells.push(
        <div className="cell" key={`${p.key}-${j}`} style={{'--ratio': f.ratio || 0.8}}>
          <button
            className="tile"
            aria-label={`${p.title}, image ${j + 1} of ${p.frames.length}`}
            onMouseEnter={() => onHover(p.short)}
            onFocus={() => onHover(p.short)}
            onMouseLeave={() => onHover('')}
            onClick={() => onOpen(pi, j)}
          >
            <Thumb frame={f} />
          </button>
        </div>,
      ),
    )
  })
  return <div className="grid">{cells}</div>
}

// Pushpin, like Instagram's pinned posts.
function PinIcon() {
  return (
    <svg className="pin" viewBox="0 0 24 24" aria-label="Pinned" role="img">
      <path d="M15.6 2.6a1 1 0 0 1 1.4 0l4.4 4.4a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.1.2l-3.3 3.3.4 3.3a1 1 0 0 1-.3.8l-1.3 1.3a1 1 0 0 1-1.4 0l-3.2-3.2-5.3 5.3H3.3v-1.4l5.3-5.3-3.2-3.2a1 1 0 0 1 0-1.4l1.3-1.3a1 1 0 0 1 .8-.3l3.3.4 3.3-3.3a1 1 0 0 1 .2-1.1z" />
    </svg>
  )
}

// ONE HOUR PHOTO: one large portrait per feature. Hover shows the feature title; click opens it on Substack.
function Covers({projects, onHover}) {
  return (
    <div className="covers">
      {projects.map((p) => (
        <a
          key={p.key}
          className="cover"
          href={p.link}
          target="_blank"
          rel="noopener"
          onMouseEnter={() => onHover(p.title)}
          onFocus={() => onHover(p.title)}
          onMouseLeave={() => onHover('')}
          onBlur={() => onHover('')}
        >
          <span className="tile">
            <Thumb frame={p.frames[0]} />
            {p.pinned && <PinIcon />}
          </span>
          <span className="cover-label">
            <span className="cover-name">{p.short}</span>
            <span className="cover-title">{p.title} ↗</span>
          </span>
        </a>
      ))}
    </div>
  )
}

export default function Site({site, ohp}) {
  const [panel, setPanel] = useState('selects')
  const [hover, setHover] = useState('')
  const [view, setView] = useState(null) // {list: 'selects'|'ohp', p, i}
  const [copied, setCopied] = useState('')
  const pill = useRef(null)
  const [knob, setKnob] = useState({x: 0, w: 0})
  const [filter, setFilter] = useState('all')
  // Filtering keeps only the photos with that tag (projects with none drop out).
  const selects =
    filter === 'all'
      ? site.projects
      : site.projects
          .map((p) => ({...p, frames: p.frames.filter((f) => f.tags.includes(filter))}))
          .filter((p) => p.frames.length)
  const lists = {selects, ohp}

  const go = useCallback((name, push) => {
    name = ALIASES[name] || name
    if (!ORDER.includes(name)) name = 'selects'
    setView(null)
    setHover('')
    setPanel(name)
    if (push && location.hash !== '#' + name) history.replaceState(null, '', '#' + name)
  }, [])

  useEffect(() => {
    go(location.hash.slice(1) || 'selects')
    const onHash = () => go(location.hash.slice(1))
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [go])

  // Position the sliding knob under the active tab.
  useEffect(() => {
    const place = () => {
      const b = pill.current?.querySelector(`[data-go="${panel}"]`)
      if (b) setKnob({x: b.offsetLeft, w: b.offsetWidth})
    }
    place()
    document.fonts?.ready.then(place)
    addEventListener('resize', place)
    return () => removeEventListener('resize', place)
  }, [panel])

  const step = useCallback(
    (d) =>
      setView((v) => {
        if (!v) return v
        const list = lists[v.list]
        const n = list[v.p].frames.length
        let {p, i} = v
        i += d
        if (i >= n) {
          p = (p + 1) % list.length
          i = 0
        } else if (i < 0) {
          p = (p - 1 + list.length) % list.length
          i = list[p].frames.length - 1
        }
        return {...v, p, i}
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selects, ohp],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setView(null)
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [step])

  const open = (list) => (p, i) => {
    setHover('')
    setView({list, p, i})
  }

  // Swipe between panels on touch screens: the strip follows the finger, then snaps.
  const strip = useRef(null)
  const drag = useRef(null)
  const offset = (i, px = 0) => `translateX(calc(${-i * 33.3334}% + ${px}px))`
  const onTouchStart = (e) => {
    if (view || e.touches.length !== 1) return
    const t = e.touches[0]
    drag.current = {x: t.clientX, y: t.clientY, t: Date.now(), dx: 0, axis: null}
  }
  const onTouchMove = (e) => {
    const d = drag.current
    if (!d) return
    const t = e.touches[0]
    const dx = t.clientX - d.x
    const dy = t.clientY - d.y
    if (!d.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) d.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y'
    if (d.axis !== 'x') return
    const i = ORDER.indexOf(panel)
    const atEdge = (i === 0 && dx > 0) || (i === ORDER.length - 1 && dx < 0)
    d.dx = atEdge ? dx * 0.3 : dx
    strip.current.style.transition = 'none'
    strip.current.style.transform = offset(i, d.dx)
  }
  const onTouchEnd = () => {
    const d = drag.current
    drag.current = null
    if (!d || d.axis !== 'x') return
    const i = ORDER.indexOf(panel)
    const speed = Math.abs(d.dx) / Math.max(1, Date.now() - d.t)
    const far = Math.abs(d.dx) > window.innerWidth * 0.18 || (Math.abs(d.dx) > 30 && speed > 0.4)
    let j = i
    if (far) j = Math.min(ORDER.length - 1, Math.max(0, i + (d.dx < 0 ? 1 : -1)))
    strip.current.style.transition = ''
    strip.current.style.transform = offset(j)
    if (j !== i) go(ORDER[j], true)
  }

  const current = view ? lists[view.list][view.p] : null
  const next = current ? current.frames[(view.i + 1) % current.frames.length] : null
  const email = site.email || FALLBACK_EMAIL
  const links = site.links?.length ? site.links : FALLBACK_LINKS

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied('Copied')
    } catch {
      setCopied('Copy failed')
    }
    setTimeout(() => setCopied(''), 1600)
  }

  return (
    <div className="site">
      <header className={`top${panel === 'ohp' ? ' on-ohp' : ''}`}>
        <nav className="pill" aria-label="Sections" ref={pill}>
          <span className="knob" style={{width: knob.w, transform: `translateX(${knob.x}px)`}} />
          {ORDER.map((k) => (
            <button key={k} data-go={k} aria-current={panel === k ? 'page' : undefined} onClick={() => go(k, true)}>
              {LABELS[k]}
            </button>
          ))}
        </nav>
        <div className="caption" aria-live="polite">
          {current ? (
            <>
              <span>{current.short}</span>
              <span>
                {view.i + 1}/{current.frames.length}
              </span>
              {current.link && (
                <a href={current.link} target="_blank" rel="noopener">
                  {view.list === 'ohp' ? 'Read on Substack ↗' : 'View ↗'}
                </a>
              )}
              <button onClick={() => setView(null)}>Close</button>
            </>
          ) : (
            <span>{panel === 'ohp' ? '' : hover}</span>
          )}
        </div>
      </header>

      <main
        className="strip"
        ref={strip}
        style={{transform: offset(ORDER.indexOf(panel))}}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <section className="panel" aria-label="About">
          <div className="about">
            <div className="stack">
              {site.portrait && (
                <img
                  className="portrait"
                  src={site.portrait.src}
                  alt={site.portrait.alt}
                  width={site.portrait.w}
                  height={site.portrait.h}
                />
              )}
              <Bio blocks={site.bio} />
              {email && (
                <>
                  <p className="m">Contact</p>
                  <div className="copyrow">
                    <a href={`mailto:${email}`}>{email}</a>
                    <button onClick={copy}>{copied || 'Copy'}</button>
                  </div>
                </>
              )}
              <p>
                {links.map((l, i) => (
                  <span key={l.url}>
                    {i > 0 && <br />}
                    <a href={l.url} target="_blank" rel="noopener">
                      {l.label}
                    </a>
                  </span>
                ))}
              </p>
            </div>
            <p className="m">© {new Date().getFullYear()} Dev Bowman. All rights reserved.</p>
          </div>
        </section>

        <section className={`panel${view?.list === 'selects' ? ' locked' : ''}`} aria-label="Selects">
          <div className="wrap">
            {site.categories.length > 0 && (
              <nav className="filters" aria-label="Filter by tag">
                {[{id: 'all', title: 'All'}, ...site.categories].map((c) => (
                  <button
                    key={c.id}
                    aria-pressed={filter === c.id}
                    onClick={() => {
                      setView(null)
                      setFilter(c.id)
                    }}
                  >
                    {c.title}
                  </button>
                ))}
              </nav>
            )}
            {site.projects.length ? (
              <Grid key={filter} projects={selects} offset={filter === 'all' ? 3 : 0} onHover={setHover} onOpen={open('selects')} />
            ) : (
              <p className="empty">No projects yet. Add one at dev.pictures/studio.</p>
            )}
          </div>
        </section>

        <section className="panel ohp-panel" aria-label="ONE HOUR PHOTO">
          <div className="wrap">
            {ohp.length ? (
              <>
                <a className="ohp-intro" href="https://www.onehour.photo" target="_blank" rel="noopener">
                  <strong>ONE HOUR PHOTO</strong>
                  <span>My weekly Substack featuring portraits and interviews, all shot on film. ↗</span>
                </a>
                <Covers projects={ohp} onHover={setHover} />
              </>
            ) : (
              <p className="empty">
                Read ONE HOUR PHOTO at <a href="https://www.onehour.photo">onehour.photo</a>.
              </p>
            )}
          </div>
        </section>
      </main>
      {current && <Viewer current={current} view={view} next={next} step={step} close={() => setView(null)} />}
    </div>
  )
}

function Viewer({current, view, next, step, close}) {
  const f = current.frames[view.i]
  const [side, setSide] = useState('next')
  const touch = useRef(null)
  const img = useRef(null)
  // Above or below the photo closes; otherwise the left half goes back, the right half goes forward.
  const sideOf = (x, y) => {
    const r = img.current?.getBoundingClientRect()
    if (r && (y < r.top || y > r.bottom)) return 'close'
    return x < window.innerWidth / 2 ? 'prev' : 'next'
  }
  const onClick = (e) => {
    const side = sideOf(e.clientX, e.clientY)
    if (side === 'close') close()
    else step(side === 'prev' ? -1 : 1)
  }
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touch.current = {x: t.clientX, y: t.clientY}
  }
  const onTouchEnd = (e) => {
    const s = touch.current
    touch.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(t.clientY - s.y)) {
      e.preventDefault() // a swipe, not a tap
      step(dx < 0 ? 1 : -1)
    }
  }
  return (
    <div
      className={`viewer go-${side}`}
      onClick={onClick}
      onMouseMove={(e) => setSide(sideOf(e.clientX, e.clientY))}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-label={`${current.title}, image ${view.i + 1} of ${current.frames.length}`}
    >
      <div className="frame big">
        <img ref={img} src={f.full} alt={f.alt} />
      </div>
      {next && next !== f && <link rel="preload" as="image" href={next.full} />}
      {current.info && <p className="info">{current.info}</p>}
      <button className="sr-only" onClick={(e) => (e.stopPropagation(), step(-1))}>
        Previous image
      </button>
      <button className="sr-only" onClick={(e) => (e.stopPropagation(), step(1))}>
        Next image
      </button>
    </div>
  )
}
