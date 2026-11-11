'use client'

import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {projectId, dataset, apiVersion} from './sanity/env'
import {schemaTypes} from './sanity/schemas'
import {structure} from './sanity/structure'

export default defineConfig({
  name: 'default',
  title: 'dev.pictures',
  basePath: '/studio',
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    // Site settings is a single document: hide it from "create new"
    templates: (templates) => templates.filter((t) => t.schemaType !== 'siteSettings'),
  },
  document: {
    actions: (actions, {schemaType}) =>
      schemaType === 'siteSettings'
        ? actions.filter(({action}) => !['unpublish', 'delete', 'duplicate'].includes(action))
        : actions,
  },
  plugins: [structureTool({structure}), visionTool({defaultApiVersion: apiVersion})],
})
