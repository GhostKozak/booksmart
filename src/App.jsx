import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Sun, Moon, Upload, Download, Plus, Trash2, Folder, File, ArrowRight, Settings, Check, AlertCircle, Layers, XCircle, Activity, Loader2, CheckCircle2, HelpCircle, BarChart3, List, Undo2, Redo2, Search, Tag, LogOut, Archive, ShieldAlert, FileQuestion, History as HistoryIcon, Save, Pencil, X, LayoutGrid, Image, Filter, ChevronRight, ChevronDown, Sparkles, Link, Video, MessageCircle, ShoppingCart, Newspaper } from 'lucide-react'
import { useTheme } from './hooks/use-theme'
import { useUndoRedo } from './hooks/use-undo-redo'
import { FloatingActionBar } from './components/FloatingActionBar'
import { HistoryPanel } from './components/HistoryPanel'
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
import { BackupSettings } from './components/BackupSettings'
import { saveAutoBackup, createBackup, downloadBackup } from './lib/backup-manager'
import ProcessingWorker from './workers/processing.worker.js?worker'
import { cleanUrl, countCleanableUrls } from './lib/url-cleaner'

const EMPTY_ARRAY = [];

function App() {
  const { theme, setTheme } = useTheme()
  const { addCommand, undo, redo, canUndo, canRedo, past, future } = useUndoRedo();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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


  const [showBackupModal, setShowBackupModal] = useState(false)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('folders') // 'folders' | 'tags' | 'backup'

  const openSettings = (tab = 'folders') => {
    setSettingsTab(tab)
    setIsSettingsOpen(true)
  }

  // Auto-Backup Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localStorage.getItem('booksmart_auto_backup_enabled') === 'true') {
        saveAutoBackup();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [rules, availableFolders, availableTags, ignoredUrlsList]);

  // Taxonomy Auto-Sync Effect REMOVED - We now use "Discovered" logic

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
  const handlePreview = useCallback((bookmark) => {
    setPreviewBookmark(bookmark);
  }, []);

  // Link Health State
  const [linkHealth, setLinkHealth] = useState({}) // { url: 'idle' | 'checking' | 'alive' | 'dead' }
  const [isCheckingLinks, setIsCheckingLinks] = useState(false)



  const checkAllLinks = async () => {
    if (!workerRef.current) {
      console.warn("Worker not initialized");
      return;
    }
    setIsCheckingLinks(true)
    const urls = [...new Set(bookmarks.map(b => b.url))]
    workerRef.current.postMessage({ type: 'CHECK_LINKS', payload: { urls } })
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
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState(null)

  const [smartFilter, setSmartFilter] = useState(null) // null | 'old' | 'http' | 'untitled'

  // Sidebar Accordion State
  const [collapsedSections, setCollapsedSections] = useState({
    tags: false,
    folders: false,
    filters: false,
    rules: false
  })

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

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
  const [exportOnlySelected, setExportOnlySelected] = useState(false)

  // Shortcuts Modal
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)



  // Worker State
  const [bookmarks, setBookmarks] = useState([])
  const [uniqueTags, setUniqueTags] = useState([])
  const [uniqueFolders, setUniqueFolders] = useState([])
  const [smartCounts, setSmartCounts] = useState({ old: 0, http: 0, untitled: 0, docs: 0, longurl: 0, media: 0, social: 0, shopping: 0, news: 0 })

  // Dead link count (derived from linkHealth state)
  const deadLinkCount = useMemo(() => {
    return Object.values(linkHealth).filter(s => s === 'dead').length
  }, [linkHealth])

  // Apply dead link filter on top of worker-processed bookmarks
  const displayBookmarks = useMemo(() => {
    if (smartFilter === 'dead') {
      return bookmarks.filter(b => linkHealth[b.url] === 'dead')
    }
    return bookmarks
  }, [bookmarks, smartFilter, linkHealth])
  const [duplicateCount, setDuplicateCount] = useState(0)
  const workerRef = useRef(null)

  // Initialize Worker
  useEffect(() => {
    try {
      // Vite handles ?worker imports by returning a constructor
      workerRef.current = new ProcessingWorker()
    } catch (e) {
      console.error("Failed to initialize worker:", e);
      // Fallback or alert user?
    }

    if (workerRef.current) {
      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data
        if (type === 'DATA_PROCESSED') {
          setBookmarks(payload.processedBookmarks)
          setUniqueTags(payload.uniqueTags)
          setUniqueFolders(payload.uniqueFolders)
          setSmartCounts(payload.smartCounts)
          setDuplicateCount(payload.duplicateCount)
        } else if (type === 'LINK_STATUS_UPDATE') {
          setLinkHealth(prev => {
            const next = { ...prev }
            payload.forEach(item => {
              next[item.url] = item.status
            })
            return next
          })
        } else if (type === 'LINKS_CHECKED_COMPLETE') {
          setIsCheckingLinks(false)
        }
      }
      return () => workerRef.current.terminate()
    }
  }, [])

  // Send Data to Worker
  useEffect(() => {
    if (!workerRef.current) return
    workerRef.current.postMessage({
      type: 'PROCESS_DATA',
      payload: {
        bookmarks: rawBookmarks,
        rules,
        searchQuery,
        searchMode,
        activeTag,
        activeFolder,
        smartFilter,
        dateFilter,
        fuseOptions
      }
    })
  }, [rawBookmarks, rules, searchQuery, searchMode, activeTag, activeFolder, smartFilter, dateFilter, fuseOptions])

  // Derived Discovery State
  const discoveredTags = useMemo(() => {
    const existingNames = new Set(availableTags.map(t => t.name));
    return uniqueTags.filter(t => !existingNames.has(t.name));
  }, [uniqueTags, availableTags]);

  const discoveredFolders = useMemo(() => {
    const existingNames = new Set(availableFolders.map(f => f.name));
    return uniqueFolders.filter(f => !existingNames.has(f.name));
  }, [uniqueFolders, availableFolders]);

  const saveToTaxonomy = async (name, type) => {
    if (type === 'tag') {
      await db.tags.add({
        id: generateUUID(),
        name,
        color: '#10b981',
        order: availableTags.length
      });
    } else {
      await db.folders.add({
        id: generateUUID(),
        name,
        color: '#3b82f6',
        order: availableFolders.length
      });
    }
  };

  const removeDuplicates = async () => {
    const urls = new Set();
    const toDeleteIds = [];

    // Identify duplicates (keep first instance)
    const sortedBookmarks = [...rawBookmarks].sort((a, b) => a.addDate - b.addDate);

    sortedBookmarks.forEach(b => {
      if (urls.has(b.url)) {
        toDeleteIds.push(b.id);
      } else {
        urls.add(b.url);
      }
    });

    if (toDeleteIds.length > 0) {
      // Get the full bookmark objects before deleting so we can restore them
      const bookmarksToDelete = await db.bookmarks.bulkGet(toDeleteIds);

      await db.bookmarks.bulkDelete(toDeleteIds);

      addCommand({
        undo: () => db.bookmarks.bulkAdd(bookmarksToDelete),
        redo: () => db.bookmarks.bulkDelete(toDeleteIds),
        description: `Remove ${toDeleteIds.length} Duplicate Bookmarks`
      });
    }
  };

  // URL Cleaning
  const cleanableCount = useMemo(() => countCleanableUrls(rawBookmarks), [rawBookmarks]);

  const cleanAllUrls = async () => {
    const updates = [];
    const originalStates = [];

    for (const b of rawBookmarks) {
      const { cleaned, changed } = cleanUrl(b.url);
      if (changed) {
        originalStates.push({ id: b.id, url: b.url });
        updates.push({ id: b.id, url: cleaned });
      }
    }

    if (updates.length === 0) return;

    await db.transaction('rw', db.bookmarks, async () => {
      for (const u of updates) {
        await db.bookmarks.update(u.id, { url: u.url });
      }
    });

    addCommand({
      undo: () => db.transaction('rw', db.bookmarks, async () => {
        for (const s of originalStates) {
          await db.bookmarks.update(s.id, { url: s.url });
        }
      }),
      redo: () => db.transaction('rw', db.bookmarks, async () => {
        for (const u of updates) {
          await db.bookmarks.update(u.id, { url: u.url });
        }
      }),
      description: `Clean ${updates.length} URLs (remove tracking params)`
    });
  };

  const cleanSelectedUrls = async () => {
    const selectedBookmarks = await db.bookmarks.bulkGet([...selectedIds]);
    const updates = [];
    const originalStates = [];

    for (const b of selectedBookmarks) {
      if (!b) continue;
      const { cleaned, changed } = cleanUrl(b.url);
      if (changed) {
        originalStates.push({ id: b.id, url: b.url });
        updates.push({ id: b.id, url: cleaned });
      }
    }

    if (updates.length === 0) return;

    await db.transaction('rw', db.bookmarks, async () => {
      for (const u of updates) {
        await db.bookmarks.update(u.id, { url: u.url });
      }
    });

    addCommand({
      undo: () => db.transaction('rw', db.bookmarks, async () => {
        for (const s of originalStates) {
          await db.bookmarks.update(s.id, { url: s.url });
        }
      }),
      redo: () => db.transaction('rw', db.bookmarks, async () => {
        for (const u of updates) {
          await db.bookmarks.update(u.id, { url: u.url });
        }
      }),
      description: `Clean ${updates.length} selected URLs (remove tracking params)`
    });

    setSelectedIds(new Set());
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
  const openExportModal = () => {
    setExportOnlySelected(false)
    setIsExportModalOpen(true)
  }

  const openExportSelectedModal = () => {
    setExportOnlySelected(true)
    setIsExportModalOpen(true)
  }

  const performExport = () => {
    const dataToExport = exportOnlySelected
      ? bookmarks.filter(b => selectedIds.has(b.id))
      : bookmarks;

    let content = '';
    let type = '';
    let extension = '';

    switch (exportFormat) {
      case 'json':
        content = exportToJson(dataToExport);
        type = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = exportToCsv(dataToExport);
        type = 'text/csv';
        extension = 'csv';
        break;
      case 'md':
        content = exportToMarkdown(dataToExport);
        type = 'text/markdown';
        extension = 'md';
        break;
      case 'html':
      default:
        content = exportBookmarks(dataToExport);
        type = 'text/html';
        extension = 'html';
        break;
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_${exportOnlySelected ? 'selected' : 'organized'}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
    if (exportOnlySelected) setSelectedIds(new Set());
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
      setIsRuleModalOpen(false)
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
    setIsRuleModalOpen(true)
  }

  const cancelEditing = () => {
    setEditingRuleId(null)
    setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' })
    setIsRuleModalOpen(false)
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

  const confirmClearAll = async (shouldBackup) => {
    if (shouldBackup) {
      try {
        const data = await createBackup();
        downloadBackup(data);
        // Small delay to ensure download starts before clearing?
      } catch (e) {
        console.error("Backup failed before clear:", e);
        // Should we stop? Let's alert.
        alert("Backup failed! Check console. Data was NOT cleared.");
        return;
      }
    }

    // Proceed to clear
    await db.transaction('rw', db.bookmarks, db.rules, db.folders, db.tags, db.ignoredUrls, async () => {
      await db.bookmarks.clear();
      await db.rules.clear();
      await db.folders.clear();
      await db.tags.clear();
      await db.ignoredUrls.clear();
    });
    setSelectedIds(new Set())
    setShowBackupModal(false);
  }

  const clearAll = () => {
    setShowBackupModal(true);
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
    if (selectedIds.size === displayBookmarks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayBookmarks.map(b => b.id)))
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
      // Check if folder exists in availableFolders
      // Note: availableFolders is from useLiveQuery, might be slightly stale if we just added, but good enough.
      // Better to check DB directly or just add if unique.
      // We can use put used with a specific key.

      const folderExists = availableFolders.some(f => f.name === targetFolder);
      if (targetFolder && !folderExists) {
        await db.folders.add({
          id: generateUUID(),
          name: targetFolder,
          color: '#64748b',
          order: availableFolders.length
        });
      }

      const bookmarksToMove = await db.bookmarks.bulkGet(idsToMove);
      const originalStates = bookmarksToMove.map(b => ({ id: b.id, originalFolder: b.originalFolder, newFolder: b.newFolder }));

      await db.transaction('rw', db.bookmarks, async () => {
        await db.bookmarks.where('id').anyOf(idsToMove).modify({ originalFolder: targetFolder, newFolder: targetFolder });
      });

      addCommand({
        undo: () => db.transaction('rw', db.bookmarks, async () => {
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

  const handleBatchMoveDocs = async () => {
    // Check/Create "References" folder
    const refFolderExists = availableFolders.some(f => f.name === 'References');
    if (!refFolderExists) {
      await db.folders.add({
        id: generateUUID(),
        name: 'References',
        color: '#3b82f6',
        order: availableFolders.length
      });
    }

    const isDoc = (url) => {
      url = (url || '').toLowerCase();
      return url.endsWith('.pdf') ||
        url.endsWith('.doc') || url.endsWith('.docx') ||
        url.endsWith('.xls') || url.endsWith('.xlsx') ||
        url.endsWith('.ppt') || url.endsWith('.pptx') ||
        url.includes('docs.google.com');
    }

    const bookmarksToMove = await db.bookmarks.filter(b => isDoc(b.url)).toArray();

    if (bookmarksToMove.length > 0) {
      const idsToMove = bookmarksToMove.map(b => b.id);
      const originalStates = bookmarksToMove.map(b => ({ id: b.id, originalFolder: b.originalFolder, newFolder: b.newFolder }));

      await db.bookmarks.where('id').anyOf(idsToMove).modify({ originalFolder: 'References', newFolder: 'References' });

      addCommand({
        undo: () => db.transaction('rw', db.bookmarks, async () => {
          for (const state of originalStates) {
            await db.bookmarks.update(state.id, { originalFolder: state.originalFolder, newFolder: state.newFolder });
          }
        }),
        redo: () => db.bookmarks.where('id').anyOf(idsToMove).modify({ originalFolder: 'References', newFolder: 'References' }),
        description: `Move ${idsToMove.length} documents to References`
      });
    }

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

  const handleBatchAddTags = async (tagsString) => {
    const newTags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    if (newTags.length === 0) return;

    const idsToUpdate = [...selectedIds];
    if (idsToUpdate.length > 0) {
      const bookmarksToUpdate = await db.bookmarks.bulkGet(idsToUpdate);
      const originalStates = bookmarksToUpdate.map(b => ({ id: b.id, tags: b.tags }));

      await db.transaction('rw', db.bookmarks, db.tags, async () => {
        // Add new tags to db.tags with a distinct color if they don't exist
        const distinctColor = '#10b981'; // Emerald-500 for user-added tags
        const allExistingTags = await db.tags.toArray();
        const existingTagNames = new Set(allExistingTags.map(t => t.name));

        const tagsToCreate = newTags.filter(t => !existingTagNames.has(t));
        if (tagsToCreate.length > 0) {
          await db.tags.bulkAdd(tagsToCreate.map(t => ({
            id: generateUUID(),
            name: t,
            color: distinctColor,
            order: allExistingTags.length
          })));
        }

        const updates = bookmarksToUpdate.map(bookmark => {
          // Handle both array and string (legacy) formats safeley
          let currentTags = [];
          if (Array.isArray(bookmark.tags)) {
            currentTags = bookmark.tags;
          } else if (typeof bookmark.tags === 'string') {
            currentTags = bookmark.tags.split(',').map(t => t.trim()).filter(Boolean);
          }

          const mergedTags = [...new Set([...currentTags, ...newTags])];
          return { ...bookmark, tags: mergedTags }; // Store as Array
        });
        await db.bookmarks.bulkPut(updates);
      });

      addCommand({
        undo: () => db.transaction('rw', db.bookmarks, async () => {
          for (const state of originalStates) {
            await db.bookmarks.update(state.id, { tags: state.tags });
          }
        }),
        redo: () => db.transaction('rw', db.bookmarks, async () => {
          const bookmarks = await db.bookmarks.bulkGet(idsToUpdate);
          const updates = bookmarks.map(bookmark => {
            let currentTags = [];
            if (Array.isArray(bookmark.tags)) {
              currentTags = bookmark.tags;
            } else if (typeof bookmark.tags === 'string') {
              currentTags = bookmark.tags.split(',').map(t => t.trim()).filter(Boolean);
            }
            const mergedTags = [...new Set([...currentTags, ...newTags])];
            return { ...bookmark, tags: mergedTags };
          });
          await db.bookmarks.bulkPut(updates);
        }),
        description: `Add tags to ${idsToUpdate.length} bookmarks`
      });

      setSelectedIds(new Set());
    }
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

      // Shortcut: Ctrl+Z to undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !isInput) {
        e.preventDefault()
        undo()
      }

      // Shortcut: Ctrl+Y or Ctrl+Shift+Z to redo
      if (!isInput && ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z'))))) {
        e.preventDefault()
        redo()
      }

      // Shortcut: Escape to clear selection
      if (e.key === 'Escape' && selectedIds.size > 0 && !isInput) {
        e.preventDefault()
        setSelectedIds(new Set())
      }

      // Shortcut: "?" to show keyboard shortcuts
      if (e.key === '?' && !isInput) {
        e.preventDefault()
        setIsShortcutsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, bookmarks, handleBatchDelete, undo, redo])

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
            <Button
              variant={isHistoryOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              title="Version History"
              className={cn("ml-1", isHistoryOpen && "bg-muted")}
            >
              <HistoryIcon className="h-4 w-4" />
            </Button>

            <HistoryPanel
              isOpen={isHistoryOpen}
              onClose={() => setIsHistoryOpen(false)}
              past={past}
              future={future}
              onUndo={undo}
              onRedo={redo}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 flex flex-col relative z-20"
          onBlur={(e) => {
            // Close advanced search when focus leaves the entire search container
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsAdvancedSearchOpen(false);
            }
          }}
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={searchMode === 'regex' ? "e.g. ^https?://.*\\.dev" : "Search bookmarks..."}
                className={cn(
                  "pl-8 pr-8 bg-background/50 focus:bg-background transition-colors h-9 sm:h-10 text-sm",
                  searchMode === 'regex' && "font-mono text-xs"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-muted"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
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

          {cleanableCount > 0 && (
            <Button onClick={cleanAllUrls} variant="outline" size="sm" className="gap-2 hidden sm:flex border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
              <Sparkles className="h-4 w-4" />
              <span className="hidden lg:inline">Clean {cleanableCount} URLs</span>
              <span className="lg:hidden">{cleanableCount}</span>
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
            onClick={() => setIsShortcutsOpen(true)}
            className="rounded-full shrink-0"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
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
          <div
            className="flex items-center justify-between mb-4 flex-shrink-0 cursor-pointer hover:text-primary transition-colors group"
            onClick={() => toggleSection('tags')}
          >
            <h2 className="font-semibold text-lg flex items-center gap-2">
              {collapsedSections.tags ? <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
              <Tag className="h-5 w-5" /> Tags
            </h2>
            {/* Mobile/Tablet Close Button */}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
          </div>

          {!collapsedSections.tags && (
            <div className="mb-6 space-y-1 max-h-[30vh] min-h-[150px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {uniqueTags.length === 0 && <p className="text-sm text-muted-foreground px-2">No tags found.</p>}
              {/* 
                Merge uniqueTags (counts) with availableTags (colors/order). 
                If a tag exists in availableTags, use its color/order. 
                Otherwise default.
            */}
              {/* User Defined Tags */}
              {uniqueTags
                .filter(tag => availableTags.some(t => t.name === tag.name))
                .map(tag => {
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

              {/* Discovered Tags Divider & List */}
              {discoveredTags.length > 0 && (
                <>
                  <div className="px-2 pt-4 pb-2">
                    <div className="border-t border-dashed" />
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mt-2 px-1">Discovered</div>
                  </div>
                  {discoveredTags.map(tag => {
                    const tagInfo = uniqueTags.find(ut => ut.name === tag.name);
                    return (
                      <div key={tag.name} className="flex items-center gap-1 group/item">
                        <button
                          onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
                          className={cn(
                            "flex items-center justify-between flex-1 px-2 py-1.5 text-sm rounded-md transition-colors border border-transparent italic opacity-70",
                            activeTag === tag.name ? "bg-accent text-accent-foreground font-medium border-border" : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                            <span>#{tag.name}</span>
                          </div>
                          <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{tagInfo?.count || 0}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => saveToTaxonomy(tag.name, 'tag')}
                          title="Add to permanent tags"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}

          <div
            className="flex items-center justify-between mb-4 border-t pt-6 flex-shrink-0 cursor-pointer hover:text-primary transition-colors group"
            onClick={() => toggleSection('folders')}
          >
            <h2 className="font-semibold text-lg flex items-center gap-2">
              {collapsedSections.folders ? <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
              <Folder className="h-5 w-5" /> Folders
            </h2>
          </div>

          {!collapsedSections.folders && (
            <div className="mb-6 space-y-1 max-h-[30vh] min-h-[150px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* User Defined Folders */}
              {[...availableFolders].sort((a, b) => (a.order || 0) - (b.order || 0)).map(folder => {
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

              {/* Discovered Folders Divider & List */}
              {discoveredFolders.length > 0 && (
                <>
                  <div className="px-2 pt-4 pb-2">
                    <div className="border-t border-dashed" />
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mt-2 px-1">Discovered</div>
                  </div>
                  {discoveredFolders.map(folder => {
                    const folderInfo = uniqueFolders.find(uf => uf.name === folder.name);
                    return (
                      <div key={folder.name} className="flex items-center gap-1 group/item">
                        <button
                          onClick={() => setActiveFolder(activeFolder === folder.name ? null : folder.name)}
                          className={cn(
                            "flex items-center justify-between flex-1 px-2 py-1.5 text-sm rounded-md transition-colors border border-transparent italic opacity-70",
                            activeFolder === folder.name ? "bg-accent text-accent-foreground font-medium border-border" : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4 text-slate-400" />
                            <span>{folder.name}</span>
                          </div>
                          <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{folderInfo?.count || 0}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => saveToTaxonomy(folder.name, 'folder')}
                          title="Add to permanent folders"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}

          <div
            className="flex items-center justify-between mb-4 border-t pt-6 flex-shrink-0 cursor-pointer hover:text-primary transition-colors group"
            onClick={() => toggleSection('filters')}
          >
            <h2 className="font-semibold text-lg flex items-center gap-2">
              {collapsedSections.filters ? <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
              <Archive className="h-5 w-5" /> Smart Filters
            </h2>
          </div>

          {!collapsedSections.filters && (
            <div className="mb-10 space-y-1 flex-shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
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

              {/* Divider */}
              <div className="my-2 border-t border-dashed" />

              {/* Dead Links */}
              <button
                onClick={() => setSmartFilter(smartFilter === 'dead' ? null : 'dead')}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                  smartFilter === 'dead' ? "bg-gray-200 text-gray-800 font-medium dark:bg-gray-700/50 dark:text-gray-200" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 opacity-70" />
                  <span>Dead Links</span>
                </div>
                <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{deadLinkCount}</span>
              </button>

              {/* Long URLs */}
              <button
                onClick={() => setSmartFilter(smartFilter === 'longurl' ? null : 'longurl')}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                  smartFilter === 'longurl' ? "bg-purple-100 text-purple-700 font-medium dark:bg-purple-900/30 dark:text-purple-400" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 opacity-70" />
                  <span>Long URLs (200+)</span>
                </div>
                <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{smartCounts.longurl}</span>
              </button>

              {/* Media & Videos */}
              <button
                onClick={() => setSmartFilter(smartFilter === 'media' ? null : 'media')}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                  smartFilter === 'media' ? "bg-pink-100 text-pink-700 font-medium dark:bg-pink-900/30 dark:text-pink-400" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 opacity-70" />
                  <span>Media & Videos</span>
                </div>
                <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{smartCounts.media}</span>
              </button>

              {/* Social Media */}
              <button
                onClick={() => setSmartFilter(smartFilter === 'social' ? null : 'social')}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                  smartFilter === 'social' ? "bg-sky-100 text-sky-700 font-medium dark:bg-sky-900/30 dark:text-sky-400" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 opacity-70" />
                  <span>Social Media</span>
                </div>
                <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{smartCounts.social}</span>
              </button>

              {/* Shopping */}
              <button
                onClick={() => setSmartFilter(smartFilter === 'shopping' ? null : 'shopping')}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                  smartFilter === 'shopping' ? "bg-emerald-100 text-emerald-700 font-medium dark:bg-emerald-900/30 dark:text-emerald-400" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 opacity-70" />
                  <span>Shopping</span>
                </div>
                <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{smartCounts.shopping}</span>
              </button>

              {/* News & Articles */}
              <button
                onClick={() => setSmartFilter(smartFilter === 'news' ? null : 'news')}
                className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors",
                  smartFilter === 'news' ? "bg-teal-100 text-teal-700 font-medium dark:bg-teal-900/30 dark:text-teal-400" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4 opacity-70" />
                  <span>News & Articles</span>
                </div>
                <span className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded-full">{smartCounts.news}</span>
              </button>
            </div>
          )}

          <div
            className="flex items-center justify-between mb-6 border-t pt-6 flex-shrink-0 cursor-pointer hover:text-primary transition-colors group"
            onClick={() => toggleSection('rules')}
          >
            <h2 className="font-semibold text-lg flex items-center gap-2">
              {collapsedSections.rules ? <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
              <Settings className="h-5 w-5" />
              Rules
              <span className="text-xs font-normal text-muted-foreground">({rules.length})</span>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditingRuleId(null);
                setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' });
                setIsRuleModalOpen(true);
              }}
              className="h-7 text-xs gap-1"
            >
              <Plus className="h-3 w-3" /> Add Rule
            </Button>
          </div>

          {!collapsedSections.rules && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200 pb-10">
              <div className="space-y-2">
                {rules.length === 0 && (
                  <div className="text-center py-6">
                    <Settings className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No rules defined yet.</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1 text-xs"
                      onClick={() => {
                        setEditingRuleId(null);
                        setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' });
                        setIsRuleModalOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Create your first rule
                    </Button>
                  </div>
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
            </div>
          )}
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
                  Drag and drop your exported Netscape HTML (Recommended), JSON, CSV, or Markdown files to get started.
                </p>
                <Button variant="outline" className="mt-8">Browse Files</Button>
              </div>
            </div>
          ) : displayBookmarks.length === 0 ? (
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
                  // Reset all filters
                  setActiveTag(null)
                  setActiveFolder(null)
                  setSmartFilter(null)
                }}
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-w-[1600px] mx-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Your Bookmarks ({displayBookmarks.length})</h2>
                <div className="flex gap-2">
                  {smartFilter === 'docs' && displayBookmarks.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleBatchMoveDocs}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      Move {displayBookmarks.length} to "References"
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
                        bookmarks={displayBookmarks}
                        selectedIds={selectedIds}
                        toggleSelection={toggleSelection}
                        toggleAll={toggleAll}
                        linkHealth={linkHealth}
                        ignoredUrls={ignoredUrls}
                        toggleIgnoreUrl={toggleIgnoreUrl}
                        availableFolders={availableFolders}
                        availableTags={availableTags}
                      />
                    ) : (
                      <BookmarkGrid
                        bookmarks={displayBookmarks}
                        selectedIds={selectedIds}
                        toggleSelection={toggleSelection}
                        onPreview={handlePreview}
                        showThumbnails={showThumbnails}
                        availableFolders={availableFolders}
                        availableTags={availableTags}
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
          allFolders={availableFolders}
          allTags={availableTags}
          onOverrideStatus={handleStatusOverride}
          onAddTags={handleBatchAddTags}
          onExportSelected={openExportSelectedModal}
          onCleanUrls={cleanSelectedUrls}
        />

        {/* Settings Modal */}
        <SimpleModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title="Settings"
        >
          {settingsTab === 'backup' ? (
            <BackupSettings />
          ) : (
            <TaxonomyManager
              folders={availableFolders}
              setFolders={setAvailableFolders}
              tags={availableTags}
              setTags={setAvailableTags}
              discoveredFolders={discoveredFolders}
              discoveredTags={discoveredTags}
              defaultTab={settingsTab}
            />
          )}

          {/* Navigation Tabs (if not already inside TaxonomyManager, but TaxonomyManager has its own tabs...)
               We should lift the tabs UP to the Modal level or switch logic.
               TaxonomyManager has 'folders' and 'tags' internal state. 
               Let's modify TaxonomyManager to accept activeTab prop or 
               just render headers here. 
               
               Actually, TaxonomyManager renders its own tabs. 
               We should probably just have a top-level switcher.
           */}
          <div className="flex justify-center gap-2 mt-4 border-t pt-2">
            <Button
              variant={settingsTab !== 'backup' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('folders')}
              className="text-xs h-7"
            >
              Taxonomy
            </Button>
            <Button
              variant={settingsTab === 'backup' ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSettingsTab('backup')}
              className="text-xs h-7"
            >
              Backup & Data
            </Button>
          </div>
        </SimpleModal>

        {/* Clear All Confirmation Modal */}
        <SimpleModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          title="⚠ Warning: Clear All Data"
        >
          <div className="space-y-4">
            <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">
                This will delete <strong>ALL</strong> Bookmarks, Rules, Custom Folders, Tags, and Settings.
                <br /><br />
                This action cannot be undone unless you have a backup.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowBackupModal(false)}>
                Cancel
              </Button>
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <Button
                    variant="default"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => confirmClearAll(true)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Backup & Clear
                  </Button>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => confirmClearAll(false)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Everything
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SimpleModal>
        {/* Keyboard Shortcuts Modal */}
        <SimpleModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          title="Keyboard Shortcuts"
        >
          <div className="space-y-1">
            {[
              { keys: '/', desc: 'Focus search' },
              { keys: 'Ctrl + A', desc: 'Select all visible' },
              { keys: 'Delete', desc: 'Delete selected' },
              { keys: 'Escape', desc: 'Clear selection' },
              { keys: 'Ctrl + Z', desc: 'Undo' },
              { keys: 'Ctrl + Y', desc: 'Redo' },
              { keys: 'Ctrl + Shift + Z', desc: 'Redo (alt)' },
              { keys: '?', desc: 'Show this help' },
            ].map(s => (
              <div key={s.keys} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-sm text-foreground">{s.desc}</span>
                <div className="flex gap-1">
                  {s.keys.split(' + ').map((k, i) => (
                    <span key={i}>
                      <kbd className="px-2 py-1 text-xs font-mono font-semibold bg-muted border rounded-md shadow-sm">{k}</kbd>
                      {i < s.keys.split(' + ').length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SimpleModal>

        {/* Export Modal */}
        <SimpleModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title={exportOnlySelected ? `Export ${selectedIds.size} Selected Bookmarks` : 'Export Bookmarks'}
        >
          <div className="space-y-4">
            {exportOnlySelected && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                <Download className="h-4 w-4 text-primary shrink-0" />
                <span><strong>{selectedIds.size}</strong> bookmark selected for export.</span>
              </div>
            )}
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

        {/* Rule Create/Edit Modal */}
        <SimpleModal
          isOpen={isRuleModalOpen}
          onClose={cancelEditing}
          title={editingRuleId ? 'Edit Rule' : 'New Rule'}
        >
          <div className="space-y-4">
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
                options={[
                  { label: "User Defined", options: availableFolders.map(f => f.name) },
                  { label: "Suggested (Discovered)", options: discoveredFolders.map(f => f.name) }
                ]}
                value={newRule.targetFolder}
                onChange={(val) => {
                  setNewRule({ ...newRule, targetFolder: val })
                  if (val && !availableFolders.some(f => f.name === val)) {
                    saveToTaxonomy(val, 'folder');
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

            <div className="flex gap-2 pt-2">
              <Button onClick={addRule} className="flex-1" size="sm">
                {editingRuleId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {editingRuleId ? 'Update Rule' : 'Add Rule'}
              </Button>
              <Button onClick={cancelEditing} variant="outline" size="sm" className="px-4">
                Cancel
              </Button>
            </div>
          </div>
        </SimpleModal>
      </div >
    </div >
  )
}

export default App
