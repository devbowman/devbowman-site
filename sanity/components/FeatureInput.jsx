import {useState} from 'react'
import {Box, Button, Card, Flex, Select, Stack, Text, TextInput} from '@sanity/ui'
import {useClient, useDocumentOperation, useFormValue} from 'sanity'
import {useFeatures, norm} from './useFeatures'

const isPostLink = (u) => /onehour\.photo\/p\/[^/?#]+/i.test(u)

// Choose one of the latest posts, or paste a link to any older post.
// Either way it fills in the post's title, date and photos, just like the synced entries.
export function FeatureInput({value, readOnly}) {
  const {features, error} = useFeatures()
  const client = useClient({apiVersion: '2025-10-01'})
  const docId = String(useFormValue(['_id']) || '').replace(/^drafts\./, '')
  const {patch} = useDocumentOperation(docId, 'ohpCover')
  const [paste, setPaste] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const choose = async (raw) => {
    const link = raw.startsWith('http') ? raw : 'https://' + raw
    setBusy(true)
    setNote('')
    try {
      const taken = await client.fetch(
        `*[_type == "ohpCover" && !(_id in [$id, "drafts." + $id]) && defined(feature)]{feature, postTitle}`,
        {id: docId},
      )
      const dupe = taken.find((t) => norm(t.feature) === norm(link))
      if (dupe) {
        setNote(`"${dupe.postTitle || 'That post'}" already has its own entry in the list. Open that one instead.`)
        return
      }
      const recent = features?.find((f) => norm(f.link) === norm(link))
      let post = recent
      if (!post) {
        const r = await fetch('/api/ohp?post=' + encodeURIComponent(link))
        if (!r.ok) throw new Error("Couldn't find that post. Check the link and try again.")
        post = await r.json()
      }
      const set = {
        feature: post.link || link,
        postTitle: post.title,
        thumb: post.frames?.[0],
        frames: post.frames || [],
        ...(post.info ? {postInfo: post.info} : {}),
        ...(post.date ? {postDate: post.date} : {}),
      }
      // Older posts only stay in the list while pinned, so pin them straight away.
      if (!recent) set.pinned = true
      patch.execute([{set}])
      setPaste('')
      if (!recent) setNote('Older post added and pinned. Unpin it later and it leaves the list.')
    } catch (e) {
      setNote(e.message)
    } finally {
      setBusy(false)
    }
  }

  const current = features?.find((f) => norm(f.link) === norm(value))
  return (
    <Stack space={3}>
      {error && (
        <Card padding={3} tone="caution" radius={2}>
          <Text size={1}>Couldn't load the latest posts ({error}). You can still paste a post link below.</Text>
        </Card>
      )}
      {!features && !error ? (
        <Text size={1} muted>
          Loading features from onehour.photo…
        </Text>
      ) : (
        <Select
          value={current ? current.link : value || ''}
          disabled={readOnly || busy}
          onChange={(e) => e.currentTarget.value && choose(e.currentTarget.value)}
        >
          <option value="">Choose one of the latest posts…</option>
          {value && !current && <option value={value}>{value.replace(/^.*\/p\//, '').replace(/-/g, ' ')} (older post)</option>}
          {(features || []).map((f) => (
            <option key={f.link} value={f.link}>
              {f.title}
            </option>
          ))}
        </Select>
      )}
      <Flex gap={2} align="center">
        <Box flex={1}>
          <TextInput
            fontSize={1}
            placeholder="Or paste a link to any post, e.g. onehour.photo/p/…"
            value={paste}
            readOnly={readOnly || busy}
            onChange={(e) => setPaste(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && isPostLink(paste.trim()) && (e.preventDefault(), choose(paste.trim()))}
          />
        </Box>
        <Button
          fontSize={1}
          mode="ghost"
          text={busy ? 'Loading…' : 'Use link'}
          disabled={readOnly || busy || !isPostLink(paste.trim())}
          onClick={() => choose(paste.trim())}
        />
      </Flex>
      {note && (
        <Text size={1} muted>
          {note}
        </Text>
      )}
    </Stack>
  )
}
