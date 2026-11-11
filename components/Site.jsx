'use client'

import {useCallback, useEffect, useRef, useState} from 'react'

const ORDER = ['about', 'index', 'ohp']
const LABELS = {about: 'Dev Bowman', index: 'Index', ohp: 'ONE HOUR PHOTO'}

// Shown until a bio is written in the Studio (Site settings).
const FALLBACK_BIO = [
  'Dev Bowman is a photographer, writer, and editor based in Brooklyn, New York.',
  'His work has appeared in Vogue, Rolling Stone, Vanity Fair, The Cut, Interview, PAPER, Nylon, InStyle, Forbes, and Deadline. In December 2025 he started ONE HOUR PHOTO, a weekly film portrait and interview series on comedy, drag, and culture.',
]
const FALLBACK_LINKS = [
  {label: '@oonehourphotoo', url: 'https://www.instagram.com/oonehourphotoo/'},
  {label: 'onehour.photo', url: 'https://www.onehour.photo'},
]

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
    const gaps = pi === 0 ? offset : 1 + (hash(p.title) % 3)
    for (let k = 0; k < gaps; k++) cells.push(<div className="cell" aria-hidden="true" key={`${p.key}-gap${k}`} />)
    p.frames.forEach((f, j) =>
      cells.push(
        <div className="cell" key={`${p.key}-${j}`}>
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

export default function Site({site, ohp}) {
  const [panel, setPanel] = useState('index')
  const [hover, setHover] = useState('')
  const [view, setView] = useState(null) // {list: 'index'|'ohp', p, i}
  const [copied, setCopied] = useState('')
  const pill = useRef(null)
  const [knob, setKnob] = useState({x: 0, w: 0})
  const lists = {index: site.projects, ohp}

  const go = useCallback((name, push) => {
    if (!ORDER.includes(name)) name = 'index'
    setView(null)
    setHover('')
    setPanel(name)
    if (push && location.hash !== '#' + name) history.replaceState(null, '', '#' + name)
  }, [])

  useEffect(() => {
    go(location.hash.slice(1) || 'index')
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
    [site.projects, ohp],
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

  const current = view ? lists[view.list][view.p] : null
  const next = current ? current.frames[(view.i + 1) % current.frames.length] : null
  const email = site.email
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
      <header className={`top${panel === 'about' ? ' on-about' : ''}`}>
        <nav className="pill" aria-label="Sections" ref={pill}>
          <span className="knob" style={{width: knob.w, transform: `translateX(${knob.x - 2}px)`}} />
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
            <span>{hover}</span>
          )}
        </div>
      </header>

      <main className="strip" style={{transform: `translateX(${-ORDER.indexOf(panel) * 33.3334}%)`}}>
        <section className="panel about-panel" aria-label="About">
          <div className="about">
            <div className="stack">
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

        <section className={`panel${view?.list === 'index' ? ' locked' : ''}`} aria-label="Index">
          <div className="wrap">
            {site.projects.length ? (
              <Grid projects={site.projects} offset={3} onHover={setHover} onOpen={open('index')} />
            ) : (
              <p className="empty">No projects yet. Add one at dev.pictures/studio.</p>
            )}
          </div>
          {view?.list === 'index' && <Viewer current={current} view={view} next={next} step={step} />}
        </section>

        <section className={`panel${view?.list === 'ohp' ? ' locked' : ''}`} aria-label="ONE HOUR PHOTO">
          <div className="wrap">
            {ohp.length ? (
              <Grid projects={ohp} offset={0} onHover={setHover} onOpen={open('ohp')} />
            ) : (
              <p className="empty">
                Read ONE HOUR PHOTO at <a href="https://www.onehour.photo">onehour.photo</a>.
              </p>
            )}
          </div>
          {view?.list === 'ohp' && <Viewer current={current} view={view} next={next} step={step} />}
        </section>
      </main>
    </div>
  )
}

function Viewer({current, view, next, step}) {
  const f = current.frames[view.i]
  const many = current.frames.length > 1
  return (
    <div className="viewer">
      <button className="frame big" onClick={() => step(1)} aria-label="Next image">
        <img src={f.full} alt={f.alt} />
      </button>
      {many && (
        <button className="frame small" onClick={() => step(1)} aria-label="Next image">
          <img src={next.full} alt={next.alt} />
        </button>
      )}
      {current.info && <p className="info">{current.info}</p>}
    </div>
  )
}
