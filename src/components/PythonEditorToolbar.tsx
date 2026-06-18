import { Check, Copy, Moon, Palette, PanelRightClose, PanelRightOpen, RotateCcw, Save, Search, Trash2, Minus, Plus, Upload } from 'lucide-react';
import { useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { TessChatButton } from '@/components/ai/tess/TessChatButton';
import { TESS_ENABLED } from '@/lib/tessConfig';
import { ZOOM_MIN, ZOOM_MAX } from '@/components/ZoomControls';
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
  tessChatOpen: boolean;
  onToggleTessChat: () => void;
  onFileLoad: (code: string) => void;
  editorExpanded?: boolean;
  onToggleExpand?: () => void;
}

const THEMES: { id: PythonEditorTheme; label: string; dot1: string; dot2: string }[] = [
  { id: 'github',      label: 'GitHub',      dot1: '#ff7b72', dot2: '#a5d6ff' },
  { id: 'catppuccin',  label: 'Catppuccin',  dot1: '#cba6f7', dot2: '#a6e3a1' },
  { id: 'rose-pine',   label: 'Rosé Pine',   dot1: '#eb6f92', dot2: '#9ccfd8' },
  { id: 'dracula',     label: 'Dracula',     dot1: '#ff79c6', dot2: '#f1fa8c' },
  { id: 'tokyo',       label: 'Tokyo Night', dot1: '#bb9af7', dot2: '#9ece6a' },
  { id: 'one-pro',     label: 'One Pro',     dot1: '#c678dd', dot2: '#98c379' },
  { id: 'nord',        label: 'Nord',        dot1: '#81a1c1', dot2: '#a3be8c' },
  { id: 'ayu',         label: 'Ayu',         dot1: '#ff7733', dot2: '#b8cc52' },
  { id: 'gruvbox',     label: 'Gruvbox',     dot1: '#fb4934', dot2: '#fabd2f' },
];

const ALWAYS_DARK_THEMES: { id: PythonEditorTheme; label: string; dot1: string; dot2: string }[] = [
  { id: 'moonlight',   label: 'Moonlight',   dot1: '#c099ff', dot2: '#c3e88d' },
  { id: 'kanagawa',    label: 'Kanagawa',    dot1: '#957fb8', dot2: '#98bb6c' },
  { id: 'poimandres',  label: 'Poimandres',  dot1: '#5de4c7', dot2: '#f087bd' },
];

function VDivider() {
  return (
    <span
      aria-hidden
      className="mx-0.5 inline-block h-3 w-px shrink-0 rounded-full bg-border opacity-60"
    />
  );
}

function IconButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  active = false,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onClick}
          disabled={disabled}
          variant="outline"
          size="icon"
          className={cn(
            'h-8 w-8 rounded-full border border-border/50 active:scale-95 transition-all active:duration-100',
            active
              ? 'bg-primary/15 text-primary border-primary/40 hover:bg-primary/20'
              : 'hover:bg-accent',
          )}
          aria-label={label}
          aria-pressed={active}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="px-2 py-1 text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
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
  tessChatOpen,
  onToggleTessChat,
  onFileLoad,
  editorExpanded = false,
  onToggleExpand,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clampZoom = (v: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(onFileLoad);
    e.target.value = '';
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        {/* Left actions */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.txt"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Abrir arquivo Python"
          />
          <IconButton icon={Upload}    label="Abrir arquivo .py"            tooltip="Abrir arquivo"    onClick={() => fileInputRef.current?.click()} />

          <VDivider />

          <IconButton icon={Trash2}    label="Limpar editor (Ctrl+L)"      tooltip="Limpar"           onClick={onClear} />
          <IconButton icon={RotateCcw} label="Desfazer (Ctrl+Z)"           tooltip="Desfazer"         onClick={onUndo} />

          <VDivider />

          <IconButton icon={Copy}      label="Copiar código"                tooltip="Copiar código"    onClick={onCopy} />
          <IconButton icon={Save}      label="Salvar rascunho (Ctrl+S)"     tooltip="Salvar rascunho"  onClick={onSaveSnippet} />

          <VDivider />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleSearch}
                variant="outline"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-full border border-border/50 active:scale-95 transition-all active:duration-100',
                  searchOpen
                    ? 'bg-primary/15 text-primary border-primary/40 hover:bg-primary/20'
                    : 'hover:bg-accent',
                )}
                aria-label="Buscar & Substituir (Ctrl+F)"
                aria-pressed={searchOpen}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="px-2 py-1 text-xs">
              Buscar & Substituir
            </TooltipContent>
          </Tooltip>

          {TESS_ENABLED && (
            <>
              <VDivider />
              <TessChatButton open={tessChatOpen} onToggle={onToggleTessChat} />
            </>
          )}
        </div>

        {/* Right: zoom + theme */}
        <div className="flex items-center gap-2">
          {/* Zoom pill */}
          <div className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-background/40 px-2 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={() => onFontSizeChange(clampZoom(fontSize - 1))}
                  disabled={fontSize <= ZOOM_MIN}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full active:scale-95 transition-transform active:duration-100"
                  aria-label="Diminuir fonte"
                >
                  <Minus className="h-2.5 w-2.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="px-2 py-1 text-xs">Diminuir fonte</TooltipContent>
            </Tooltip>

            <span className="mx-0.5 text-[10px] font-medium tabular-nums text-muted-foreground dark:text-foreground/60">
              {fontSize}px
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={() => onFontSizeChange(clampZoom(fontSize + 1))}
                  disabled={fontSize >= ZOOM_MAX}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full active:scale-95 transition-transform active:duration-100"
                  aria-label="Aumentar fonte"
                >
                  <Plus className="h-2.5 w-2.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="px-2 py-1 text-xs">Aumentar fonte</TooltipContent>
            </Tooltip>
          </div>

          {/* Expand/collapse editor */}
          {onToggleExpand && (
            <IconButton
              icon={editorExpanded ? PanelRightOpen : PanelRightClose}
              label={editorExpanded ? 'Restaurar painel (Ctrl+M)' : 'Ocultar preview (Ctrl+M)'}
              tooltip={editorExpanded ? 'Restaurar preview' : 'Ocultar preview'}
              onClick={onToggleExpand}
              active={editorExpanded}
            />
          )}

          {/* Theme picker */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DM.Trigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border border-border/50 hover:bg-accent active:scale-95 transition-transform active:duration-100"
                    aria-label="Tema do editor"
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </Button>
                </DM.Trigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="px-2 py-1 text-xs">
                Tema do editor
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              <DropdownMenuLabel>Tema do Editor</DropdownMenuLabel>
              {THEMES.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() => onPythonEditorThemeChange(t.id)}
                  className="gap-2"
                >
                  <span className="relative shrink-0 w-5 h-3">
                    <span
                      className="absolute left-0 top-0 h-3 w-3 rounded-full border border-background/40"
                      style={{ backgroundColor: t.dot1 }}
                    />
                    <span
                      className="absolute left-2 top-0 h-3 w-3 rounded-full border border-background/40"
                      style={{ backgroundColor: t.dot2 }}
                    />
                  </span>
                  <span className="flex-1">{t.label}</span>
                  {pythonEditorTheme === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 font-normal">
                <Moon className="h-3 w-3" />
                Sempre Dark
              </DropdownMenuLabel>
              {ALWAYS_DARK_THEMES.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() => onPythonEditorThemeChange(t.id)}
                  className="gap-2"
                >
                  <span className="relative shrink-0 w-5 h-3">
                    <span
                      className="absolute left-0 top-0 h-3 w-3 rounded-full border border-background/40"
                      style={{ backgroundColor: t.dot1 }}
                    />
                    <span
                      className="absolute left-2 top-0 h-3 w-3 rounded-full border border-background/40"
                      style={{ backgroundColor: t.dot2 }}
                    />
                  </span>
                  <span className="flex-1">{t.label}</span>
                  {pythonEditorTheme === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
