import {defineArrayMember, defineField, defineType} from 'sanity'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
import {FeatureInput} from '../components/FeatureInput'
import {PhotoInput} from '../components/PhotoInput'
import {ImagesWithBulkTags} from '../components/ImagesWithBulkTags'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({type: 'project', newItemPosition: 'before'}),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Shown when someone hovers the project in Selects, e.g. "Rolling Stone" or "Nike".',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      description:
        'Drag several files in at once. Drag to reorder. Click an image to tag it on its own or set the hotspot (what stays in frame when cropped to 4:5).',
      components: {input: ImagesWithBulkTags},
      options: {layout: 'grid'},
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'tags',
              title: 'Tags',
              type: 'array',
              description: 'Used by the filter on Selects.',
              of: [defineArrayMember({type: 'reference', to: [{type: 'category'}]})],
            }),
            defineField({name: 'alt', title: 'Description (for screen readers)', type: 'string'}),
          ],
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
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})

export const ohpCover = defineType({
  name: 'ohpCover',
  title: 'ONE HOUR PHOTO feature',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({type: 'ohpCover', newItemPosition: 'before'}),
    defineField({
      name: 'feature',
      title: 'Feature',
      type: 'string',
      components: {input: FeatureInput},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'pinned',
      title: 'Pin to the front',
      type: 'boolean',
      description:
        'Pinned features always show first on ONE HOUR PHOTO with a pin icon, even once they are older than the latest 20 posts. Up to 5. Drag in the list to order them.',
      initialValue: false,
      validation: (r) =>
        r.custom(async (value, ctx) => {
          if (!value) return true
          const id = String(ctx.document?._id || '').replace(/^drafts\./, '')
          const others = await ctx
            .getClient({apiVersion: '2025-10-01'})
            .fetch('count(*[_type == "ohpCover" && pinned == true && !(_id in path("drafts.**")) && _id != $id])', {id})
          return others >= 5 ? 'You can pin up to 5 features. Unpin one first.' : true
        }),
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
    select: {feature: 'feature', name: 'name', hidden: 'hidden', pinned: 'pinned', photo: 'photo', media: 'image'},
    prepare: ({feature, name, hidden, pinned, photo, media}) => ({
      title: (pinned ? '📌 ' : '') + (name || (feature || '').replace(/^.*\/p\//, '').replace(/-/g, ' ') || 'New feature'),
      subtitle: [hidden ? 'Hidden' : null, media ? 'Custom cover' : photo > 1 ? `Cover: photo ${photo}` : null].filter(Boolean).join(' · ') || undefined,
      media,
    }),
  },
})

export const category = defineType({
  name: 'category',
  title: 'Tag',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Name', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'order',
      title: 'Position in the filter',
      type: 'number',
      description: 'Lower numbers come first.',
    }),
  ],
  orderings: [{title: 'Filter order', name: 'order', by: [{field: 'order', direction: 'asc'}]}],
  preview: {select: {title: 'title', order: 'order'}, prepare: ({title, order}) => ({title, subtitle: order != null ? `Position ${order}` : undefined})},
})

export const schemaTypes = [project, siteSettings, ohpCover, category]
