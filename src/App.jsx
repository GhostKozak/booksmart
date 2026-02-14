import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Sun, Moon, Upload, Download, Plus, Trash2, Folder, File, ArrowRight, Settings, Check, AlertCircle, Layers, XCircle, Activity, Loader2, CheckCircle2, HelpCircle, BarChart3, List, Undo2, Redo2, Search, Tag, LogOut, Archive, ShieldAlert, FileQuestion, History as HistoryIcon, Save, Pencil, X, LayoutGrid, Image, Filter } from 'lucide-react'
import { useTheme } from './hooks/use-theme'
import { useUndoRedo } from './hooks/use-undo-redo'
import { FloatingActionBar } from './components/FloatingActionBar'
import { BookmarkList } from './components/BookmarkList'
import { BookmarkGrid } from './components/BookmarkGrid'
import { PreviewPane } from './components/PreviewPane'
import { Button } from './components/ui/button'
import { Checkbox } from './components/ui/checkbox'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import { parseBookmarks, parseJson, parseCsv, parseMarkdown } from './lib/parser'
import { exportBookmarks, exportToJson, exportToCsv, exportToMarkdown } from './lib/exporter'
import { Favicon } from './components/Favicon'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import { cn, generateUUID } from './lib/utils'
import { SimpleModal } from './components/ui/SimpleModal'
import { TaxonomyManager } from './components/TaxonomyManager'
import { SimpleCombobox } from './components/ui/SimpleCombobox'
import { AdvancedSearch } from './components/AdvancedSearch'
import Fuse from 'fuse.js'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, migrateFromLocalStorage, seedDefaults, deduplicateTaxonomy } from './db'

const EMPTY_ARRAY = [];

function App() {
  const { theme, setTheme } = useTheme()
  const { addCommand, undo, redo, canUndo, canRedo } = useUndoRedo();

  // Initialization & Migration
  useEffect(() => {
    const init = async () => {
      await migrateFromLocalStorage();
      await deduplicateTaxonomy();
      await seedDefaults();
    };
    init();
  }, []);

  // Data from IndexedDB
  const rawBookmarks = useLiveQuery(() => db.bookmarks.toArray()) || EMPTY_ARRAY;
  const rules = useLiveQuery(() => db.rules.toArray()) || EMPTY_ARRAY;
  const availableFolders = useLiveQuery(() => db.folders.orderBy('order').toArray()) || EMPTY_ARRAY;
  const availableTags = useLiveQuery(() => db.tags.orderBy('order').toArray()) || EMPTY_ARRAY;

  // Ignored URLs
  const ignoredUrlsList = useLiveQuery(() => db.ignoredUrls.toArray()) || EMPTY_ARRAY;
  const ignoredUrls = useMemo(() => new Set(ignoredUrlsList.map(i => i.url)), [ignoredUrlsList]);

  // Selection State
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Persistent File State
  // We determine if we have data based on bookmarks length, but keeping this state 
  // to track if we just loaded a file might be useful, or we can derive it.
  // For now, let's treat "hasFileLoaded" as "hasBookmarks" or keep it simplified.
  const hasFileLoaded = rawBookmarks.length > 0;

  const [activeFolder, setActiveFolder] = useState(null)


  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('folders') // 'folders' | 'tags'

  const openSettings = (tab = 'folders') => {
    setSettingsTab(tab)
    setIsSettingsOpen(true)
  }

  // Taxonomy Helpers
  const setAvailableFolders = async (newFolders) => {
    // Sync logic: Identify deletions and updates/adds
    // For simplicity with drag and drop reordering, we can clear and add if we suspect full reorder
    // But better to just update.
    // NOTE: This basic strategy assumes 'newFolders' is the desired state.

    await db.transaction('rw', db.folders, async () => {
      const existingIds = new Set((await db.folders.toArray()).map(f => f.id));
      const newIds = new Set(newFolders.map(f => f.id));

      // Deletions
      const toDelete = [...existingIds].filter(id => !newIds.has(id));
      if (toDelete.length > 0) await db.folders.bulkDelete(toDelete);

      // Upserts (Updates + Inserts)
      await db.folders.bulkPut(newFolders);
    });
  }

  const setAvailableTags = async (newTags) => {
    await db.transaction('rw', db.tags, async () => {
      const existingIds = new Set((await db.tags.toArray()).map(f => f.id));
      const newIds = new Set(newTags.map(f => f.id));

      const toDelete = [...existingIds].filter(id => !newIds.has(id));
      if (toDelete.length > 0) await db.tags.bulkDelete(toDelete);

      await db.tags.bulkPut(newTags);
    });
  }


  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'analytics' | 'grid'
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [previewBookmark, setPreviewBookmark] = useState(null)

  // Link Health State
  const [linkHealth, setLinkHealth] = useState({}) // { url: 'idle' | 'checking' | 'alive' | 'dead' }
  const [isCheckingLinks, setIsCheckingLinks] = useState(false)

  const checkLink = async (url) => {
    try {
      setLinkHealth(prev => ({ ...prev, [url]: 'checking' }))
      // We use no-cors to avoid CORS errors block.
      // If it doesn't throw, it means DNS/Connection is fine (Likely Alive).
      // If it throws, it's likely a Network Error (Dead).
      await fetch(url, { mode: 'no-cors', method: 'HEAD' })
      setLinkHealth(prev => ({ ...prev, [url]: 'alive' }))
    } catch (error) {
      console.error(`Dead link detected: ${url}`, error)
      setLinkHealth(prev => ({ ...prev, [url]: 'dead' }))
    }
  }

  const checkAllLinks = async () => {
    setIsCheckingLinks(true)
    const urls = [...new Set(bookmarks.map(b => b.url))]

    // Concurrency control (batch of 5)
    const batchSize = 5
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      await Promise.all(batch.map(url => checkLink(url)))
    }

    setIsCheckingLinks(false)
  }

  // Ignored URLs
  const toggleIgnoreUrl = useCallback((url) => {
    if (ignoredUrls.has(url)) {
      db.ignoredUrls.where('url').equals(url).delete();
    } else {
      db.ignoredUrls.add({ url });
    }
  }, [ignoredUrls])

  // Rule State
  const [newRule, setNewRule] = useState({
    type: 'keyword', // keyword, domain, exact
    value: '',
    targetFolder: '',
    tags: ''
  })
  const [editingRuleId, setEditingRuleId] = useState(null)

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)

  const [smartFilter, setSmartFilter] = useState(null) // null | 'old' | 'http' | 'untitled'

  // Advanced Search State
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false)
  const [searchMode, setSearchMode] = useState('simple') // 'simple' | 'fuzzy' | 'regex'
  const [dateFilter, setDateFilter] = useState({ start: null, end: null })

  const searchInputRef = useRef(null)

  // Initialize Fuse outside of render or memoize it
  const fuseOptions = useMemo(() => ({
    keys: ['title', 'url', 'tags', 'originalFolder'],
    threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
    ignoreLocation: true
  }), [])

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('html') // 'html', 'json', 'csv', 'md'



  // Derived state: Apply rules, search, and sort
  const bookmarks = useMemo(() => {
    if (rawBookmarks.length === 0) return [];

    let filtered = rawBookmarks;

    // 0. Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      if (searchMode === 'fuzzy') {
        const fuse = new Fuse(filtered, fuseOptions);
        const result = fuse.search(searchQuery);
        filtered = result.map(r => r.item);
      } else if (searchMode === 'regex') {
        try {
          const regex = new RegExp(searchQuery, 'i');
          filtered = filtered.filter(b =>
            regex.test(b.title || '') ||
            regex.test(b.url || '') ||
            (b.tags || []).some(t => regex.test(t))
          );
        } catch {
          // Invalid regex, maybe don't filter or show nothing? 
          // For now, let's treat it as a failed match if regex is invalid, or fallback to simple?
          // Fallback to simple contains to be user friendly while typing
          filtered = filtered.filter(b =>
            (b.title || '').toLowerCase().includes(query) ||
            (b.url || '').toLowerCase().includes(query)
          );
        }
      } else {
        // Simple Mode
        filtered = filtered.filter(b =>
          (b.title || '').toLowerCase().includes(query) ||
          (b.url || '').toLowerCase().includes(query) ||
          (b.tags || []).some(t => t.toLowerCase().includes(query))
        );
      }
    }

    // 0.2 Date Filter
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter(b => {
        if (!b.addDate) return false;
        const bookmarkDate = parseInt(b.addDate) * 1000;

        // Start Date
        if (dateFilter.start) {
          const start = new Date(dateFilter.start).getTime();
          if (bookmarkDate < start) return false;
        }

        // End Date
        if (dateFilter.end) {
          // Set to end of day
          const end = new Date(dateFilter.end);
          end.setHours(23, 59, 59, 999);
          if (bookmarkDate > end.getTime()) return false;
        }

        return true;
      })
    }

    // 0.5 Tag Filter
    if (activeTag) {
      filtered = filtered.filter(b => b.tags && b.tags.includes(activeTag))
    }

    // 0.55 Folder Filter
    if (activeFolder) {
      filtered = filtered.filter(b => (b.newFolder || b.originalFolder) === activeFolder)
    }

    // 0.6 Smart Filters
    if (smartFilter === 'old') {
      const fiveYearsAgo = Date.now() - (5 * 365 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(b => {
        if (!b.addDate) return false;
        const date = parseInt(b.addDate) * 1000;
        return date < fiveYearsAgo;
      });
    } else if (smartFilter === 'http') {
      filtered = filtered.filter(b => b.url && b.url.startsWith('http://'));
    } else if (smartFilter === 'untitled') {
      filtered = filtered.filter(b => {
        const title = (b.title || '').trim().toLowerCase();
        const url = (b.url || '').trim().toLowerCase();
        return !title || title === 'untitled' || title === 'page' || title === url || url.includes(title);
      });
    } else if (smartFilter === 'docs') {
      filtered = filtered.filter(b => {
        const url = (b.url || '').toLowerCase();
        return url.endsWith('.pdf') ||
          url.endsWith('.doc') || url.endsWith('.docx') ||
          url.endsWith('.xls') || url.endsWith('.xlsx') ||
          url.endsWith('.ppt') || url.endsWith('.pptx') ||
          url.includes('docs.google.com');
      });
    }

    // 1. First pass: Map URLs to find all duplicates
    const urlMap = new Map();
    filtered.forEach(b => {
      const u = b.url;
      if (!urlMap.has(u)) {
        urlMap.set(u, []);
      }
      urlMap.get(u).push({ id: b.id, folder: b.originalFolder });
    });

    const processed = filtered.map(b => {
      let matchedRule = null;
      let newFolder = b.originalFolder;
      let ruleTags = [];

      // Check duplicate status
      const siblings = urlMap.get(b.url);
      const isMulti = siblings && siblings.length > 1;
      const indexInSiblings = siblings ? siblings.findIndex(s => s.id === b.id) : 0;
      const isDuplicate = isMulti && indexInSiblings > 0; // It's a duplicate (2nd+ instance)
      const hasDuplicate = isMulti && indexInSiblings === 0; // It's the original (1st instance) but has duplicates

      // Get locations of other instances
      const otherLocations = isMulti
        ? siblings.filter(s => s.id !== b.id).map(s => s.folder)
        : [];

      for (const rule of rules) {
        let match = false;
        // Safety check for null values
        const title = b.title || '';
        const url = b.url || '';
        const contentToCheck = (title + ' ' + url).toLowerCase();
        const rawRuleValue = (rule.value || '').toLowerCase();

        if (!rawRuleValue) continue;

        const ruleValues = rawRuleValue.split(',').map(v => v.trim()).filter(Boolean);

        for (const val of ruleValues) {
          if (rule.type === 'keyword' && contentToCheck.includes(val)) {
            match = true;
          } else if (rule.type === 'domain' && url.toLowerCase().includes(val)) {
            match = true;
          } else if (rule.type === 'exact' && title.toLowerCase() === val) {
            match = true;
          }
          if (match) break;
        }

        if (match) {
          matchedRule = rule;
          // Only update folder if targetFolder is set
          if (rule.targetFolder) {
            newFolder = rule.targetFolder;
          }
          // specific checking if tags exist
          if (rule.tags) {
            ruleTags = rule.tags.split(',').map(t => t.trim()).filter(Boolean);
          }
          break; // First match wins
        }
      }

      const existingTags = b.tags || [];
      const allTags = Array.from(new Set([...existingTags, ...ruleTags]));

      return {
        ...b,
        newFolder: matchedRule ? newFolder : b.originalFolder,
        tags: allTags, // Use combined tags for filtering
        ruleTags: ruleTags, // Keep track of which ones are from rules
        status: matchedRule ? 'matched' : 'unchanged',
        isDuplicate,
        hasDuplicate,
        otherLocations
      };
    });

    // Sort priority:
    // 1. Duplicates (actual duplicates or items with duplicates)
    // 2. Matched Rules
    // 3. Others
    processed.sort((a, b) => {
      const aDup = a.isDuplicate || a.hasDuplicate;
      const bDup = b.isDuplicate || b.hasDuplicate;

      if (aDup && !bDup) return -1;
      if (!aDup && bDup) return 1;

      if (a.status === 'matched' && b.status !== 'matched') return -1;
      if (a.status !== 'matched' && b.status === 'matched') return 1;

      // Sub-sort duplicates: Original first, then duplicates
      if (aDup && bDup) {
        if (a.hasDuplicate && b.isDuplicate) return -1;
        if (a.isDuplicate && b.hasDuplicate) return 1;
      }

      return 0;
    });

    return processed;
  }, [rawBookmarks, rules, searchQuery, activeTag, smartFilter, searchMode, dateFilter, fuseOptions, activeFolder]);

  // Extract Unique Tags
  const uniqueTags = useMemo(() => {
    const tags = new Map()
    rawBookmarks.forEach(b => {
      if (b.tags && b.tags.length > 0) {
        b.tags.forEach(t => {
          const count = tags.get(t) || 0
          tags.set(t, count + 1)
        })
      }
    })
    return Array.from(tags.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [rawBookmarks])

  // Smart Filter Counts
  const smartCounts = useMemo(() => {
    const fiveYearsAgo = Date.now() - (5 * 365 * 24 * 60 * 60 * 1000);

    let old = 0;
    let http = 0;
    let untitled = 0;
    let docs = 0;

    rawBookmarks.forEach(b => {
      // Old
      if (b.addDate) {
        const date = parseInt(b.addDate) * 1000;
        if (date < fiveYearsAgo) old++;
      }

      // HTTP
      if (b.url && b.url.startsWith('http://')) http++;

      // Untitled
      const title = (b.title || '').trim().toLowerCase();
      const url = (b.url || '').trim().toLowerCase();
      if (!title || title === 'untitled' || title === 'page' || title === url || url.includes(title)) {
        untitled++;
      }

      // Docs
      if (url.endsWith('.pdf') ||
        url.endsWith('.doc') || url.endsWith('.docx') ||
        url.endsWith('.xls') || url.endsWith('.xlsx') ||
        url.endsWith('.ppt') || url.endsWith('.pptx') ||
        url.includes('docs.google.com')) {
        docs++;
      }
    });

    return { old, http, untitled, docs };
  }, [rawBookmarks]);



  // Duplicate Logic
  const duplicateCount = useMemo(() => {
    const urls = new Set();
    let duplicates = 0;
    rawBookmarks.forEach(b => {
      if (urls.has(b.url)) {
        duplicates++;
      } else {
        urls.add(b.url);
      }
    });
    return duplicates;
  }, [rawBookmarks]);

  const removeDuplicates = () => {
    const urls = new Set();
    const toDelete = [];
    rawBookmarks.forEach(b => {
      if (urls.has(b.url)) {
        toDelete.push(b.id);
      } else {
        urls.add(b.url);
      }
    });
    if (toDelete.length > 0) {
      db.bookmarks.bulkDelete(toDelete);
    }
  };

  // File Upload
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const text = e.target.result
        let parsed = [];

        if (file.name.endsWith('.json')) {
          parsed = parseJson(text);
        } else if (file.name.endsWith('.csv')) {
          parsed = parseCsv(text);
        } else if (file.name.endsWith('.md')) {
          parsed = parseMarkdown(text);
        } else {
          parsed = parseBookmarks(text);
        }

        if (parsed.length > 0) {
          // Clear and replace strategy for file load
          await db.transaction('rw', db.bookmarks, async () => {
            // For now, let's append? Or clear? 
            // Logic in original was `setRawBookmarks(parsed)`, which replaces.
            await db.bookmarks.clear();
            await db.bookmarks.bulkAdd(parsed);
          });
        } else {
          console.error("No bookmarks found or parse error")
        }
      }
      reader.readAsText(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html'],
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'text/markdown': ['.md']
    }
  })

  // Export
  const openExportModal = () => setIsExportModalOpen(true)

  const performExport = () => {
    let content = '';
    let type = '';
    let extension = '';

    switch (exportFormat) {
      case 'json':
        content = exportToJson(bookmarks);
        type = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = exportToCsv(bookmarks);
        type = 'text/csv';
        extension = 'csv';
        break;
      case 'md':
        content = exportToMarkdown(bookmarks);
        type = 'text/markdown';
        extension = 'md';
        break;
      case 'html':
      default:
        content = exportBookmarks(bookmarks);
        type = 'text/html';
        extension = 'html';
        break;
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_organized.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  }

  // Manage Rules
  const addRule = async () => {
    if (newRule.value && (newRule.targetFolder || newRule.tags)) {
      const ruleToAdd = { ...newRule, id: generateUUID() };

      if (editingRuleId) {
        // Update
        const originalRule = rules.find(r => r.id === editingRuleId);
        if (originalRule) {
          await db.rules.update(editingRuleId, newRule);

          addCommand({
            undo: () => db.rules.update(editingRuleId, originalRule),
            redo: () => db.rules.update(editingRuleId, newRule),
            description: 'Update Rule'
          });
        }
        setEditingRuleId(null)
      } else {
        // Add
        await db.rules.add(ruleToAdd);

        addCommand({
          undo: () => db.rules.delete(ruleToAdd.id),
          redo: () => db.rules.add(ruleToAdd),
          description: 'Add Rule'
        });
      }
      setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' })
    }
  }

  const startEditing = (rule) => {
    setEditingRuleId(rule.id)
    setNewRule({
      type: rule.type,
      value: rule.value,
      targetFolder: rule.targetFolder || '',
      tags: rule.tags || ''
    })
  }

  const cancelEditing = () => {
    setEditingRuleId(null)
    setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' })
  }

  const deleteRule = async (id) => {
    const ruleToDelete = rules.find(r => r.id === id);
    if (!ruleToDelete) return;

    await db.rules.delete(id);

    addCommand({
      undo: () => db.rules.add(ruleToDelete),
      redo: () => db.rules.delete(id),
      description: 'Delete Rule'
    });

    if (editingRuleId === id) {
      cancelEditing()
    }
  }

  const clearAll = () => {
    // Clear bookmarks and rules? 
    // Original cleared bookmarks, rules, selectedIds.
    db.transaction('rw', db.bookmarks, db.rules, async () => {
      await db.bookmarks.clear();
      await db.rules.clear();
    });
    setSelectedIds(new Set())
  }

  const closeFile = () => {
    // "Close File" effectively meant clearing the session in prev version.
    db.transaction('rw', db.bookmarks, db.rules, async () => {
      await db.bookmarks.clear();
      await db.rules.clear();
    });
    setSelectedIds(new Set())
    setLinkHealth({})
    setSearchQuery('')
    setActiveTag(null)
    setSmartFilter(null)
  }

  // Selection Logic

  // Selection Logic
  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === bookmarks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(bookmarks.map(b => b.id)))
    }
  }

  // Batch Operations
  const handleBatchDelete = useCallback(async () => {
    const idsToDelete = [...selectedIds];
    if (idsToDelete.length > 0) {
      const bookmarksToDelete = await db.bookmarks.bulkGet(idsToDelete);

      await db.bookmarks.bulkDelete(idsToDelete);

      addCommand({
        undo: () => db.bookmarks.bulkAdd(bookmarksToDelete),
        redo: () => db.bookmarks.bulkDelete(idsToDelete),
        description: `Delete ${idsToDelete.length} bookmarks`
      });

      setSelectedIds(new Set())
    }
  }, [selectedIds, addCommand])

  const handleBatchMove = async (targetFolder) => {
    const idsToMove = [...selectedIds];
    if (idsToMove.length > 0) {
      // Capture state before move
      const bookmarksToMove = await db.bookmarks.bulkGet(idsToMove);
      // Map of ID -> originalFolder (to revert)
      // Actually we just revert the whole object or just the fields?
      // Reverting specific fields is safer.
      const originalStates = bookmarksToMove.map(b => ({ id: b.id, originalFolder: b.originalFolder, newFolder: b.newFolder }));

      await db.transaction('rw', db.bookmarks, async () => {
        await db.bookmarks.where('id').anyOf(idsToMove).modify({ originalFolder: targetFolder, newFolder: targetFolder });
      });

      addCommand({
        undo: () => db.transaction('rw', db.bookmarks, async () => {
          // We have to update each one because they might have been in different folders
          // Bulk put is easiest if we have the full objects, but we only captured state.
          // Let's use bulkPut with merged back data if we had full objects, but here we iterate.
          // Optimization: group by folder?
          // Simple:
          for (const state of originalStates) {
            await db.bookmarks.update(state.id, { originalFolder: state.originalFolder, newFolder: state.newFolder });
          }
        }),
        redo: () => db.bookmarks.where('id').anyOf(idsToMove).modify({ originalFolder: targetFolder, newFolder: targetFolder }),
        description: `Move ${idsToMove.length} bookmarks`
      });

      setSelectedIds(new Set())
    }
  }

  const handleBatchMoveDocs = () => {
    // Find docs
    // Implementation with Dexie:
    // We can use the collection modify logic again, but we need criteria.
    // Dexie filtering in 'modify' is efficient.

    const isDoc = (url) => {
      url = (url || '').toLowerCase();
      return url.endsWith('.pdf') ||
        url.endsWith('.doc') || url.endsWith('.docx') ||
        url.endsWith('.xls') || url.endsWith('.xlsx') ||
        url.endsWith('.ppt') || url.endsWith('.pptx') ||
        url.includes('docs.google.com');
    }

    db.transaction('rw', db.bookmarks, async () => {
      // Since we can't easily do string "endsWith" in indexedDB query easily for multiple extensions
      // we might iterate or use filter.
      // For 10k items, filter in JS is fine.
      await db.bookmarks.filter(b => isDoc(b.url)).modify({ originalFolder: 'References', newFolder: 'References' });
    });
    setSmartFilter(null);
  };

  const handleStatusOverride = (status) => {
    // This only updates local state visually, logic depends on if we store this override
    // For now, let's just update the linkHealth to reflect this manual override
    const newHealth = { ...linkHealth }
    selectedIds.forEach(id => {
      const bookmark = bookmarks.find(b => b.id === id)
      if (bookmark) {
        newHealth[bookmark.url] = status
      }
    })
    setLinkHealth(newHealth)
    setSelectedIds(new Set())
  }


  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input (except for specific shortcuts if needed later)
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)

      // Shortcut: "/" to focus search
      if (e.key === '/' && !isInput) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      // Shortcut: "Delete" to delete selected
      if (e.key === 'Delete' && selectedIds.size > 0 && !isInput) {
        e.preventDefault()
        handleBatchDelete()
      }

      // Shortcut: "Ctrl+A" or "Cmd+A" to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isInput) {
        e.preventDefault()
        // Select all currently visible bookmarks
        setSelectedIds(new Set(bookmarks.map(b => b.id)))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, bookmarks, handleBatchDelete])

  return (
    <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="border-b h-16 flex items-center justify-between px-4 sm:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-2">
          {/* Mobile Menu Button - Show up to LG */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-2 -ml-2"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Settings className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex mr-2"
            onClick={() => openSettings('folders')}
            title="Taxonomy Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>

          <Folder className="h-6 w-6 text-primary shrink-0" />
          <h1 className="font-bold text-xl tracking-tight hidden sm:block">BookSmart</h1>
          <div className="flex items-center gap-1 ml-4 border-l pl-4">
            {canUndo && (
              <Button variant="ghost" size="icon" onClick={undo} title="Undo (Ctrl+Z)">
                <Undo2 className="h-4 w-4" />
              </Button>
            )}
            {canRedo && (
              <Button variant="ghost" size="icon" onClick={redo} title="Redo (Ctrl+Y)">
                <Redo2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 flex flex-col relative z-20">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={searchMode === 'regex' ? "Search with Regex..." : "Search..."}
                className={cn(
                  "pl-8 bg-background/50 focus:bg-background transition-colors h-9 sm:h-10 text-sm",
                  searchMode === 'regex' && "font-mono text-xs"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant={isAdvancedSearchOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
              className="shrink-0"
              title="Advanced Search Filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Advanced Search Panel - Absolute positioned below search bar */}
          <div className="absolute top-full left-0 right-0 mt-2">
            <AdvancedSearch
              isOpen={isAdvancedSearchOpen}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-4">
          {/* Undo/Redo removed as it requires complex DB transaction history management */}

          {/* Mobile: Collapse Actions into a unified menu or simplify */}
          {duplicateCount > 0 && (
            <Button onClick={removeDuplicates} variant="destructive" size="sm" className="gap-2 hidden sm:flex">
              <Layers className="h-4 w-4" />
              <span className="hidden lg:inline">Remove {duplicateCount} Duplicates</span>
              <span className="lg:hidden">{duplicateCount}</span>
            </Button>
          )}

          {bookmarks.length > 0 && (
            <div className="flex gap-1 sm:gap-2">
              <div className="flex bg-muted/50 p-1 rounded-lg border mr-0 sm:mr-2 shrink-0">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                {viewMode === 'grid' && (
                  <Button
                    variant={showThumbnails ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    title={showThumbnails ? "Hide Thumbnails" : "Show Thumbnails"}
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant={viewMode === 'analytics' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('analytics')}
                  title="Analytics"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={checkAllLinks} disabled={isCheckingLinks} variant="outline" size="icon" className="hidden sm:flex gap-2 w-auto px-3">
                {isCheckingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                <span className="hidden lg:inline">{isCheckingLinks ? 'Checking...' : 'Check Health'}</span>
              </Button>

              <Button onClick={openExportModal} variant="default" size="icon" className="hidden sm:flex gap-2 w-auto px-3 shadow-lg shadow-primary/20">
                <Download className="h-4 w-4" />
                <span className="hidden lg:inline">Export</span>
              </Button>
            </div>
          )}

          {hasFileLoaded && (
            <Button
              onClick={closeFile}
              variant="ghost"
              size="icon"
              className="ml-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Close File"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full shrink-0"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - Mobile Overlay or Desktop Sidebar */}
        <aside
          className={cn(
            "bg-card border-r flex flex-col transition-all duration-300 ease-in-out z-30 h-full overflow-y-auto",
            // Desktop behavior (LG+ now)
            "lg:static lg:flex",
            // Mobile/Tablet behavior (Absolute overlay)
            "absolute inset-y-0 left-0 h-full shadow-2xl lg:shadow-none",
            isSidebarOpen ? "w-80 p-4 translate-x-0" : "w-0 p-0 -translate-x-full lg:w-0 lg:translate-x-0 lg:p-0 overflow-hidden"
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" /> Tags
            </h2>
            {/* Mobile/Tablet Close Button */}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
          </div>

          <div className="mb-6 space-y-1">
            {uniqueTags.length === 0 && <p className="text-sm text-muted-foreground">No tags found.</p>}
            {/* 
                Merge uniqueTags (counts) with availableTags (colors/order). 
                If a tag exists in availableTags, use its color/order. 
                Otherwise default.
            */}
            {uniqueTags.map(tag => {
              const config = availableTags.find(t => t.name === tag.name);
              const color = config ? config.color : '#64748b';
              return (
                <button
                  key={tag.name}
                  onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
                  className={cn(
                    "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors border border-transparent",
                    activeTag === tag.name ? "bg-accent text-accent-foreground font-medium border-border" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span>#{tag.name}</span>
                  </div>
                  <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{tag.count}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mb-4 border-t pt-6">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Folder className="h-5 w-5" /> Folders
            </h2>
          </div>

          <div className="mb-6 space-y-1">
            {/* Render available folders sorted by order */}
            {[...availableFolders].sort((a, b) => (a.order || 0) - (b.order || 0)).map(folder => {
              // Calculate count for this folder
              const count = bookmarks.filter(b => (b.newFolder || b.originalFolder) === folder.name).length;

              return (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolder(activeFolder === folder.name ? null : folder.name)}
                  className={cn(
                    "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors border border-transparent",
                    activeFolder === folder.name ? "bg-accent text-accent-foreground font-medium border-border" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" style={{ color: folder.color }} />
                    <span>{folder.name}</span>
                  </div>
                  <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{count}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mb-4 border-t pt-6">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Archive className="h-5 w-5" /> Smart Filters
            </h2>
          </div>
          <div className="mb-6 space-y-1">
            {/* Old Bookmarks */}
            <button
              onClick={() => setSmartFilter(smartFilter === 'old' ? null : 'old')}
              className={cn(
                "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                smartFilter === 'old' ? "bg-amber-100 text-amber-700 font-medium dark:bg-amber-900/30 dark:text-amber-400" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 opacity-70" />
                <span>Dusty Shelves (&gt; 5y)</span>
              </div>
              <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{smartCounts.old}</span>
            </button>

            {/* HTTP (Insecure) */}
            <button
              onClick={() => setSmartFilter(smartFilter === 'http' ? null : 'http')}
              className={cn(
                "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                smartFilter === 'http' ? "bg-red-100 text-red-700 font-medium dark:bg-red-900/30 dark:text-red-400" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 opacity-70" />
                <span>Not Secure (HTTP)</span>
              </div>
              <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{smartCounts.http}</span>
            </button>

            {/* Untitled */}
            <button
              onClick={() => setSmartFilter(smartFilter === 'untitled' ? null : 'untitled')}
              className={cn(
                "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                smartFilter === 'untitled' ? "bg-orange-100 text-orange-700 font-medium dark:bg-orange-900/30 dark:text-orange-400" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <FileQuestion className="h-4 w-4 opacity-70" />
                <span>Untitled / Generic</span>
              </div>
              <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{smartCounts.untitled}</span>
            </button>

            {/* Docs & PDFs */}
            <button
              onClick={() => setSmartFilter(smartFilter === 'docs' ? null : 'docs')}
              className={cn(
                "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                smartFilter === 'docs' ? "bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 opacity-70" />
                <span>Docs & PDFs</span>
              </div>
              <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{smartCounts.docs}</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-6 border-t pt-6">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Rules
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openSettings()}
              className="h-7 text-xs gap-1"
            >
              <Settings className="h-3 w-3" /> Manage
            </Button>
          </div>

          <Card className="p-4 mb-6 space-y-4 border-dashed border-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                className="w-full bg-background border rounded-md h-9 px-3 text-sm focus:ring-2 focus:ring-primary"
                value={newRule.type}
                onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
              >
                <option value="keyword">Keyword</option>
                <option value="domain">Domain</option>
                <option value="exact">Exact Title</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Value</label>
              <Input
                placeholder="e.g. 'github', 'youtube'"
                value={newRule.value}
                onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Target Folder (Optional)</label>
              <SimpleCombobox
                options={availableFolders.map(f => f.name)}
                value={newRule.targetFolder}
                onChange={(val) => {
                  setNewRule({ ...newRule, targetFolder: val })
                  // Auto-add to available folders if created new
                  if (val && !availableFolders.some(f => f.name === val)) {
                    db.folders.add({
                      id: generateUUID(),
                      name: val,
                      color: '#3b82f6',
                      order: availableFolders.length
                    });
                  }
                }}
                placeholder="Select or create folder..."
                allowCreate={true}
              />
              <p className="text-[10px] text-muted-foreground">
                Example: <code>Main &gt; Subfolder</code> for nested structure.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tags (Comma separated)</label>
              <Input
                placeholder="e.g. news, tech, read-later"
                value={newRule.tags}
                onChange={(e) => setNewRule({ ...newRule, tags: e.target.value })}
              />
              {/* Quick Add Tags */}
              <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const current = newRule.tags ? newRule.tags.split(',').map(t => t.trim()).filter(Boolean) : []
                      if (!current.includes(tag.name)) {
                        const newValue = [...current, tag.name].join(', ')
                        setNewRule({ ...newRule, tags: newValue })
                      }
                    }}
                    className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full hover:bg-secondary/80 transition-colors"
                  >
                    + {tag.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={addRule} className="flex-1" size="sm">
                {editingRuleId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {editingRuleId ? 'Update Rule' : 'Add Rule'}
              </Button>
              {editingRuleId && (
                <Button onClick={cancelEditing} variant="outline" size="sm" className="px-3">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>

          <div className="space-y-2">
            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No rules defined.</p>
            )}
            {rules.map(rule => (
              <div key={rule.id} className="flex items-start justify-between p-3 rounded-md bg-accent/50 hover:bg-accent border group gap-2">
                <div className="flex flex-col w-full min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{rule.type}</span>

                  {/* Rule Value */}
                  <div className="text-sm font-medium break-words leading-tight mb-1.5">
                    "{rule.value}"
                  </div>

                  {/* Target Folder & Tags */}
                  {(rule.targetFolder || rule.tags) && (
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {rule.targetFolder && (
                        <div className="flex items-start gap-1">
                          <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="font-medium text-primary break-words">{rule.targetFolder}</span>
                        </div>
                      )}

                      {rule.tags && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {rule.tags.split(',').map(tag => (
                            <span key={tag} className="bg-background border px-1.5 py-0.5 rounded text-[10px]">
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 shrink-0 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => startEditing(rule)}
                    title="Edit Rule"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteRule(rule.id)}
                    title="Delete Rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-secondary/10 p-6 relative">

          {!hasFileLoaded ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div
                {...getRootProps()}
                className={cn(
                  "border-4 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 max-w-2xl w-full",
                  isDragActive ? "border-primary bg-primary/10 scale-105" : "border-muted-foreground/25"
                )}
              >
                <input {...getInputProps()} />
                <div className="bg-primary/10 p-6 rounded-full mb-6">
                  <Upload className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Drop your bookmarks here</h3>
                <p className="text-muted-foreground max-w-md">
                  Drag and drop your exported Netscape HTML (Recomended), JSON, CSV, or Markdown files to get started.
                </p>
                <Button variant="outline" className="mt-8">Browse Files</Button>
              </div>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-muted p-6 rounded-full mb-4">
                <Search className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No bookmarks found</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                We couldn't find any bookmarks matching your search or filters.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  // Reset other filters if we had them
                  setActiveTag(null)
                  setSmartFilter(null)
                }}
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-w-[1600px] mx-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Your Bookmarks ({bookmarks.length})</h2>
                <div className="flex gap-2">
                  {smartFilter === 'docs' && bookmarks.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleBatchMoveDocs}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      Move {bookmarks.length} to "References"
                    </Button>
                  )}
                  <Button variant="ghost" onClick={clearAll} className="text-muted-foreground">
                    Clear All
                  </Button>
                </div>
              </div>

              {viewMode === 'analytics' ? (
                <AnalyticsDashboard
                  bookmarks={rawBookmarks}
                  linkHealth={linkHealth}
                  onFilterOld={() => {
                    setSmartFilter('old');
                    setViewMode('list');
                  }}
                  oldBookmarksCount={smartCounts ? smartCounts.old : 0}
                />
              ) : (

                <div className="flex h-[calc(100vh-250px)] gap-4 transition-all duration-300">
                  {/* Main Content Area */}
                  <div className={cn("flex-1 min-w-0 h-full", previewBookmark ? "hidden xl:block xl:basis-3/5" : "basis-full")}>
                    {viewMode === 'list' ? (
                      <BookmarkList
                        bookmarks={bookmarks}
                        selectedIds={selectedIds}
                        toggleSelection={toggleSelection}
                        toggleAll={toggleAll}
                        linkHealth={linkHealth}
                        ignoredUrls={ignoredUrls}
                        toggleIgnoreUrl={toggleIgnoreUrl}
                        availableFolders={availableFolders}
                      />
                    ) : (
                      <BookmarkGrid
                        bookmarks={bookmarks}
                        selectedIds={selectedIds}
                        toggleSelection={toggleSelection}
                        showThumbnails={showThumbnails}
                        onPreview={(b) => {
                          setPreviewBookmark(b)
                          setSelectedIds(new Set([b.id]))
                        }}
                        availableFolders={availableFolders}
                      />
                    )}
                  </div>

                  {/* Preview Pane - Only visible when previewBookmark is set */}
                  {previewBookmark && (
                    <div className="flex-1 xl:basis-2/5 h-full min-w-0 border rounded-lg overflow-hidden shadow-lg animate-in fade-in slide-in-from-right-4">
                      <PreviewPane
                        bookmark={previewBookmark}
                        onClose={() => setPreviewBookmark(null)}
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </main>
        <FloatingActionBar
          selectedCount={selectedIds.size}
          onDelete={handleBatchDelete}
          onMove={handleBatchMove}
          onClearSelection={() => setSelectedIds(new Set())}
          onOverrideStatus={handleStatusOverride}
        />

        {/* Settings Modal */}
        <SimpleModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title="Taxonomy Settings"
        >
          <TaxonomyManager
            folders={availableFolders}
            setFolders={setAvailableFolders}
            tags={availableTags}
            setTags={setAvailableTags}
            defaultTab={settingsTab}
          />
        </SimpleModal>
        {/* Export Modal */}
        <SimpleModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title="Export Bookmarks"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select the format you want to export your bookmarks in.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={cn(
                  "cursor-pointer border rounded-lg p-4 transition-all hover:bg-muted/50",
                  exportFormat === 'html' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                )}
                onClick={() => setExportFormat('html')}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <div className="bg-orange-100 text-orange-600 p-1.5 rounded-md"><File className="h-4 w-4" /></div>
                  HTML (Netscape)
                </div>
                <p className="text-xs text-muted-foreground">Standard format. Best for importing into other browsers or managers.</p>
              </div>

              <div
                className={cn(
                  "cursor-pointer border rounded-lg p-4 transition-all hover:bg-muted/50",
                  exportFormat === 'json' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                )}
                onClick={() => setExportFormat('json')}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <div className="bg-blue-100 text-blue-600 p-1.5 rounded-md"><File className="h-4 w-4" /></div>
                  JSON
                </div>
                <p className="text-xs text-muted-foreground">Raw data format. Useful for developers or programmatic access.</p>
              </div>

              <div
                className={cn(
                  "cursor-pointer border rounded-lg p-4 transition-all hover:bg-muted/50",
                  exportFormat === 'csv' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                )}
                onClick={() => setExportFormat('csv')}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <div className="bg-green-100 text-green-600 p-1.5 rounded-md"><File className="h-4 w-4" /></div>
                  CSV
                </div>
                <p className="text-xs text-muted-foreground">Comma-separated values. Perfect for Excel or Google Sheets.</p>
              </div>

              <div
                className={cn(
                  "cursor-pointer border rounded-lg p-4 transition-all hover:bg-muted/50",
                  exportFormat === 'md' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                )}
                onClick={() => setExportFormat('md')}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <div className="bg-slate-100 text-slate-600 p-1.5 rounded-md"><File className="h-4 w-4" /></div>
                  Markdown
                </div>
                <p className="text-xs text-muted-foreground">Formatted text. Great for documentation or notes apps (Obsidian, Notion).</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Cancel</Button>
              <Button onClick={performExport}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </SimpleModal>
      </div >
    </div >
  )
}

export default App
