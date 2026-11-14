import {useState} from 'react'
import {Box, Button, Card, Flex, Select, Stack, Text, TextInput} from '@sanity/ui'
import {set, unset} from 'sanity'
import {useFeatures, norm} from './useFeatures'

const isPostLink = (u) => /onehour\.photo\/p\/[^/?#]+/i.test(u)

// Dropdown of the latest ONE HOUR PHOTO features, or paste a link to any older post. Stores the post's link.
export function FeatureInput({value, onChange, readOnly}) {
  const {features, error} = useFeatures()
  const [paste, setPaste] = useState('')
  const applyPasted = () => {
    const u = paste.trim()
    if (!isPostLink(u)) return
    onChange(set(u.startsWith('http') ? u : 'https://' + u))
    setPaste('')
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
          readOnly={readOnly}
          onChange={(e) => onChange(e.currentTarget.value ? set(e.currentTarget.value) : unset())}
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
          readOnly={readOnly}
          onChange={(e) => setPaste(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyPasted())}
        />
        </Box>
        <Button fontSize={1} mode="ghost" text="Use link" disabled={readOnly || !isPostLink(paste.trim())} onClick={applyPasted} />
      </Flex>
    </Stack>
  )
}
