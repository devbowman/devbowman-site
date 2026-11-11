import {defineArrayMember, defineField, defineType} from 'sanity'

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

export const schemaTypes = [project, siteSettings]
