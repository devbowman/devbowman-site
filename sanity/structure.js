export const structure = (S) =>
  S.list()
    .title('dev.pictures')
    .items([
      S.listItem()
        .title('Site settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings').title('Site settings')),
      S.divider(),
      S.documentTypeListItem('project').title('Projects'),
    ])
