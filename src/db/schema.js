import Dexie from 'dexie';

export const db = new Dexie('BookSmartDB');

db.version(1).stores({
    bookmarks: '++id, url, title, originalFolder, newFolder, *tags, addDate', // Indexes
    folders: 'id, name, order',
    tags: 'id, name, order',
    rules: 'id, type, value, targetFolder, *tags',
    ignoredUrls: 'url' // Primary key is url
});
