import { useEffect, useRef, useState, type RefObject } from 'react';
import { EditorView } from '@codemirror/view';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronUp, ChevronDown, ChevronRight, CaseSensitive, Regex } from 'lucide-react';
import {
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  replaceAll,
  openSearchPanel,
  closeSearchPanel,
} from '@codemirror/search';
import { cn } from '@/lib/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PythonEditorHandle } from '@/components/PythonEditor';

interface SearchBarProps {
  editorRef: RefObject<PythonEditorHandle | null>;
  onClose: () => void;
}

function countMatches(view: EditorView | undefined, query: SearchQuery): number {
  if (!view || !query.search) return 0;
  try {
    const cursor = query.getCursor(view.state.doc);
    let count = 0;
    while (!cursor.next().done) count++;
    return count;
  } catch {
    return 0;
  }
}

function getCurrentMatchIndex(view: EditorView | undefined, query: SearchQuery): number {
  if (!view || !query.search) return 0;
  try {
    const cursorPos = view.state.selection.main.from;
    const cursor = query.getCursor(view.state.doc);
    let index = 0;
    let result = cursor.next();
    while (!result.done) {
      if (result.value.from >= cursorPos) return index;
      index++;
      result = cursor.next();
    }
    return 0;
  } catch {
    return 0;
  }
}

export function SearchBar({ editorRef, onClose }: SearchBarProps) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [regexError, setRegexError] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const view = editorRef.current?.getView?.();
    if (view) openSearchPanel(view);
    setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
    return () => {
      const v = editorRef.current?.getView?.();
      if (v) closeSearchPanel(v);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildQuery(search: string): SearchQuery | null {
    if (useRegex) {
      try { new RegExp(search); setRegexError(false); }
      catch { setRegexError(true); return null; }
    } else {
      setRegexError(false);
    }
    return new SearchQuery({ search, caseSensitive, regexp: useRegex, replace: replaceText });
  }

  function applyQuery(search: string) {
    const view = editorRef.current?.getView?.();
    if (!view) return;
    const q = buildQuery(search);
    if (!q) { setMatchCount(0); setCurrentMatchIndex(0); return; }
    view.dispatch({ effects: setSearchQuery.of(q) });
    const count = countMatches(view, q);
    setMatchCount(count);

    if (count > 0) {
      const cursor = q.getCursor(view.state.doc);
      const result = cursor.next();
      if (!result.done) {
        const { from, to } = result.value;
        view.dispatch({
          selection: { anchor: from, head: to },
          effects: EditorView.scrollIntoView(from),
        });
        setCurrentMatchIndex(0);
      }
    } else {
      setCurrentMatchIndex(0);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText) {
        applyQuery(searchText);
      } else {
        setMatchCount(0);
        setCurrentMatchIndex(0);
      }
    }, 150);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, caseSensitive, useRegex]);

  function handleFindNext() {
    const view = editorRef.current?.getView?.();
    if (!view || !searchText) return;
    findNext(view);
    const q = buildQuery(searchText);
    if (q) setTimeout(() => setCurrentMatchIndex(getCurrentMatchIndex(view, q)), 0);
  }

  function handleFindPrev() {
    const view = editorRef.current?.getView?.();
    if (!view || !searchText) return;
    findPrevious(view);
    const q = buildQuery(searchText);
    if (q) setTimeout(() => setCurrentMatchIndex(getCurrentMatchIndex(view, q)), 0);
  }

  function handleReplaceAll() {
    const view = editorRef.current?.getView?.();
    if (!view || !searchText) return;
    const q = buildQuery(searchText);
    if (!q) return;
    const full = new SearchQuery({ search: searchText, caseSensitive, regexp: useRegex, replace: replaceText });
    view.dispatch({ effects: setSearchQuery.of(full) });
    replaceAll(view);
    setMatchCount(0);
  }

  function handleReplaceOne() {
    const view = editorRef.current?.getView?.();
    if (!view || !searchText) return;
    const full = new SearchQuery({ search: searchText, caseSensitive, regexp: useRegex, replace: replaceText });
    view.dispatch({ effects: setSearchQuery.of(full) });
    const { from, to } = view.state.selection.main;
    const selected = view.state.doc.sliceString(from, to);
    try {
      const q = new SearchQuery({ search: searchText, caseSensitive, regexp: useRegex, replace: replaceText });
      const cursor = q.getCursor(view.state.doc, from, to);
      if (!cursor.next().done) {
        const replacement = useRegex
          ? selected.replace(new RegExp(searchText, caseSensitive ? '' : 'i'), replaceText)
          : replaceText;
        view.dispatch({ changes: { from, to, insert: replacement } });
        findNext(view);
        applyQuery(searchText);
      } else {
        findNext(view);
      }
    } catch { /* ignore */ }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) handleFindPrev();
      else handleFindNext();
    }
  }

  function handleClose() {
    const view = editorRef.current?.getView?.();
    if (view) {
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
      view.focus();
    }
    onClose();
  }

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15 }}
        className="flex-shrink-0 border-b border-border bg-input/15 px-3 py-2"
      >
        {/* Search row */}
        <div className="flex items-center gap-1.5">

          {/* Expand replace toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setShowReplace((v) => !v)}
                className={cn(
                  'group inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border transition-all',
                  showReplace
                    ? 'border-primary/60 bg-primary/25 text-primary drop-shadow-sm'
                    : 'border-border/50 bg-input/40 text-foreground/60 drop-shadow-sm hover:bg-surface-elevated/50 hover:text-primary',
                )}
              >
                <ChevronRight
                  className={cn('h-3.5 w-3.5 transition-transform duration-150 group-hover:scale-110', showReplace && 'rotate-90')}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="px-2 py-1 text-xs">
              {showReplace ? 'Ocultar substituição' : 'Mostrar substituição'}
            </TooltipContent>
          </Tooltip>

          {/* Search input */}
          <div className={cn(
            'relative flex h-7 flex-1 items-center rounded border bg-input/60 px-2',
            regexError ? 'border-destructive' : 'border-border/60 focus-within:border-primary/60',
          )}>
            <Search className="mr-1.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={useRegex ? 'Localizar  ex: var\\s+\\w+' : 'Localizar'}
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
            />
            {searchText && (
              <>
                <span className={cn(
                  'ml-1 flex-shrink-0 whitespace-nowrap text-[10px] tabular-nums',
                  matchCount > 0 ? 'text-muted-foreground' : 'text-destructive/70',
                )}>
                  {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : 'Nenhum resultado'}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Limpar pesquisa"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </div>

          {/* Nav: Previous */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleFindPrev}
                className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="px-2 py-1 text-xs">
              Anterior <kbd className="ml-1 rounded bg-background/20 px-1 font-mono text-[10px]">⇧ Enter</kbd>
            </TooltipContent>
          </Tooltip>

          {/* Nav: Next */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleFindNext}
                className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="px-2 py-1 text-xs">
              Próximo <kbd className="ml-1 rounded bg-background/20 px-1 font-mono text-[10px]">Enter</kbd>
            </TooltipContent>
          </Tooltip>

          <span className="mx-0.5 inline-block h-3 w-px flex-shrink-0 rounded-full bg-border opacity-60" />

          {/* Case sensitive */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setCaseSensitive((v) => !v)}
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded transition-colors',
                  caseSensitive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <CaseSensitive className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="px-2 py-1 text-xs">
              Diferenciar maiúsculas/minúsculas
            </TooltipContent>
          </Tooltip>

          {/* Regex */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setUseRegex((v) => !v)}
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded transition-colors',
                  useRegex
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Regex className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px] px-2 py-1.5 text-xs">
              <div>Usar expressão regular</div>
              <div className="mt-0.5 font-mono text-[10px] opacity-70">ex: var\s+\w+</div>
            </TooltipContent>
          </Tooltip>

          <span className="mx-0.5 inline-block h-3 w-px flex-shrink-0 rounded-full bg-border opacity-60" />

          {/* Close */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="px-2 py-1 text-xs">
              Fechar <kbd className="ml-1 rounded bg-background/20 px-1 font-mono text-[10px]">Esc</kbd>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Replace row */}
        <AnimatePresence>
          {showReplace && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-1.5 flex items-center gap-1.5 overflow-hidden"
            >
              {/* Spacer to align with search input */}
              <span className="h-6 w-6 flex-shrink-0" />

              <div className="flex h-7 flex-1 items-center rounded border border-border/60 bg-input/60 px-2 focus-within:border-primary/60">
                <input
                  ref={replaceInputRef}
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
                  placeholder="Substituir"
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                />
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleReplaceOne}
                    disabled={!searchText}
                    className="inline-flex h-6 items-center gap-1 rounded border border-border/50 bg-background/60 px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-40"
                  >
                    Substituir
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="px-2 py-1 text-xs">
                  Substituir próximo
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleReplaceAll}
                    disabled={!searchText}
                    className="inline-flex h-6 items-center gap-1 rounded border border-border/50 bg-background/60 px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-40"
                  >
                    Sub. Todos
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="px-2 py-1 text-xs">
                  Substituir todas as ocorrências
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
}
