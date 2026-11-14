import {useEffect} from 'react'
import {useClient} from 'sanity'
import {syncOhpFeatures} from './ohpSync'

let started = false

// Wraps the Studio: once per visit, brings "ONE HOUR PHOTO features" in line with the latest 20 posts.
export function OhpSyncLayout(props) {
  const client = useClient({apiVersion: '2025-10-01'})
  useEffect(() => {
    if (started) return
    started = true
    syncOhpFeatures(client)
      .then((r) => r && console.info('[dev.pictures] ONE HOUR PHOTO features synced', r))
      .catch((e) => console.warn('[dev.pictures] ONE HOUR PHOTO sync skipped:', e.message))
  }, [client])
  return props.renderDefault(props)
}
