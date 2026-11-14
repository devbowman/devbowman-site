import {createElement} from 'react'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
import {FeatureInput} from '../components/FeatureInput'
import {PhotoInput} from '../components/PhotoInput'
import {ImagesWithBulkTags} from '../components/ImagesWithBulkTags'
import {TaggedPhotos} from '../components/TaggedPhotos'

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
      name: 'portrait',
      title: 'Portrait',
      type: 'image',
      description: 'Shown at the top of the "Dev Bowman" panel.',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Description (for screen readers)', type: 'string'})],
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'array',
      description: 'The text on the "Dev Bowman" panel. Each paragraph is its own block.',
      of: [defineArrayMember({type: 'block', styles: [{title: 'Normal', value: 'normal'}], lists: []})],
    }),
    defineField({name: 'email', title: 'Contact email', type: 'string'}),
    defineField({
      name: 'ohpIntro',
      title: 'ONE HOUR PHOTO intro',
      type: 'text',
      rows: 2,
      description: 'The line at the top of the ONE HOUR PHOTO tab. It links to your Substack.',
    }),
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
    defineField({name: 'postTitle', title: 'Post', type: 'string', readOnly: true, hidden: ({value}) => !value}),
    defineField({
      name: 'feature',
      title: 'Feature',
      type: 'string',
      description: 'Filled in automatically for your latest 20 posts. Paste a link to pin an older one.',
      components: {input: FeatureInput},
      hidden: ({document}) => !!document?.postTitle,
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'name',
      title: 'Name on the site',
      type: 'string',
      description: 'Optional. Replaces the name shown under the cover, e.g. "Sarah Squirm".',
    }),
    defineField({
      name: 'pinned',
      title: 'Pin to the front',
      type: 'boolean',
      description:
        'Pinned features always show first with a pin icon and stay even after they leave your latest 20 posts. Up to 5. Drag in the list to order them.',
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
      description: 'Click any photo from the post to make it the cover.',
      components: {input: PhotoInput},
      initialValue: 1,
    }),
    defineField({
      name: 'coverUrl',
      title: 'Cover image link',
      type: 'url',
      description:
        'Optional. Paste an image address (for example, right-click a photo on Substack → Copy Image Address). This wins over the photo picked above.',
    }),
    defineField({
      name: 'image',
      title: 'Upload a different cover',
      type: 'image',
      options: {hotspot: true},
      description: 'Optional. Upload an image that isn’t in the post. This wins over everything above.',
    }),
    defineField({
      name: 'hidden',
      title: 'Hide this feature on the site',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({name: 'postDate', type: 'datetime', hidden: true, readOnly: true}),
    defineField({name: 'thumb', type: 'url', hidden: true, readOnly: true}),
    defineField({name: 'postInfo', type: 'string', hidden: true, readOnly: true}),
    defineField({name: 'frames', type: 'array', of: [{type: 'string'}], hidden: true, readOnly: true}),
  ],
  preview: {
    select: {
      feature: 'feature',
      postTitle: 'postTitle',
      name: 'name',
      hidden: 'hidden',
      pinned: 'pinned',
      thumb: 'thumb',
      frames: 'frames',
      photo: 'photo',
      coverUrl: 'coverUrl',
      image: 'image',
    },
    prepare: ({feature, postTitle, name, hidden, pinned, thumb, frames, photo, coverUrl, image}) => {
      const src = coverUrl || (frames && frames[(photo || 1) - 1]) || thumb
      return {
        title: (pinned ? '📌 ' : '') + (name || postTitle || (feature || '').replace(/^.*\/p\//, '').replace(/-/g, ' ') || 'New feature'),
        subtitle: [hidden ? 'Hidden' : null, name && postTitle ? postTitle : null].filter(Boolean).join(' · ') || undefined,
        media:
          image ||
          (src
            ? createElement('img', {src, alt: '', style: {width: '100%', height: '100%', objectFit: 'cover'}})
            : undefined),
      }
    },
  },
})

export const category = defineType({
  name: 'category',
  title: 'Tag',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({type: 'category', newItemPosition: 'after'}),
    defineField({name: 'title', title: 'Name', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'photos',
      title: 'Photos with this tag',
      type: 'string',
      description: 'Select photos to take this tag off them. Changes go live right away.',
      readOnly: true,
      components: {input: TaggedPhotos},
    }),
  ],
  preview: {select: {title: 'title'}},
})

export const schemaTypes = [project, siteSettings, ohpCover, category]
