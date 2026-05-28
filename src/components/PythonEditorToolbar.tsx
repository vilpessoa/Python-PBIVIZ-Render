import { Check, Copy, Palette, RotateCcw, Save, Search, Trash2, Minus, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { AIAssistantDropdown } from '@/components/ai/AIAssistantDropdown';
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
  code: string;
  onAiApply: (code: string) => void;
}

const THEMES: { id: PythonEditorTheme; label: string; dot1: string; dot2: string }[] = [
  { id: 'default',     label: 'Python',      dot1: '#4CA64C', dot2: '#BB5252' },
  { id: 'soft',        label: 'Soft',        dot1: '#7d61a9', dot2: '#b6dbd5' },
  { id: 'soft-dark',   label: 'Soft Dark',   dot1: '#1e2030', dot2: '#4abca6' },
  { id: 'one-pro',     label: 'One Pro',     dot1: '#c678dd', dot2: '#61afef' },
  { id: 'dracula',     label: 'Dracula',     dot1: '#bd93f9', dot2: '#ff79c6' },
  { id: 'nord',        label: 'Nord',        dot1: '#7C99BB', dot2: '#BED0B3' },
  { id: 'monokai',     label: 'Monokai',     dot1: '#EEE9B6', dot2: '#F9B9CF' },
  { id: 'tokyo',       label: 'Tokyo',       dot1: '#894FEE', dot2: '#5ECDB7' },
  { id: 'github',      label: 'GitHub',      dot1: '#ff7b72', dot2: '#0969da' },
  { id: 'gruvbox',     label: 'Gruvbox',     dot1: '#fb4934', dot2: '#076678' },
  { id: 'ayu',         label: 'Ayu',         dot1: '#f07178', dot2: '#55b4d4' },
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
  code,
  onAiApply,
}: Props) {
  const clampZoom = (v: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        {/* Left actions */}
        <div className="flex items-center gap-2">
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

          <VDivider />

          <AIAssistantDropdown code={code} onApply={onAiApply} />
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
            <DropdownMenuContent align="end" className="min-w-[10rem]">
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
