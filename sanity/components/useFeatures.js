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

// One post's details: from the feed when it's recent, otherwise fetched by its link (cached per link).
const postCache = new Map()
export function useFeature(link) {
  const {features, error} = useFeatures()
  const inFeed = features?.find((f) => norm(f.link) === norm(link))
  const key = norm(link || '')
  const [, rerender] = useState(0)
  useEffect(() => {
    if (!link || !features || inFeed || postCache.has(key)) return
    const entry = {data: null, error: null, done: false}
    postCache.set(key, entry)
    fetch('/api/ohp?post=' + encodeURIComponent(link))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('That post could not be found.'))))
      .then((data) => (entry.data = data))
      .catch((e) => {
        entry.error = e.message
        postCache.delete(key) // allow a retry next time
        postCache.set(key + '#failed', entry)
      })
      .finally(() => {
        entry.done = true
        rerender((n) => n + 1)
      })
  }, [link, key, features, inFeed])
  if (!link) return {loading: false}
  if (!features) return {loading: !error, error}
  if (inFeed) return {feature: inFeed}
  const entry = postCache.get(key) || postCache.get(key + '#failed')
  if (!entry || !entry.done) return {loading: true}
  return {feature: entry.data, error: entry.error}
}
