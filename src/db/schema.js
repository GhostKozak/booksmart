import Dexie from 'dexie';

export const db = new Dexie('BookSmartDB');

// Note: `note` field is added to bookmarks, folders, and tags as a non-indexed property.
// Dexie only requires indexed properties in the store definition.
db.version(2).stores({
    bookmarks: '++id, url, title, originalFolder, newFolder, *tags, *ruleTags, addDate',
    folders: 'id, name, order',
    tags: 'id, name, order',
    rules: 'id, type, value, targetFolder, *tags',
    ignoredUrls: 'url'
});

db.version(3).stores({
    bookmarks: '++id, url, title, originalFolder, newFolder, *tags, *ruleTags, addDate',
    folders: 'id, name, order',
    tags: 'id, name, order',
    rules: 'id, type, value, targetFolder, *tags',
    ignoredUrls: 'url'
});

db.version(4).stores({
    bookmarks: '++id, url, title, originalFolder, newFolder, *tags, *ruleTags, addDate, *collections',
    folders: 'id, name, order',
    tags: 'id, name, order',
    rules: 'id, type, value, targetFolder, *tags',
    ignoredUrls: 'url',
    collections: 'id, name, order'
});
