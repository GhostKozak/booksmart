import { useState, useMemo, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Sun, Moon, Upload, Download, Plus, Trash2, Folder, File, ArrowRight, Settings, Check, AlertCircle, Layers, XCircle, Activity, Loader2, CheckCircle2, HelpCircle, BarChart3, List } from 'lucide-react'
import { useTheme } from './hooks/use-theme'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Input } from './components/ui/input'
import { parseBookmarks } from './lib/parser'
import { exportBookmarks } from './lib/exporter'
import { Favicon } from './components/Favicon'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import { cn } from './lib/utils'

function App() {
  const { theme, setTheme } = useTheme()
  const [rawBookmarks, setRawBookmarks] = useState([]) // Stores the initial parsed bookmarks
  const [rules, setRules] = useState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'analytics'

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

  // Rule State
  const [newRule, setNewRule] = useState({
    type: 'keyword', // keyword, domain, exact
    value: '',
    targetFolder: '',
    tags: ''
  })

  // Derived state: Apply rules and sort
  const bookmarks = useMemo(() => {
    if (rawBookmarks.length === 0) return [];

    // 1. First pass: Map URLs to find all duplicates
    const urlMap = new Map();
    rawBookmarks.forEach(b => {
      const u = b.url;
      if (!urlMap.has(u)) {
        urlMap.set(u, []);
      }
      urlMap.get(u).push({ id: b.id, folder: b.originalFolder });
    });

    const processed = rawBookmarks.map(b => {
      let matchedRule = null;
      let newFolder = b.originalFolder;
      let tags = [];

      // Check duplicate status
      const siblings = urlMap.get(b.url);
      const isMulti = siblings.length > 1;
      const indexInSiblings = siblings.findIndex(s => s.id === b.id);
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
        const ruleValue = (rule.value || '').toLowerCase();

        if (!ruleValue) continue;

        if (rule.type === 'keyword' && contentToCheck.includes(ruleValue)) {
          match = true;
        } else if (rule.type === 'domain' && url.toLowerCase().includes(ruleValue)) {
          match = true;
        } else if (rule.type === 'exact' && title.toLowerCase() === ruleValue) {
          match = true;
        }

        if (match) {
          matchedRule = rule;
          // Only update folder if targetFolder is set
          if (rule.targetFolder) {
            newFolder = rule.targetFolder;
          }
          // specific checking if tags exist
          if (rule.tags) {
            tags = rule.tags.split(',').map(t => t.trim()).filter(Boolean);
          }
          break; // First match wins
        }
      }

      return {
        ...b,
        newFolder: matchedRule ? newFolder : b.originalFolder,
        tags: tags,
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
  }, [rawBookmarks, rules]);

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
    const seen = new Set();
    const unique = rawBookmarks.filter(b => {
      if (seen.has(b.url)) return false;
      seen.add(b.url);
      return true;
    });
    setRawBookmarks(unique);
  };

  // File Upload
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target.result
        const parsed = parseBookmarks(text)
        setRawBookmarks(parsed)
      }
      reader.readAsText(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/html': ['.html'] }
  })

  // Export
  const handleExport = () => {
    const html = exportBookmarks(bookmarks)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bookmarks_organized.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Manage Rules
  const addRule = () => {
    if (newRule.value && (newRule.targetFolder || newRule.tags)) {
      setRules([...rules, { ...newRule, id: crypto.randomUUID() }])
      setNewRule({ type: 'keyword', value: '', targetFolder: '', tags: '' })
    }
  }

  const deleteRule = (id) => {
    setRules(rules.filter(r => r.id !== id))
  }

  const clearAll = () => {
    setRawBookmarks([])
    setRules([])
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="border-b h-16 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Folder className="h-6 w-6 text-primary" />
          <h1 className="font-bold text-xl tracking-tight">BookSmart</h1>
        </div>

        <div className="flex items-center gap-4">
          {duplicateCount > 0 && (
            <Button onClick={removeDuplicates} variant="destructive" size="sm" className="gap-2">
              <Layers className="h-4 w-4" />
              Remove {duplicateCount} Duplicates
            </Button>
          )}

          {bookmarks.length > 0 && (
            <div className="flex gap-2">
              <div className="flex bg-muted/50 p-1 rounded-lg border mr-2">
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
                  variant={viewMode === 'analytics' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('analytics')}
                  title="Analytics"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={checkAllLinks} disabled={isCheckingLinks} variant="outline" className="gap-2">
                {isCheckingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                {isCheckingLinks ? 'Checking...' : 'Check Health'}
              </Button>
              <Button onClick={handleExport} variant="default" className="gap-2 shadow-lg shadow-primary/20">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "border-r bg-card/30 flex-col overflow-y-auto transition-all duration-300 ease-in-out",
            isSidebarOpen ? "w-80 p-4" : "w-0 p-0 overflow-hidden"
          )}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Rules
            </h2>
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
              <Input
                placeholder="e.g. Work > Dev"
                value={newRule.targetFolder}
                onChange={(e) => setNewRule({ ...newRule, targetFolder: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tags (Comma separated)</label>
              <Input
                placeholder="e.g. news, tech, read-later"
                value={newRule.tags}
                onChange={(e) => setNewRule({ ...newRule, tags: e.target.value })}
              />
            </div>

            <Button onClick={addRule} className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Add Rule
            </Button>
          </Card>

          <div className="space-y-2">
            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No rules defined.</p>
            )}
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-3 rounded-md bg-accent/50 hover:bg-accent border group">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-muted-foreground uppercase">{rule.type}</span>
                  <div className="flex items-center gap-1 text-sm truncate">
                    <span className="truncate">"{rule.value}"</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex gap-2 items-center truncate">
                      {rule.targetFolder && <span className="font-medium text-primary truncate">{rule.targetFolder}</span>}
                      {rule.tags && <span className="text-xs bg-muted px-1 rounded truncate max-w-[80px]">🏷️{rule.tags}</span>}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-secondary/10 p-6 relative">

          {bookmarks.length === 0 ? (
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
                  Drag and drop your exported Netscape HTML bookmark file to get started.
                </p>
                <Button variant="outline" className="mt-8">Browse Files</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Your Bookmarks ({bookmarks.length})</h2>
                <Button variant="ghost" onClick={clearAll} className="text-muted-foreground">
                  Clear All
                </Button>
              </div>

              {viewMode === 'analytics' ? (
                <AnalyticsDashboard bookmarks={bookmarks} linkHealth={linkHealth} />
              ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">Status</th>
                          <th className="px-4 py-3 w-12 text-center">Health</th>
                          <th className="px-4 py-3 max-w-[300px]">Title / URL</th>
                          <th className="px-4 py-3">Original Folder</th>
                          <th className="px-4 py-3">New Folder</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bookmarks.map(bookmark => (
                          <tr key={bookmark.id} className={cn(
                            "transition-colors duration-200",
                            bookmark.isDuplicate
                              ? "bg-red-500/10 hover:bg-red-500/20 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                              : bookmark.hasDuplicate
                                ? "bg-yellow-500/10 hover:bg-yellow-500/20 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30"
                                : bookmark.status === 'matched'
                                  ? "bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30"
                                  : "hover:bg-muted/30"
                          )}>
                            <td className="px-4 py-3 text-center">
                              {bookmark.isDuplicate ? (
                                <div className="flex justify-center" title="Duplicate (Will be removed)">
                                  <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                                    <XCircle className="h-3.5 w-3.5" />
                                  </div>
                                </div>
                              ) : bookmark.hasDuplicate ? (
                                <div className="flex justify-center" title="Original (Has duplicates)">
                                  <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                                    <Layers className="h-3.5 w-3.5" />
                                  </div>
                                </div>
                              ) : bookmark.status === 'matched' ? (
                                <div className="flex justify-center">
                                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {linkHealth[bookmark.url] === 'checking' ? (
                                <div className="flex justify-center" title="Checking...">
                                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                </div>
                              ) : linkHealth[bookmark.url] === 'alive' ? (
                                <div className="flex justify-center" title="Alive">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                </div>
                              ) : linkHealth[bookmark.url] === 'dead' ? (
                                <div className="flex justify-center" title="Network Error (Likely Dead)">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </div>
                              ) : (
                                <div className="flex justify-center" title="Unknown">
                                  <HelpCircle className="h-4 w-4 text-muted-foreground/30" />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-[300px]">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Favicon url={bookmark.url} className="w-4 h-4 flex-shrink-0" />
                                  <span className={cn(
                                    "font-medium truncate",
                                    bookmark.status === 'matched' && "text-emerald-700 dark:text-emerald-300"
                                  )} title={bookmark.title}>{bookmark.title}</span>
                                </div>
                                <span className="text-xs text-muted-foreground truncate" title={bookmark.url}>{bookmark.url}</span>
                                {bookmark.tags && bookmark.tags.length > 0 && (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {bookmark.tags.map(tag => (
                                      <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {(bookmark.isDuplicate || bookmark.hasDuplicate) && bookmark.otherLocations.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                    <Layers className="h-3 w-3" />
                                    <span>Duplicate in: {bookmark.otherLocations.join(', ')}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground border">
                                {bookmark.originalFolder}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "inline-flex items-center px-2 py-1 rounded-md text-xs border font-medium",
                                bookmark.status === 'matched'
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                                  : "bg-muted text-muted-foreground border-transparent"
                              )}>
                                {bookmark.newFolder}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
