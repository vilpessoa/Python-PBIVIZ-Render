import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  ChevronsRight,
  Code2,
  Plus,
  Trash2,
  Database,
  AlertCircle,
} from 'lucide-react';
import type { PBISettings, PBIDadosColuna, PBIDadosMedida, PBITipografia } from '@/lib/storage';
import { DEFAULT_PBI_SETTINGS, DEFAULT_PBI_DADOS } from '@/lib/storage';
import type { ExtractedPbivizConfig, CapObject, CapProperty } from '@/lib/pythonParser/types';

interface Props {
  settings: PBISettings;
  onChange: (s: PBISettings) => void;
  onClose: () => void;
  onReset?: () => void;
  extractedFromCode?: ExtractedPbivizConfig;
}

const PROVEDORES_FALLBACK = [
  { value: 'tess', label: 'Tess AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'custom', label: 'Personalizado' },
];

const TIPOS_COLUNA = [
  { value: 'text', label: 'Texto' },
  { value: 'numeric', label: 'Numérico' },
  { value: 'boolean', label: 'Booleano' },
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ── Toggle ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      style={{
        position: 'relative',
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0,
        backgroundColor: checked ? 'var(--color-primary, #117865)' : '#e0e0e0',
        transition: 'background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </button>
  );
}

/* ── Section accordion header ── */
function SectionHeader({
  title, open, onToggle, toggleNode,
}: {
  title: string; open: boolean; onToggle: () => void; toggleNode?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/50"
    >
      <div className="flex items-center gap-2.5">
        <ChevronRight
          className="h-4 w-4 shrink-0 text-foreground transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
        <span className="text-[13px] font-medium text-foreground">{title}</span>
      </div>
      {toggleNode}
    </button>
  );
}

/* ── Accordion content ── */
function AccordionContent({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden border-b border-border transition-[max-height] duration-300 ease-in-out"
      style={{ maxHeight: open ? 900 : 0 }}
    >
      <div className="flex flex-col gap-3 px-4 py-3">{children}</div>
    </div>
  );
}

/* ── Text input ── */
function TextInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete="off"
      spellCheck={false}
      className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

/* ── Textarea ── */
function TextArea({ value, onChange, placeholder, rows = 3, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      spellCheck={false}
      className="w-full resize-none rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

/* ── Select ── */
function SelectInput({ value, onChange, options, disabled }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ── Password field ── */
function PasswordField({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••••••'}
        autoComplete="off"
        className="w-full rounded border border-border bg-background py-1.5 pl-2.5 pr-7 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </div>
  );
}

/* ── Color picker ── */
function ColorPicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="truncate text-[12px] font-medium text-foreground/80">{label}</span>
      <label
        className="inline-flex cursor-pointer items-stretch overflow-hidden rounded border border-border bg-background transition-colors hover:border-foreground/40"
        style={{ width: 'fit-content' }}
      >
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" />
        <div className="h-7 w-7 shrink-0" style={{ backgroundColor: value }} />
        <div className="flex h-7 w-9 items-center justify-center border-l border-border bg-background">
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      </label>
    </div>
  );
}

/* ── Field wrapper ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-foreground/80">{label}</span>
      {children}
    </div>
  );
}

/* ── DynamicField — renderiza UMA propriedade do CAPABILITIES escolhendo o
      widget conforme o tipo PBI (fill/bool/enumeration/numeric/text) e
      heurísticas pelo nome da propriedade. ── */
function DynamicField({
  propKey,
  prop,
  value,
  onChange,
}: {
  propKey: string;
  prop: CapProperty;
  value: string | boolean | number | undefined;
  onChange: (v: string | boolean | number) => void;
}) {
  const label = prop.displayName || propKey;
  const t = (prop.type ?? {}) as Record<string, unknown>;
  const lower = propKey.toLowerCase();

  if (lower.includes('apikey') || lower.includes('senha') || lower.includes('password') || lower.includes('secret')) {
    return (
      <Field label={label}>
        <PasswordField value={(value as string) ?? ''} onChange={onChange as (v: string) => void} />
      </Field>
    );
  }

  if (t.fill) {
    return <ColorPicker label={label} value={(value as string) ?? '#000000'} onChange={onChange as (v: string) => void} />;
  }

  if (t.bool) {
    return (
      <div className="flex items-center justify-between pt-1">
        <span className="text-[12px] font-medium text-foreground/80">{label}</span>
        <Toggle checked={(value as boolean) ?? false} onChange={onChange as (v: boolean) => void} />
      </div>
    );
  }

  if (t.enumeration) {
    const items = (t.enumeration as { value: string; displayName: string }[]) ?? [];
    const strVal = (value as string) ?? (items[0]?.value ?? '');
    return (
      <Field label={label}>
        <SelectInput value={strVal} onChange={onChange as (v: string) => void} options={items.map((i) => ({ value: i.value, label: i.displayName }))} />
      </Field>
    );
  }

  if (t.numeric) {
    const strVal = value !== undefined && value !== '' ? String(value) : '';
    return (
      <Field label={label}>
        <TextInput value={strVal} onChange={(v) => onChange(v === '' ? '' : (isNaN(Number(v)) ? v : Number(v)))} placeholder="0" />
      </Field>
    );
  }

  const isLong = lower.includes('prompt');
  return (
    <Field label={label}>
      {isLong
        ? <TextArea value={(value as string) ?? ''} onChange={onChange as (v: string) => void} rows={4} placeholder="..." />
        : <TextInput value={(value as string) ?? ''} onChange={onChange as (v: string) => void} />}
    </Field>
  );
}


/* ════════════════════════════════════════
   ABA DADOS — colunas e medidas mock
   ════════════════════════════════════════ */
function DadosTab({
  settings,
  onChange,
  extractedFromCode,
}: {
  settings: PBISettings;
  onChange: (s: PBISettings) => void;
  extractedFromCode?: ExtractedPbivizConfig;
}) {
  const { colunas, medidas } = settings.dados;
  const roles = extractedFromCode?.capabilities?.dataRoles ?? [];
  const groupingRoles = roles.filter((r) => r.kind === 'Grouping' || r.kind === 'GroupingOrMeasure');
  const measureRoles  = roles.filter((r) => r.kind === 'Measure');
  const hasRoles = roles.length > 0;

  function patchDados(patch: Partial<typeof settings.dados>) {
    onChange({ ...settings, dados: { ...settings.dados, ...patch } });
  }

  function addColuna() {
    const nova: PBIDadosColuna = { id: genId(), nome: 'NovaColuna', tipo: 'text', valores: 'A, B, C' };
    patchDados({ colunas: [...colunas, nova] });
  }

  function updateColuna(id: string, patch: Partial<PBIDadosColuna>) {
    patchDados({ colunas: colunas.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }

  function removeColuna(id: string) {
    patchDados({ colunas: colunas.filter((c) => c.id !== id) });
  }

  function addMedida() {
    const nova: PBIDadosMedida = { id: genId(), nome: 'Medida', valor: '0' };
    patchDados({ medidas: [...medidas, nova] });
  }

  function updateMedida(id: string, patch: Partial<PBIDadosMedida>) {
    patchDados({ medidas: medidas.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }

  function removeMedida(id: string) {
    patchDados({ medidas: medidas.filter((m) => m.id !== id) });
  }

  const totalLinhas = colunas.length > 0
    ? Math.max(...colunas.map((c) => c.valores.split(',').filter((v) => v.trim()).length))
    : 0;

  if (!hasRoles) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-[12px] text-muted-foreground">
          Adicione <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">dataRoles</code> ao <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">CAPABILITIES</code> no código para configurar dados mockados.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Resumo */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">
          {totalLinhas} linha{totalLinhas !== 1 ? 's' : ''} · {colunas.length} coluna{colunas.length !== 1 ? 's' : ''} · {medidas.length} medida{medidas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Papéis do código (CAPABILITIES.dataRoles) */}
      <div className="shrink-0 border-b border-border bg-primary/5 px-4 py-2.5">
        <div className="mb-2 flex items-center gap-1.5">
          <Code2 className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-semibold text-primary">Papéis definidos no código</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {groupingRoles.map((r) => (
            <span key={r.name} className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-foreground/70">
              {r.displayName} <span className="text-muted-foreground/50">(agrupamento)</span>
            </span>
          ))}
          {measureRoles.map((r) => (
            <span key={r.name} className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-foreground/70">
              {r.displayName} <span className="text-muted-foreground/50">(medida)</span>
            </span>
          ))}
        </div>
      </div>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0">

        {/* Colunas */}
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[13px] font-medium text-foreground">
              {groupingRoles.length > 0
                ? groupingRoles.map((r) => r.displayName).join(' / ')
                : 'Colunas'}
            </span>
            <button
              type="button"
              onClick={addColuna}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </button>
          </div>

          {colunas.length === 0 && (
            <p className="px-4 pb-3 text-[12px] italic text-muted-foreground">Nenhuma coluna. Adicione para simular categorias.</p>
          )}

          <div className="flex flex-col gap-2 px-4 pb-3">
            {colunas.map((col) => (
              <div key={col.id} className="flex flex-col gap-1.5 rounded border border-border bg-background p-2.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={col.nome}
                    onChange={(e) => updateColuna(col.id, { nome: e.target.value })}
                    placeholder="Nome"
                    className="min-w-0 flex-1 rounded border border-border bg-muted/30 px-2 py-1 text-xs text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  <select
                    value={col.tipo}
                    onChange={(e) => updateColuna(col.id, { tipo: e.target.value as PBIDadosColuna['tipo'] })}
                    className="rounded border border-border bg-muted/30 px-1.5 py-1 text-[11px] text-foreground focus:border-primary/60 focus:outline-none"
                  >
                    {TIPOS_COLUNA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeColuna(col.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <input
                  type="text"
                  value={col.valores}
                  onChange={(e) => updateColuna(col.id, { valores: e.target.value })}
                  placeholder="Valores separados por vírgula: A, B, C"
                  className="w-full rounded border border-border bg-muted/30 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <p className="text-[10px] text-muted-foreground">
                  {col.valores.split(',').filter((v) => v.trim()).length} valor{col.valores.split(',').filter((v) => v.trim()).length !== 1 ? 'es' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Medidas */}
        <div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[13px] font-medium text-foreground">
              {measureRoles.length > 0
                ? measureRoles.map((r) => r.displayName).join(' / ')
                : 'Medidas'}
            </span>
            <button
              type="button"
              onClick={addMedida}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </button>
          </div>

          {medidas.length === 0 && (
            <p className="px-4 pb-3 text-[12px] italic text-muted-foreground">Nenhuma medida. Adicione para simular valores.</p>
          )}

          <div className="flex flex-col gap-2 px-4 pb-3">
            {medidas.map((med) => (
              <div key={med.id} className="flex items-center gap-1.5 rounded border border-border bg-background p-2">
                <input
                  type="text"
                  value={med.nome}
                  onChange={(e) => updateMedida(med.id, { nome: e.target.value })}
                  placeholder="Nome"
                  className="min-w-0 flex-1 rounded border border-border bg-muted/30 px-2 py-1 text-xs text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <input
                  type="text"
                  value={med.valor}
                  onChange={(e) => updateMedida(med.id, { valor: e.target.value })}
                  placeholder="0"
                  className="w-20 shrink-0 rounded border border-border bg-muted/30 px-2 py-1 text-right text-xs text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => removeMedida(med.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Reset dados */}
        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => patchDados(DEFAULT_PBI_DADOS)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Restaurar dados padrão
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Dialog de confirmação de reset ── */
function ResetConfirmDialog({
  onResetAll,
  onResetLayout,
  onCancel,
}: {
  onResetAll: () => void;
  onResetLayout: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-[240px] rounded-lg border border-border bg-background p-4 shadow-xl">
        <p className="mb-1 text-[13px] font-semibold text-foreground">Restaurar configurações?</p>
        <p className="mb-4 text-[12px] text-muted-foreground">Escolha o que deseja resetar:</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResetAll}
            className="w-full rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-left text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/20"
          >
            Resetar absolutamente tudo
            <span className="mt-0.5 block text-[10px] font-normal opacity-75">Inclui conexão, layout e aparência</span>
          </button>
          <button
            type="button"
            onClick={onResetLayout}
            className="w-full rounded border border-border bg-muted/30 px-3 py-2 text-left text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            Resetar apenas layout
            <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">Mantém conexão (API key, agente) intacta</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded px-3 py-1.5 text-center text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════ */
type SectionDescriptor = {
  key: string;
  title: string;
  kind: 'tamanho' | 'known' | 'generic';
  objectKey?: string;
  capObject?: CapObject;
};

export function PBISettingsPanel({ settings, onChange, onClose, onReset, extractedFromCode }: Props) {
  const [activeTab, setActiveTab] = useState<'visual' | 'dados'>('visual');
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isSectionOpen = (key: string) => openSections[key] ?? false;
  const toggleSection = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  function patchConexao(patch: Partial<typeof settings.conexao>) {
    onChange({ ...settings, conexao: { ...settings.conexao, ...patch } });
  }
  function patchLayout(patch: Partial<typeof settings.layout>) {
    onChange({ ...settings, layout: { ...settings.layout, ...patch } });
  }
  function patchAparenciaChat(patch: Partial<typeof settings.aparenciaChat>) {
    onChange({ ...settings, aparenciaChat: { ...settings.aparenciaChat, ...patch } });
  }
  function patchTipografia(patch: Partial<PBITipografia>) {
    onChange({ ...settings, tipografia: { ...settings.tipografia, ...patch } });
  }
  function patchExtras(objectKey: string, propKey: string, val: string | boolean | number) {
    const cur = settings.extras ?? {};
    onChange({ ...settings, extras: { ...cur, [objectKey]: { ...(cur[objectKey] ?? {}), [propKey]: val } } });
  }

  const SETTINGS_KEYS = new Set(['conexao', 'aparenciaChat', 'tipografia', 'layout']);
  function getVal(objectKey: string, propKey: string): string | boolean | number | undefined {
    if (SETTINGS_KEYS.has(objectKey)) {
      const obj = (settings as unknown as Record<string, Record<string, string | boolean | number>>)[objectKey];
      return obj ? obj[propKey] : undefined;
    }
    return settings.extras?.[objectKey]?.[propKey];
  }
  function setVal(objectKey: string, propKey: string, val: string | boolean | number) {
    if (SETTINGS_KEYS.has(objectKey)) {
      const obj = (settings as unknown as Record<string, Record<string, string | boolean | number>>)[objectKey] ?? {};
      onChange({ ...settings, [objectKey]: { ...obj, [propKey]: val } });
    } else {
      patchExtras(objectKey, propKey, val);
    }
  }

  const { conexao, layout, aparenciaChat, tipografia } = settings;

  function handleResetAll() {
    onChange({ ...DEFAULT_PBI_SETTINGS, dados: settings.dados });
    onReset?.();
    setShowResetConfirm(false);
  }

  function handleResetLayout() {
    onChange({
      ...settings,
      layout: DEFAULT_PBI_SETTINGS.layout,
      aparenciaChat: DEFAULT_PBI_SETTINGS.aparenciaChat,
      tipografia: DEFAULT_PBI_SETTINGS.tipografia,
      extras: {},
    });
    onReset?.();
    setShowResetConfirm(false);
  }

  const capObjects = extractedFromCode?.capabilities?.objects;

  const dynamicSections: SectionDescriptor[] = capObjects
    ? [
        { key: 'tamanho', title: 'Tamanho e estilo', kind: 'tamanho' },
        ...Object.entries(capObjects).map(([oKey, capObj]) => ({
          key: oKey,
          title: capObj.displayName,
          kind: (SETTINGS_KEYS.has(oKey) ? 'known' : 'generic') as 'known' | 'generic',
          objectKey: oKey,
          capObject: capObj,
        })),
      ]
    : [];

  const filteredSections = searchQuery.trim()
    ? dynamicSections.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : dynamicSections;

  return (
    <div className="relative flex h-full w-[280px] shrink-0 flex-col bg-muted/30 shadow-lg" data-panel="pbi-settings">

      {/* ── Header ── */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <span className="text-[15px] font-semibold text-foreground">Formato</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            title="Restaurar padrões"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex shrink-0 border-b border-border bg-background">
        <button
          type="button"
          onClick={() => setActiveTab('visual')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors ${
            activeTab === 'visual'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Visual
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dados')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors ${
            activeTab === 'dados'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database className="h-3 w-3" />
          Dados
        </button>
      </div>

      {/* ── Aba Dados ── */}
      {activeTab === 'dados' && (
        <div className="flex-1 overflow-hidden">
          <DadosTab settings={settings} onChange={onChange} extractedFromCode={extractedFromCode} />
        </div>
      )}

      {/* ── Aba Visual ── */}
      {activeTab === 'visual' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Search */}
          <div className="shrink-0 border-b border-border bg-background px-4 py-2.5">
            <div className="flex items-center gap-2 rounded border border-border bg-muted/30 px-2.5 py-1.5 focus-within:border-primary/50 focus-within:bg-background transition-colors">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar"
                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
          </div>

          {/* Accordion sections ou mensagem de ausência de CAPABILITIES */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-0">
            {dynamicSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-[12px] text-muted-foreground">
                  Adicione <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">CAPABILITIES</code> ao código Python para configurar as seções de formato visual.
                </p>
              </div>
            ) : (
              filteredSections.map((section) => {
                const open   = isSectionOpen(section.key);
                const toggle = () => toggleSection(section.key);
                const cap = capObjects?.[section.objectKey ?? ''];
                const propLabel = (propKey: string, fallback: string) =>
                  cap?.properties?.[propKey]?.displayName ?? fallback;

                // ── Tamanho e estilo ──────────────
                if (section.kind === 'tamanho') return (
                  <div key={section.key}>
                    <SectionHeader title={section.title} open={open} onToggle={toggle} />
                    <AccordionContent open={open}>
                      <Field label="Largura"><TextInput value="" onChange={() => {}} placeholder="Automático" /></Field>
                      <Field label="Altura"><TextInput value="" onChange={() => {}} placeholder="Automático" /></Field>
                    </AccordionContent>
                  </div>
                );

                // ── Dinâmico via capObject ──────────────
                if (section.capObject) {
                  const co = section.capObject;
                  const oKeyD = section.objectKey!;
                  return (
                    <div key={section.key}>
                      <SectionHeader title={section.title} open={open} onToggle={toggle} />
                      <AccordionContent open={open}>
                        {(Object.entries(co.properties) as [string, CapProperty][]).map(([pk, prop]) => (
                          <DynamicField
                            key={pk}
                            propKey={pk}
                            prop={prop}
                            value={getVal(oKeyD, pk)}
                            onChange={(v) => setVal(oKeyD, pk, v)}
                          />
                        ))}
                      </AccordionContent>
                    </div>
                  );
                }

                // ── Fallback estático por objectKey (apenas se CAPABILITIES definir o objeto mas sem capObject) ──
                const oKey = section.objectKey;

                if (oKey === 'conexao') {
                  const provedorProp = cap?.properties?.['provedor'];
                  const provedorOpts = provedorProp?.type?.enumeration
                    ? (provedorProp.type.enumeration as { value: string; displayName: string }[]).map(
                        (e) => ({ value: e.value, label: e.displayName })
                      )
                    : PROVEDORES_FALLBACK;
                  const modeloSugProp = cap?.properties?.['modeloSugerido'];
                  const modeloSugOpts = modeloSugProp?.type?.enumeration
                    ? (modeloSugProp.type.enumeration as { value: string; displayName: string }[]).map(
                        (e) => ({ value: e.value, label: e.displayName })
                      )
                    : null;

                  return (
                    <div key={section.key}>
                      <SectionHeader title={section.title} open={open} onToggle={toggle} />
                      <AccordionContent open={open}>
                        <Field label={propLabel('provedor', 'Provedor')}>
                          <SelectInput value={conexao.provedor} onChange={(v) => patchConexao({ provedor: v })} options={provedorOpts} />
                        </Field>
                        <Field label={propLabel('apiKey', 'Chave de API')}>
                          <PasswordField value={conexao.apiKey} onChange={(v) => patchConexao({ apiKey: v })} />
                        </Field>
                        <Field label={propLabel('agentId', 'ID do Agente')}>
                          <TextInput value={conexao.agentId} onChange={(v) => patchConexao({ agentId: v })} placeholder="agent-xxxxxxxx" />
                        </Field>
                        {modeloSugOpts && (
                          <Field label={propLabel('modeloSugerido', 'Modelo sugerido')}>
                            <SelectInput
                              value={conexao.modeloSugerido}
                              onChange={(v) => patchConexao({ modeloSugerido: v })}
                              options={modeloSugOpts}
                            />
                          </Field>
                        )}
                        <Field label={propLabel('modelo', 'Modelo personalizado')}>
                          <TextInput value={conexao.modelo} onChange={(v) => patchConexao({ modelo: v })} placeholder={conexao.modeloSugerido || 'ex: gpt-4o'} />
                        </Field>
                        <Field label={propLabel('systemPrompt', 'System Prompt')}>
                          <TextArea value={conexao.systemPrompt} onChange={(v) => patchConexao({ systemPrompt: v })} placeholder="Instruções para o assistente..." rows={4} />
                        </Field>
                      </AccordionContent>
                    </div>
                  );
                }

                if (oKey === 'aparenciaChat') return (
                  <div key={section.key}>
                    <SectionHeader title={section.title} open={open} onToggle={toggle} />
                    <AccordionContent open={open}>
                      <ColorPicker label={propLabel('corFundoHeader', 'Fundo do topo')} value={aparenciaChat.corFundoHeader} onChange={(v) => patchAparenciaChat({ corFundoHeader: v })} />
                      <ColorPicker label={propLabel('corTextoHeader', 'Texto do topo')} value={aparenciaChat.corTextoHeader} onChange={(v) => patchAparenciaChat({ corTextoHeader: v })} />
                      <ColorPicker label={propLabel('corFundoChat', 'Fundo do chat')} value={aparenciaChat.corFundoChat} onChange={(v) => patchAparenciaChat({ corFundoChat: v })} />
                      <ColorPicker label={propLabel('corBolhaUsuario', 'Balão do usuário')} value={aparenciaChat.corBolhaUsuario} onChange={(v) => patchAparenciaChat({ corBolhaUsuario: v })} />
                      <ColorPicker label={propLabel('corBolhaAssistente', 'Balão do agente')} value={aparenciaChat.corBolhaAssistente} onChange={(v) => patchAparenciaChat({ corBolhaAssistente: v })} />
                      <ColorPicker label={propLabel('corTextoBolha', 'Texto do agente')} value={aparenciaChat.corTextoBolha} onChange={(v) => patchAparenciaChat({ corTextoBolha: v })} />
                      <ColorPicker label={propLabel('corTextoBolhaUsuario', 'Texto do usuário')} value={aparenciaChat.corTextoBolhaUsuario} onChange={(v) => patchAparenciaChat({ corTextoBolhaUsuario: v })} />
                      <ColorPicker label={propLabel('corFundoInput', 'Fundo do input')} value={aparenciaChat.corFundoInput} onChange={(v) => patchAparenciaChat({ corFundoInput: v })} />
                      <ColorPicker label={propLabel('corBotaoEnviar', 'Cor do botão Enviar')} value={aparenciaChat.corBotaoEnviar} onChange={(v) => patchAparenciaChat({ corBotaoEnviar: v })} />
                      <ColorPicker label={propLabel('corTextoBotao', 'Texto do botão')} value={aparenciaChat.corTextoBotao ?? '#ffffff'} onChange={(v) => patchAparenciaChat({ corTextoBotao: v })} />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[12px] font-medium text-foreground/80">{propLabel('exibirAvatares', 'Exibir avatares')}</span>
                        <Toggle checked={aparenciaChat.exibirAvatares} onChange={(v) => patchAparenciaChat({ exibirAvatares: v })} />
                      </div>
                      <Field label={propLabel('avatarUsuarioUrl', 'URL Avatar Usuário')}>
                        <TextInput value={aparenciaChat.avatarUsuarioUrl} onChange={(v) => patchAparenciaChat({ avatarUsuarioUrl: v })} placeholder="https://..." />
                      </Field>
                      <Field label={propLabel('avatarAgenteUrl', 'URL Avatar Agente')}>
                        <TextInput value={aparenciaChat.avatarAgenteUrl} onChange={(v) => patchAparenciaChat({ avatarAgenteUrl: v })} placeholder="https://..." />
                      </Field>
                    </AccordionContent>
                  </div>
                );

                if (oKey === 'tipografia') {
                  const fonteProp  = cap?.properties?.['familiaFonte'];
                  const fonteOpts  = fonteProp?.type?.enumeration
                    ? (fonteProp.type.enumeration as { value: string; displayName: string }[]).map(
                        (e) => ({ value: e.value, label: e.displayName })
                      )
                    : [
                        { value: 'Inter',    label: 'Inter' },
                        { value: 'Segoe UI', label: 'Segoe UI' },
                        { value: 'Arial',    label: 'Arial' },
                        { value: 'Roboto',   label: 'Roboto' },
                      ];
                  return (
                    <div key={section.key}>
                      <SectionHeader title={section.title} open={open} onToggle={toggle} />
                      <AccordionContent open={open}>
                        <Field label={propLabel('familiaFonte', 'Família de fonte')}>
                          <SelectInput value={tipografia?.familiaFonte ?? 'Inter'} onChange={(v) => patchTipografia({ familiaFonte: v })} options={fonteOpts} />
                        </Field>
                        <Field label={propLabel('tamanhoFonteMensagens', 'Tamanho fonte mensagens')}>
                          <TextInput
                            value={String(tipografia?.tamanhoFonteMensagens ?? 13)}
                            onChange={(v) => patchTipografia({ tamanhoFonteMensagens: Number(v) || 13 })}
                            placeholder="13"
                          />
                        </Field>
                        <Field label={propLabel('tamanhoFonteInput', 'Tamanho fonte input')}>
                          <TextInput
                            value={String(tipografia?.tamanhoFonteInput ?? 12)}
                            onChange={(v) => patchTipografia({ tamanhoFonteInput: Number(v) || 12 })}
                            placeholder="12"
                          />
                        </Field>
                      </AccordionContent>
                    </div>
                  );
                }

                if (oKey === 'layout') {
                  if (section.key === 'titulo') {
                    return (
                      <div key={section.key}>
                        <SectionHeader
                          title={section.title}
                          open={open}
                          onToggle={toggle}
                          toggleNode={<Toggle checked={layout.exibirTitulo} onChange={(v) => patchLayout({ exibirTitulo: v })} />}
                        />
                        <AccordionContent open={open}>
                          <Field label={propLabel('tituloChat', 'Texto do título')}>
                            <TextInput value={layout.tituloChat} onChange={(v) => patchLayout({ tituloChat: v })} placeholder="Assistente IA" />
                          </Field>
                        </AccordionContent>
                      </div>
                    );
                  }
                  return (
                    <div key={section.key}>
                      <SectionHeader title={section.title} open={open} onToggle={toggle} />
                      <AccordionContent open={open}>
                        <Field label={propLabel('tituloChat', 'Título do chat')}>
                          <TextInput value={layout.tituloChat} onChange={(v) => patchLayout({ tituloChat: v })} placeholder="Assistente IA" />
                        </Field>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-medium text-foreground/80">{propLabel('exibirTitulo', 'Exibir título')}</span>
                          <Toggle checked={layout.exibirTitulo} onChange={(v) => patchLayout({ exibirTitulo: v })} />
                        </div>
                        <Field label={propLabel('placeholderInput', 'Placeholder do input')}>
                          <TextInput value={layout.placeholderInput} onChange={(v) => patchLayout({ placeholderInput: v })} placeholder="Pergunte sobre os dados..." />
                        </Field>
                        <Field label={propLabel('textoBotaoEnviar', 'Texto do botão Enviar')}>
                          <TextInput value={layout.textoBotaoEnviar} onChange={(v) => patchLayout({ textoBotaoEnviar: v })} placeholder="Enviar" />
                        </Field>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-medium text-foreground/80">{propLabel('debugExibirContexto', 'Debug: exibir contexto')}</span>
                          <Toggle checked={layout.debugExibirContexto} onChange={(v) => patchLayout({ debugExibirContexto: v })} />
                        </div>
                      </AccordionContent>
                    </div>
                  );
                }

                return null;
              })
            )}
          </div>
        </div>
      )}

      {/* ── Dialog de confirmação ── */}
      {showResetConfirm && (
        <ResetConfirmDialog
          onResetAll={handleResetAll}
          onResetLayout={handleResetLayout}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  );
}
