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

// One post's details: from the feed when it's recent, otherwise fetched by its link.
export function useFeature(link) {
  const {features, error} = useFeatures()
  const inFeed = features?.find((f) => norm(f.link) === norm(link))
  const [older, setOlder] = useState({link: null, data: null, error: null})
  useEffect(() => {
    if (!link || !features || inFeed || older.link === link) return
    let live = true
    setOlder({link, data: null, error: null})
    fetch('/api/ohp?post=' + encodeURIComponent(link))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('That post could not be found'))))
      .then((data) => live && setOlder({link, data, error: null}))
      .catch((e) => live && setOlder({link, data: null, error: e.message}))
    return () => {
      live = false
    }
  }, [link, features, inFeed, older.link])
  if (!link) return {loading: false}
  if (!features) return {loading: !error, error}
  if (inFeed) return {feature: inFeed}
  if (older.link !== link || (!older.data && !older.error)) return {loading: true}
  return {feature: older.data, error: older.error}
}
