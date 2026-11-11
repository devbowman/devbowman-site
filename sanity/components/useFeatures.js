import {useEffect, useState} from 'react'

let cache = null

// Loads the ONE HOUR PHOTO features from the site's /api/ohp route.
export function useFeatures() {
  const [state, setState] = useState(cache ? {features: cache, error: null} : {features: null, error: null})
  useEffect(() => {
    if (cache) return
    let live = true
    fetch('/api/ohp')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        cache = data
        if (live) setState({features: data, error: null})
      })
      .catch((e) => live && setState({features: null, error: e.message}))
    return () => {
      live = false
    }
  }, [])
  return state
}

export const norm = (u = '') =>
  u
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
