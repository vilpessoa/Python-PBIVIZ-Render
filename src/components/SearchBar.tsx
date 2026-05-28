import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  CaseSensitive,
  Regex,
  X,
  ArrowDown,
  ArrowUp,
  Replace,
  ReplaceAll,
} from 'lucide-react';
import {
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  getSearchQuery,
} from '@codemirror/search';
import type { PythonEditorHandle } from '@/components/PythonEditor';

interface Props {
  editorRef: React.RefObject<PythonEditorHandle | null>;
  onClose: () => void;
}

function countMatches(view: import('@codemirror/view').EditorView, query: SearchQuery): number {
  if (!query.valid) return 0;
  let count = 0;
  const cursor = query.getCursor(view.state.doc) as { next: () => { done: boolean; value: { from: number; to: number } } };
  let res = cursor.next();
  while (!res.done) { count++; res = cursor.next(); }
  return count;
}

function getCurrentMatchIndex(view: import('@codemirror/view').EditorView, query: SearchQuery): number {
  if (!query.valid) return -1;
  const sel = view.state.selection.main;
  let idx = 0;
  const cursor = query.getCursor(view.state.doc) as { next: () => { done: boolean; value: { from: number; to: number } } };
  let res = cursor.next();
  while (!res.done) {
    if (res.value.from === sel.from && res.value.to === sel.to) return idx;
    idx++;
    res = cursor.next();
  }
  return -1;
}

export function SearchBar({ editorRef, onClose }: Props) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(-1);
  const [regexError, setRegexError] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const view = editorRef.current?.getView?.();
    if (!view) return;
    if (!searchText) {
      setMatchCount(0);
      setCurrentMatch(-1);
      setRegexError(false);
      return;
    }
    let query: SearchQuery;
    try {
      query = new SearchQuery({ search: searchText, caseSensitive, regexp: useRegex });
      setRegexError(false);
    } catch {
      setRegexError(true);
      return;
    }
    view.dispatch({ effects: setSearchQuery.of(query) });
    const count = countMatches(view, query);
    setMatchCount(count);
    setCurrentMatch(count > 0 ? getCurrentMatchIndex(view, query) : -1);
  }, [searchText, caseSensitive, useRegex, editorRef]);

  function doFindNext() {
    const view = editorRef.current?.getView?.();
    if (!view || !searchText) return;
    try {
      const query = new SearchQuery({ search: searchText, caseSensitive, regexp: useRegex });
      view.dispatch({ effects: setSearchQuery.of(query) });
      findNext(view);
      setCurrentMatch(getCurrentMatchIndex(view, getSearchQuery(view.state)));
    } catch { /* ignore */ }
  }

  function doFindPrev() {
    const view = editorRef.current?.getView?.();
    if (!view || !searchText) return;
    try {
      const query = new SearchQuery({ search: searchText, caseSensitive, regexp: useRegex });
      view.dispatch({ effects: setSearchQuery.of(query) });
      findPrevious(view);
      setCurrentMatch(getCurrentMatchIndex(view, getSearchQuery(view.state)));
    } catch { /* ignore */ }
  }

  function doReplaceNext() {
    const view = editorRef.current?.getView?.();
    if (!view || !searchText) return;
    try {
      const query = new SearchQuery({ search: searchText, replace: replaceText, caseSensitive, regexp: useRegex });
      view.dispatch({ effects: setSearchQuery.of(query) });
      replaceNext(view);
      const count = countMatches(view, query);
      setMatchCount(count);
      setCurrentMatch(count > 0 ? getCurrentMatchIndex(view, query) : -1);
    } catch { /* ignore */ }
  }

  function doReplaceAll() {
    const view = editorRef.current?.getView?.();
    if (!view || !searchText) return;
    try {
      const query = new SearchQuery({ search: searchText, replace: replaceText, caseSensitive, regexp: useRegex });
      view.dispatch({ effects: setSearchQuery.of(query) });
      replaceAll(view);
      setMatchCount(0);
      setCurrentMatch(-1);
    } catch { /* ignore */ }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) doFindPrev(); else doFindNext();
    }
  }

  const btnBase = 'flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40';
  const toggleActive = (active: boolean) =>
    `${btnBase} ${active ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : ''}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="border-b border-border bg-surface px-3 py-2 flex flex-col gap-1.5"
    >
      {/* Search row */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowReplace((v) => !v)}
          className={btnBase}
          aria-label="Mostrar substituição"
        >
          {showReplace ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        <div className={`flex flex-1 items-center rounded border ${regexError ? 'border-destructive' : 'border-border'} bg-background focus-within:ring-1 focus-within:ring-ring overflow-hidden`}>
          <input
            ref={searchRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar…"
            spellCheck={false}
            className="flex-1 bg-transparent px-2 py-1 text-xs outline-none"
          />
          <button type="button" onClick={() => setCaseSensitive((v) => !v)} className={toggleActive(caseSensitive)} aria-label="Sensível a maiúsculas">
            <CaseSensitive className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setUseRegex((v) => !v)} className={toggleActive(useRegex)} aria-label="Expressão regular">
            <Regex className="h-3.5 w-3.5" />
          </button>
          {searchText && (
            <button type="button" onClick={() => setSearchText('')} className={btnBase} aria-label="Limpar busca">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {matchCount > 0 && (
          <span className="tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
            {currentMatch >= 0 ? `${currentMatch + 1}/` : ''}{matchCount}
          </span>
        )}
        {matchCount === 0 && searchText && !regexError && (
          <span className="text-[11px] text-destructive whitespace-nowrap">0 resultados</span>
        )}

        <button type="button" onClick={doFindPrev} disabled={matchCount === 0} className={btnBase} aria-label="Anterior">
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={doFindNext} disabled={matchCount === 0} className={btnBase} aria-label="Próximo">
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onClose} className={btnBase} aria-label="Fechar busca">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-1.5 pl-7">
          <div className="flex flex-1 items-center rounded border border-border bg-background focus-within:ring-1 focus-within:ring-ring overflow-hidden">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Substituir por…"
              spellCheck={false}
              className="flex-1 bg-transparent px-2 py-1 text-xs outline-none"
            />
          </div>
          <button type="button" onClick={doReplaceNext} disabled={!searchText} className={btnBase} aria-label="Substituir próximo">
            <Replace className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={doReplaceAll} disabled={!searchText} className={btnBase} aria-label="Substituir todos">
            <ReplaceAll className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
