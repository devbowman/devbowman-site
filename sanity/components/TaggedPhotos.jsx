import {useCallback, useEffect, useMemo, useState} from 'react'
import {Box, Button, Card, Checkbox, Flex, Stack, Text} from '@sanity/ui'
import {useClient, useFormValue} from 'sanity'

const QUERY = `*[_type == "project" && !(_id in path("drafts.**")) && references($tag)] | order(coalesce(orderRank, "") asc){
  _id, title, "imgs": images[$tag in tags[]._ref]{_key, "ref": asset._ref}
}`

// On a tag's page: every published photo with this tag, with bulk "remove tag".
export function TaggedPhotos() {
  const client = useClient({apiVersion: '2025-10-01'})
  const {projectId, dataset} = client.config()
  const tag = String(useFormValue(['_id']) || '').replace(/^drafts\./, '')
  const [groups, setGroups] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(() => {
    if (!tag) return
    client
      .fetch(QUERY, {tag})
      .then((g) => setGroups(g.filter((p) => p.imgs?.length)))
      .catch(() => setGroups([]))
  }, [client, tag])

  useEffect(() => {
    load()
    const sub = client.listen(`*[_type == "project"]`, {}, {visibility: 'query'}).subscribe(() => setTimeout(load, 600))
    return () => sub.unsubscribe()
  }, [client, load])

  const all = useMemo(() => (groups || []).flatMap((p) => p.imgs.map((i) => `${p._id}|${i._key}`)), [groups])
  const thumb = (ref) => {
    const m = /^image-([a-zA-Z0-9]+)-(\d+x\d+)-(\w+)$/.exec(ref || '')
    return m ? `https://cdn.sanity.io/images/${projectId}/${dataset}/${m[1]}-${m[2]}.${m[3]}?w=200&h=250&fit=crop&auto=format` : null
  }
  const toggle = (k) =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })

  const remove = async () => {
    if (!selected.size) return
    setBusy(true)
    setNote('')
    try {
      const byProject = {}
      for (const k of selected) {
        const [id, key] = k.split('|')
        ;(byProject[id] ||= []).push(key)
      }
      const ids = Object.keys(byProject)
      const drafts = new Set(await client.fetch(`*[_id in $ids]._id`, {ids: ids.map((i) => `drafts.${i}`)}))
      const tx = client.transaction()
      for (const id of ids) {
        const paths = byProject[id].map((key) => `images[_key=="${key}"].tags[_ref=="${tag}"]`)
        tx.patch(id, (p) => p.unset(paths))
        if (drafts.has(`drafts.${id}`)) tx.patch(`drafts.${id}`, (p) => p.unset(paths))
      }
      await tx.commit({autoGenerateArrayKeys: true})
      setNote(`Removed this tag from ${selected.size} photo${selected.size === 1 ? '' : 's'}. The site updates within a minute.`)
      setSelected(new Set())
      load()
    } catch (e) {
      setNote(`Couldn't remove the tag: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!tag) return null
  if (!groups) return <Text size={1} muted>Loading photos…</Text>
  if (!groups.length)
    return (
      <Text size={1} muted>
        No published photos use this tag yet, so it's hidden from the filter on the site.
      </Text>
    )

  return (
    <Stack space={4}>
      <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
        <Text size={1} weight="medium">
          {all.length} photo{all.length === 1 ? '' : 's'} · {selected.size} selected
        </Text>
        <Flex gap={2}>
          <Button
            mode="bleed"
            fontSize={1}
            padding={2}
            text={selected.size === all.length ? 'Clear selection' : 'Select all'}
            onClick={() => setSelected(selected.size === all.length ? new Set() : new Set(all))}
          />
          <Button
            fontSize={1}
            tone="critical"
            text={`Remove tag from selected`}
            disabled={busy || !selected.size}
            onClick={remove}
          />
        </Flex>
      </Flex>
      {note && (
        <Text size={1} muted>
          {note}
        </Text>
      )}
      {groups.map((p) => (
        <Stack key={p._id} space={2}>
          <Text size={1} muted>
            {p.title}
          </Text>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8}}>
            {p.imgs.map((i) => {
              const k = `${p._id}|${i._key}`
              const on = selected.has(k)
              const src = thumb(i.ref)
              return (
                <Card key={k} as="label" radius={2} border tone={on ? 'critical' : 'default'} style={{cursor: 'pointer', overflow: 'hidden', position: 'relative'}}>
                  {src ? (
                    <img src={src} alt="" style={{display: 'block', width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', opacity: on ? 0.6 : 1}} />
                  ) : (
                    <Box style={{aspectRatio: '4 / 5'}} />
                  )}
                  <Box style={{position: 'absolute', top: 6, left: 6}}>
                    <Checkbox checked={on} onChange={() => toggle(k)} aria-label="Select photo" />
                  </Box>
                </Card>
              )
            })}
          </div>
        </Stack>
      ))}
    </Stack>
  )
}
