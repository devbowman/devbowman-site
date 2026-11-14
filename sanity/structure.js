import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'

export const structure = (S, context) =>
  S.list()
    .title('dev.pictures')
    .items([
      S.listItem()
        .title('Site settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings').title('Site settings')),
      S.divider(),
      orderableDocumentListDeskItem({type: 'project', title: 'Projects', S, context}),
      orderableDocumentListDeskItem({type: 'category', title: 'Tags', S, context}),
      orderableDocumentListDeskItem({type: 'ohpCover', title: 'ONE HOUR PHOTO features', S, context}),
    ])
