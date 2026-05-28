import { Copy, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ZoomControls } from '@/components/ZoomControls';
import { AIAssistantDropdown } from '@/components/ai/AIAssistantDropdown';
import type { PythonEditorTheme } from '@/lib/storage';

interface Props {
  fontSize: number;
  onFontSizeChange: (v: number) => void;
  onUndo: () => void;
  onCopy: () => void;
  onSaveSnippet: () => void;
  onClear: () => void;
  pythonEditorTheme: PythonEditorTheme;
  onPythonEditorThemeChange: (t: PythonEditorTheme) => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  code: string;
  onAiApply: (code: string) => void;
}

const THEMES: { id: PythonEditorTheme; label: string }[] = [
  { id: 'default', label: 'Python' },
  { id: 'soft', label: 'Soft' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'nord', label: 'Nord' },
  { id: 'monokai', label: 'Monokai' },
  { id: 'tokyo', label: 'Tokyo' },
  { id: 'soft-dark', label: 'Soft Dark' },
];

function IconBtn({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            active
              ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function VDivider() {
  return <span className="mx-0.5 h-4 w-px bg-border" />;
}

export function PythonEditorToolbar({
  fontSize,
  onFontSizeChange,
  onUndo,
  onCopy,
  onSaveSnippet,
  onClear,
  pythonEditorTheme,
  onPythonEditorThemeChange,
  searchOpen,
  onToggleSearch,
  code,
  onAiApply,
}: Props) {
  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-surface px-2 gap-1">
        {/* Left actions */}
        <div className="flex items-center gap-0.5">
          <IconBtn label="Desfazer (Ctrl+Z)" onClick={onUndo}>
            <RotateCcw className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="Copiar código" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="Salvar rascunho (Ctrl+S)" onClick={onSaveSnippet}>
            <Save className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn label="Limpar editor (Ctrl+L)" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
          <VDivider />
          <IconBtn label="Buscar & Substituir (Ctrl+F)" onClick={onToggleSearch} active={searchOpen}>
            <Search className="h-3.5 w-3.5" />
          </IconBtn>
          <VDivider />
          <AIAssistantDropdown code={code} onApply={onAiApply} />
        </div>

        {/* Right: zoom + theme */}
        <div className="flex items-center gap-1.5">
          <ZoomControls value={fontSize} onChange={onFontSizeChange} />
          <VDivider />
          {/* Theme picker */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                    {THEMES.find((t) => t.id === pythonEditorTheme)?.label ?? 'Tema'}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Tema do editor</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-36">
              {THEMES.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() => onPythonEditorThemeChange(t.id)}
                  className={`text-xs ${pythonEditorTheme === t.id ? 'font-semibold text-primary' : ''}`}
                >
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
