import {useEffect, useRef} from 'react'
import {insert, setIfMissing, unset, useClient} from 'sanity'

const PUBLISHED = `*[_type == "project" && !(_id in path("drafts.**"))] | order(_createdAt desc)._id`
const key = () => Math.random().toString(36).slice(2, 12)

// Keeps "Selects order" in sync with the published projects:
// new projects are added at the top, deleted or unpublished ones are removed, and your drag order is kept.
export function SelectsOrderInput(props) {
  const {value = [], onChange, readOnly} = props
  const client = useClient({apiVersion: '2025-10-01'})
  const latest = useRef(value)
  latest.current = value

  useEffect(() => {
    if (readOnly) return
    let live = true
    const sync = async () => {
      const ids = await client.fetch(PUBLISHED).catch(() => null)
      if (!live || !ids) return
      const current = latest.current || []
      const have = new Set(current.map((r) => r._ref))
      const wanted = new Set(ids)
      const missing = ids.filter((id) => !have.has(id))
      const stale = current.filter((r) => !wanted.has(r._ref))
      if (!missing.length && !stale.length) return
      const patches = [setIfMissing([])]
      stale.forEach((r) => patches.push(unset([{_key: r._key}])))
      if (missing.length)
        patches.push(
          insert(
            missing.map((id) => ({_type: 'reference', _ref: id, _weak: true, _key: key()})),
            'before',
            [0],
          ),
        )
      onChange(patches)
    }
    sync()
    const sub = client
      .listen(`*[_type == "project"]`, {}, {visibility: 'query', events: ['mutation']})
      .subscribe(() => setTimeout(sync, 800))
    return () => {
      live = false
      sub.unsubscribe()
    }
  }, [client, onChange, readOnly])

  return props.renderDefault(props)
}
