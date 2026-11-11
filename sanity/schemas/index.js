import {defineArrayMember, defineField, defineType} from 'sanity'
import {FeatureInput} from '../components/FeatureInput'
import {PhotoInput} from '../components/PhotoInput'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Shown when someone hovers the project in the Index, e.g. "Rolling Stone" or "Nike".',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      description:
        'Drag to reorder. Thumbnails crop to 4:5. Click an image and set the hotspot to choose what stays in frame.',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Description (for screen readers)', type: 'string'})],
        }),
      ],
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: 'info',
      title: 'Information',
      type: 'text',
      rows: 3,
      description: 'Optional credits or a line of context, shown under the images.',
    }),
    defineField({name: 'year', title: 'Year', type: 'number'}),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'url',
      description: 'Optional: the published story or campaign.',
    }),
  ],
  preview: {
    select: {title: 'title', year: 'year', media: 'images.0'},
    prepare: ({title, year, media}) => ({title, subtitle: year ? String(year) : undefined, media}),
  },
})

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'array',
      description: 'The text on the "Dev Bowman" panel. Each paragraph is its own block.',
      of: [defineArrayMember({type: 'block', styles: [{title: 'Normal', value: 'normal'}], lists: []})],
    }),
    defineField({name: 'email', title: 'Contact email', type: 'string'}),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'link',
          fields: [
            defineField({name: 'label', type: 'string', validation: (r) => r.required()}),
            defineField({name: 'url', type: 'url', validation: (r) => r.required()}),
          ],
        }),
      ],
    }),
    defineField({
      name: 'indexOrder',
      title: 'Index order',
      type: 'array',
      description:
        'Drag projects into the order they appear in the Index. Projects not listed here show after these, newest first.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'project'}]})],
    }),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})

export const ohpCover = defineType({
  name: 'ohpCover',
  title: 'Feature cover',
  type: 'document',
  fields: [
    defineField({
      name: 'feature',
      title: 'Feature',
      type: 'string',
      components: {input: FeatureInput},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'photo',
      title: 'Cover photo',
      type: 'number',
      components: {input: PhotoInput},
      initialValue: 1,
    }),
    defineField({
      name: 'name',
      title: 'Name on the site',
      type: 'string',
      description: 'Optional. Replaces the name shown under the cover, e.g. "Nico Carney".',
    }),
    defineField({
      name: 'image',
      title: 'Upload a different cover',
      type: 'image',
      options: {hotspot: true},
      description: 'Optional. Use an image that isn’t in the Substack post. This wins over the photo picked above.',
    }),
    defineField({
      name: 'hidden',
      title: 'Hide this feature on the site',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {feature: 'feature', name: 'name', hidden: 'hidden', photo: 'photo', media: 'image'},
    prepare: ({feature, name, hidden, photo, media}) => ({
      title: name || (feature || '').replace(/^.*\/p\//, '').replace(/-/g, ' ') || 'New cover',
      subtitle: hidden ? 'Hidden' : media ? 'Custom upload' : `Photo ${photo || 1}`,
      media,
    }),
  },
})

export const schemaTypes = [project, siteSettings, ohpCover]
