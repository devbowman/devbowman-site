import {Card, Grid, Stack, Text} from '@sanity/ui'
import {set, useFormValue} from 'sanity'
import {useFeatures, norm} from './useFeatures'

// Shows the chosen feature's portraits; click one to make it the cover. Stores its position (1 = first).
export function PhotoInput({value, onChange, readOnly}) {
  const link = useFormValue(['feature'])
  const {features} = useFeatures()
  const feature = features?.find((f) => norm(f.link) === norm(link))
  if (!link) return <Text size={1} muted>Choose a feature above first.</Text>
  if (!features) return <Text size={1} muted>Loading photos…</Text>
  if (!feature) return <Text size={1} muted>This feature isn't in the latest 20 posts, so its photos can't be shown.</Text>
  const chosen = value || 1
  return (
    <Stack space={3}>
      <Text size={1} muted>
        Click the photo to use as the cover. Selected: photo {chosen} of {feature.frames.length}.
      </Text>
      <Grid columns={[3, 4, 5]} gap={2}>
        {feature.frames.map((src, i) => {
          const on = chosen === i + 1
          return (
            <Card
              key={src}
              as="button"
              type="button"
              disabled={readOnly}
              onClick={() => onChange(set(i + 1))}
              radius={2}
              style={{
                padding: 0,
                border: 0,
                cursor: 'pointer',
                overflow: 'hidden',
                outline: on ? '3px solid var(--card-focus-ring-color, #2276fc)' : 'none',
                outlineOffset: 2,
                opacity: on ? 1 : 0.75,
              }}
            >
              <img src={src} alt={`Photo ${i + 1}`} style={{display: 'block', width: '100%', aspectRatio: '4 / 5', objectFit: 'cover'}} />
            </Card>
          )
        })}
      </Grid>
    </Stack>
  )
}
