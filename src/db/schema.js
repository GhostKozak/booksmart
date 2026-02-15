import Dexie from 'dexie';

export const db = new Dexie('BookSmartDB');

db.version(2).stores({
    bookmarks: '++id, url, title, originalFolder, newFolder, *tags, *ruleTags, addDate', // Indexes
    folders: 'id, name, order',
    tags: 'id, name, order',
    rules: 'id, type, value, targetFolder, *tags',
    ignoredUrls: 'url' // Primary key is url
});
