import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Badge, Box, Button, Card, Checkbox, Flex, Select, Stack, Text, TextInput} from '@sanity/ui'
import {insert, set, setIfMissing, useClient} from 'sanity'

const TAGS = `*[_type == "category" && !(_id in path("drafts.**"))] | order(coalesce(order, 999) asc, title asc){_id, title}`
const key = () => Math.random().toString(36).slice(2, 12)

// Images field with a bulk-tagging panel above the normal image grid.
export function ImagesWithBulkTags(props) {
  const {value = [], onChange, readOnly} = props
  const client = useClient({apiVersion: '2025-10-01'})
  const {projectId, dataset} = client.config()
  const [tags, setTags] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [tag, setTag] = useState('')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [upload, setUpload] = useState(null) // {done, total}
  const [dragOver, setDragOver] = useState(false)
  const fileInput = useRef(null)

  // Upload many photos at once and append them to the project, in the order picked.
  const uploadFiles = async (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith('image/'))
    if (!files.length || readOnly) return
    setNote('')
    setUpload({done: 0, total: files.length})
    let failed = 0
    for (let i = 0; i < files.length; i++) {
      try {
        const asset = await client.assets.upload('image', files[i], {filename: files[i].name})
        onChange([
          setIfMissing([]),
          insert([{_type: 'image', _key: key(), asset: {_type: 'reference', _ref: asset._id}}], 'after', [-1]),
        ])
      } catch (e) {
        failed++
      }
      setUpload({done: i + 1, total: files.length})
    }
    setUpload(null)
    setNote(
      failed
        ? `Uploaded ${files.length - failed} of ${files.length}. ${failed} failed; try those again.`
        : `Uploaded ${files.length} photo${files.length === 1 ? '' : 's'}. Tag them below, then Publish.`,
    )
  }

  const loadTags = useCallback(() => client.fetch(TAGS).then(setTags).catch(() => {}), [client])
  useEffect(() => {
    loadTags()
    const sub = client.listen(TAGS, {}, {visibility: 'query'}).subscribe(() => loadTags())
    return () => sub.unsubscribe()
  }, [client, loadTags])

  // Forget selections for images that were removed.
  useEffect(() => {
    const keys = new Set(value.map((v) => v._key))
    setSelected((s) => new Set([...s].filter((k) => keys.has(k))))
  }, [value])

  const names = useMemo(() => Object.fromEntries(tags.map((t) => [t._id, t.title])), [tags])

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
  const allOn = value.length > 0 && selected.size === value.length

  const apply = (add) => {
    if (!tag || !selected.size) return
    const patches = []
    for (const item of value) {
      if (!selected.has(item._key)) continue
      const cur = item.tags || []
      const has = cur.some((t) => t._ref === tag)
      if (add && !has) patches.push(set([...cur, {_type: 'reference', _ref: tag, _key: key()}], [{_key: item._key}, 'tags']))
      if (!add && has) patches.push(set(cur.filter((t) => t._ref !== tag), [{_key: item._key}, 'tags']))
    }
    if (patches.length) onChange(patches)
    setNote(
      patches.length
        ? `${add ? 'Added' : 'Removed'} "${names[tag]}" ${add ? 'to' : 'from'} ${patches.length} photo${patches.length === 1 ? '' : 's'}. Publish to update the site.`
        : `Nothing to change: ${add ? 'all selected photos already have' : 'none of the selected photos have'} "${names[tag]}".`,
    )
  }

  const create = async () => {
    const title = newName.trim()
    if (!title) return
    const existing = tags.find((t) => t.title.toLowerCase() === title.toLowerCase())
    if (existing) {
      setTag(existing._id)
      setNewName('')
      setNote(`"${existing.title}" already exists, so it's selected.`)
      return
    }
    setBusy(true)
    try {
      const doc = await client.create({_type: 'category', title})
      setTags((t) => [...t, {_id: doc._id, title}])
      setTag(doc._id)
      setNewName('')
      setNote(`Created "${title}". Select photos and click Add to selected.`)
    } catch (e) {
      setNote(`Couldn't create the tag: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack space={4}>
      <Card
        padding={4}
        radius={2}
        border
        tone={dragOver ? 'primary' : 'transparent'}
        style={{borderStyle: 'dashed', textAlign: 'center'}}
        onDragOver={(e) => {
          if ([...e.dataTransfer.types].includes('Files')) {
            e.preventDefault()
            e.stopPropagation()
            setDragOver(true)
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files?.length) return
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          uploadFiles(e.dataTransfer.files)
        }}
      >
        <Stack space={3}>
          <Text size={1} weight="medium">
            {upload ? `Uploading ${Math.min(upload.done + 1, upload.total)} of ${upload.total}…` : 'Drop photos here to upload'}
          </Text>
          {!upload && (
            <Flex justify="center">
              <Button
                fontSize={1}
                mode="ghost"
                text="Choose photos…"
                disabled={readOnly}
                onClick={() => fileInput.current?.click()}
              />
            </Flex>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              uploadFiles(e.currentTarget.files)
              e.currentTarget.value = ''
            }}
          />
        </Stack>
      </Card>
      {value.length > 0 && (
        <Card padding={3} radius={2} border tone="transparent">
          <Stack space={3}>
            <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
              <Text size={1} weight="medium">
                Tag photos · {selected.size} of {value.length} selected
              </Text>
              <Button
                mode="bleed"
                fontSize={1}
                padding={2}
                text={allOn ? 'Clear selection' : 'Select all'}
                onClick={() => setSelected(allOn ? new Set() : new Set(value.map((v) => v._key)))}
              />
            </Flex>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8}}>
              {value.map((item, i) => {
                const on = selected.has(item._key)
                const src = thumb(item.asset?._ref)
                const itemTags = (item.tags || []).map((t) => names[t._ref]).filter(Boolean)
                return (
                  <Card
                    key={item._key}
                    as="label"
                    radius={2}
                    tone={on ? 'primary' : 'default'}
                    border
                    style={{cursor: 'pointer', overflow: 'hidden'}}
                  >
                    <Box style={{position: 'relative'}}>
                      {src ? (
                        <img src={src} alt="" style={{display: 'block', width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', opacity: on ? 1 : 0.85}} />
                      ) : (
                        <Box style={{aspectRatio: '4 / 5'}} />
                      )}
                      <Box style={{position: 'absolute', top: 6, left: 6}}>
                        <Checkbox checked={on} onChange={() => toggle(item._key)} disabled={readOnly} aria-label={`Select photo ${i + 1}`} />
                      </Box>
                    </Box>
                    <Box padding={2}>
                      <Text size={0} muted={!itemTags.length} textOverflow="ellipsis">
                        {itemTags.length ? itemTags.join(', ') : 'No tags'}
                      </Text>
                    </Box>
                  </Card>
                )
              })}
            </div>

            <Flex gap={2} wrap="wrap" align="center">
              <Box flex={1} style={{minWidth: 160}}>
                <Select fontSize={1} value={tag} onChange={(e) => setTag(e.currentTarget.value)} disabled={readOnly}>
                  <option value="">Choose a tag…</option>
                  {tags.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.title}
                    </option>
                  ))}
                </Select>
              </Box>
              <Button fontSize={1} tone="primary" text="Add to selected" disabled={readOnly || !tag || !selected.size} onClick={() => apply(true)} />
              <Button fontSize={1} mode="ghost" text="Remove from selected" disabled={readOnly || !tag || !selected.size} onClick={() => apply(false)} />
            </Flex>

            <Flex gap={2} wrap="wrap" align="center">
              <Box flex={1} style={{minWidth: 160}}>
                <TextInput
                  fontSize={1}
                  placeholder="New tag, e.g. Headshot"
                  value={newName}
                  onChange={(e) => setNewName(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), create())}
                  disabled={readOnly || busy}
                />
              </Box>
              <Button fontSize={1} mode="ghost" text="Create tag" disabled={readOnly || busy || !newName.trim()} onClick={create} />
            </Flex>

            {note && (
              <Text size={1} muted>
                {note}
              </Text>
            )}
            {tags.length > 0 && (
              <Flex gap={1} wrap="wrap">
                {tags.map((t) => (
                  <Badge key={t._id} fontSize={0}>
                    {t.title}
                  </Badge>
                ))}
              </Flex>
            )}
          </Stack>
        </Card>
      )}
      {props.renderDefault(props)}
    </Stack>
  )
}
