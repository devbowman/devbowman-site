import {Card, Select, Stack, Text} from '@sanity/ui'
import {set, unset} from 'sanity'
import {useFeatures, norm} from './useFeatures'

// Dropdown of the latest ONE HOUR PHOTO features; stores the post's link.
export function FeatureInput({value, onChange, readOnly}) {
  const {features, error} = useFeatures()
  if (error)
    return (
      <Card padding={3} tone="caution" radius={2}>
        <Text size={1}>Couldn't load the feed ({error}). Paste the post link into the field later, or try reloading.</Text>
      </Card>
    )
  if (!features) return <Text size={1} muted>Loading features from onehour.photo…</Text>
  const current = features.find((f) => norm(f.link) === norm(value))
  return (
    <Stack space={2}>
      <Select
        value={current ? current.link : value || ''}
        readOnly={readOnly}
        onChange={(e) => onChange(e.currentTarget.value ? set(e.currentTarget.value) : unset())}
      >
        <option value="">Choose a feature…</option>
        {value && !current && <option value={value}>{value} (no longer in the latest 20)</option>}
        {features.map((f) => (
          <option key={f.link} value={f.link}>
            {f.title}
          </option>
        ))}
      </Select>
    </Stack>
  )
}
