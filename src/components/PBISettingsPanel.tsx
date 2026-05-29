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
function PasswordField({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••••••'}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded border border-border bg-background py-1.5 pl-2.5 pr-7 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      />
      {!disabled && (
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      )}
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

/* ── Badge "do código" ── */
function CodeBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
      <Code2 className="h-2.5 w-2.5" />
      do código
    </span>
  );
}

/* ── Campo read-only que mostra valor extraído do código ── */
function CodeField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-foreground/80 truncate">{label}</span>
        <CodeBadge />
      </div>
      <div
        className={`rounded border border-primary/25 bg-primary/5 px-2.5 py-1.5 font-mono text-xs text-foreground ${
          multiline ? 'whitespace-pre-wrap break-all max-h-20 overflow-auto' : 'truncate'
        }`}
        title={value}
      >
        {value !== '' ? value : <span className="italic text-muted-foreground">vazio</span>}
      </div>
    </div>
  );
}

/* ── SmartField — mostra code field se extraído, input editável caso contrário ── */
function SmartField({
  label,
  codeValue,
  children,
}: {
  label: string;
  codeValue: string | undefined;
  children: React.ReactNode;
}) {
  if (codeValue !== undefined) {
    return <CodeField label={label} value={codeValue} />;
  }
  return <Field label={label}>{children}</Field>;
}

/* ── SmartPassword ── */
function SmartPassword({
  label, codeValue, value, onChange,
}: {
  label: string; codeValue: string | undefined; value: string; onChange: (v: string) => void;
}) {
  if (codeValue !== undefined) {
    return <CodeField label={label} value={codeValue.length > 0 ? '••••••••' + codeValue.slice(-4) : ''} />;
  }
  return <Field label={label}><PasswordField value={value} onChange={onChange} /></Field>;
}

/* ── SmartColor ── */
function SmartColor({
  label, codeValue, value, onChange,
}: {
  label: string; codeValue: string | undefined; value: string; onChange: (v: string) => void;
}) {
  const effective = codeValue ?? value;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-foreground/80">{label}</span>
        {codeValue !== undefined && <CodeBadge />}
      </div>
      <label
        className={`inline-flex cursor-pointer items-stretch overflow-hidden rounded border border-border bg-background transition-colors hover:border-foreground/40 ${codeValue !== undefined ? 'pointer-events-none opacity-80' : ''}`}
        style={{ width: 'fit-content' }}
      >
        <input type="color" value={effective} onChange={(e) => onChange(e.target.value)} className="sr-only" disabled={codeValue !== undefined} />
        <div className="h-7 w-7 shrink-0" style={{ backgroundColor: effective }} />
        <div className="flex h-7 w-9 items-center justify-center border-l border-border bg-background">
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      </label>
    </div>
  );
}

/* ── DynamicField — renderiza UMA propriedade do CAPABILITIES escolhendo o
      widget conforme o tipo PBI (fill/bool/enumeration/numeric/text) e
      heurísticas pelo nome da propriedade (apiKey→senha, prompt→textarea). ── */
function DynamicField({
  propKey,
  prop,
  value,
  codeValue,
  onChange,
}: {
  propKey: string;
  prop: CapProperty;
  value: string | boolean | number | undefined;
  codeValue: string | undefined;
  onChange: (v: string | boolean | number) => void;
}) {
  const label = prop.displayName || propKey;
  const t = (prop.type ?? {}) as Record<string, unknown>;
  const lower = propKey.toLowerCase();

  // Senha — chave de API e afins
  if (lower.includes('apikey') || lower.includes('senha') || lower.includes('password') || lower.includes('secret')) {
    return <SmartPassword label={label} codeValue={codeValue} value={(value as string) ?? ''} onChange={onChange as (v: string) => void} />;
  }

  // Cor — fill.solid.color
  if (t.fill) {
    return <SmartColor label={label} codeValue={codeValue} value={(value as string) ?? '#000000'} onChange={onChange as (v: string) => void} />;
  }

  // Booleano — toggle
  if (t.bool) {
    return (
      <div className="flex items-center justify-between pt-1">
        <span className="text-[12px] font-medium text-foreground/80">{label}</span>
        <Toggle checked={(value as boolean) ?? false} onChange={onChange as (v: boolean) => void} />
      </div>
    );
  }

  // Enumeração — select com as opções do código
  if (t.enumeration) {
    const items = (t.enumeration as { value: string; displayName: string }[]) ?? [];
    if (codeValue !== undefined) return <CodeField label={label} value={codeValue} />;
    const strVal = (value as string) ?? (items[0]?.value ?? '');
    return (
      <Field label={label}>
        <SelectInput value={strVal} onChange={onChange as (v: string) => void} options={items.map((i) => ({ value: i.value, label: i.displayName }))} />
      </Field>
    );
  }

  // Numérico
  if (t.numeric) {
    if (codeValue !== undefined) return <CodeField label={label} value={codeValue} />;
    const strVal = value !== undefined && value !== '' ? String(value) : '';
    return (
      <Field label={label}>
        <TextInput value={strVal} onChange={(v) => onChange(v === '' ? '' : (isNaN(Number(v)) ? v : Number(v)))} placeholder="0" />
      </Field>
    );
  }

  // Texto — prompt longo vira textarea
  const isLong = lower.includes('prompt');
  if (codeValue !== undefined) return <CodeField label={label} value={codeValue} multiline={isLong} />;
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

  return (
    <div className="flex flex-col gap-0 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">

      {/* Resumo */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2.5">
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">
          {totalLinhas} linha{totalLinhas !== 1 ? 's' : ''} · {colunas.length} coluna{colunas.length !== 1 ? 's' : ''} · {medidas.length} medida{medidas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Papéis do código (CAPABILITIES.dataRoles) */}
      {hasRoles && (
        <div className="border-b border-border bg-primary/5 px-4 py-2.5">
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
      )}

      {/* Colunas */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[13px] font-medium text-foreground">
            {hasRoles && groupingRoles.length > 0
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
            {hasRoles && measureRoles.length > 0
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

  // ── Acesso genérico a valores: objetos conhecidos usam os campos tipados
  //    (as chaves do CAPABILITIES batem com os nomes em PBISettings); objetos
  //    desconhecidos caem em settings.extras. ──
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
  function codeValOf(objectKey: string, propKey: string): string | undefined {
    const fc = (fromCod as unknown as Record<string, Record<string, string | undefined>>)[objectKey];
    return fc ? fc[propKey] : undefined;
  }

  const { conexao, layout, aparenciaChat, tipografia } = settings;
  const fromCod = extractedFromCode ?? {};

  const fromCodeCount = [
    fromCod.conexao?.apiKey, fromCod.conexao?.provedor, fromCod.conexao?.agentId,
    fromCod.conexao?.modelo, fromCod.conexao?.systemPrompt,
    fromCod.layout?.tituloChat, fromCod.layout?.placeholderInput,
    fromCod.aparenciaChat?.corFundoHeader, fromCod.aparenciaChat?.corTextoHeader,
    fromCod.aparenciaChat?.corFundoChat, fromCod.aparenciaChat?.corBolhaUsuario,
    fromCod.aparenciaChat?.corBolhaAssistente, fromCod.aparenciaChat?.corTextoBolha,
    fromCod.aparenciaChat?.corTextoBolhaUsuario, fromCod.aparenciaChat?.corFundoInput,
    fromCod.aparenciaChat?.corBotaoEnviar, fromCod.aparenciaChat?.avatarUsuarioUrl,
    fromCod.aparenciaChat?.avatarAgenteUrl,
    fromCod.tipografia?.familiaFonte, fromCod.tipografia?.tamanhoFonteMensagens,
    fromCod.tipografia?.tamanhoFonteInput,
  ].filter((v) => v !== undefined).length;

  // Seções dinâmicas baseadas em CAPABILITIES.objects (quando presentes)
  const KNOWN_KEYS = new Set(['conexao', 'aparenciaChat', 'tipografia', 'layout']);
  const capObjects = extractedFromCode?.capabilities?.objects;

  const dynamicSections: SectionDescriptor[] = capObjects
    ? [
        { key: 'tamanho', title: 'Tamanho e estilo', kind: 'tamanho' },
        ...Object.entries(capObjects).map(([oKey, capObj]) => ({
          key: oKey,
          title: capObj.displayName,
          kind: KNOWN_KEYS.has(oKey) ? 'known' as const : 'generic' as const,
          objectKey: oKey,
          capObject: capObj,
        })),
      ]
    : [
        { key: 'tamanho',       title: 'Tamanho e estilo',       kind: 'tamanho' as const,                              },
        { key: 'titulo',        title: 'Título',                  kind: 'known'   as const, objectKey: 'layout'          },
        { key: 'conexao',       title: 'Conexão',                 kind: 'known'   as const, objectKey: 'conexao'         },
        { key: 'aparenciaChat', title: 'Aparência - Chat',        kind: 'known'   as const, objectKey: 'aparenciaChat'   },
        { key: 'tipografia',    title: 'Aparência - Tipografia',  kind: 'known'   as const, objectKey: 'tipografia'      },
        { key: 'layout',        title: 'Aparência - Layout',      kind: 'known'   as const, objectKey: 'layout'          },
      ];

  const filteredSections = searchQuery.trim()
    ? dynamicSections.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : dynamicSections;

  // Restaura apenas formatação — dados permanecem intactos
  function handleReset() {
    onChange({
      ...settings,
      conexao: DEFAULT_PBI_SETTINGS.conexao,
      layout: DEFAULT_PBI_SETTINGS.layout,
      aparenciaChat: DEFAULT_PBI_SETTINGS.aparenciaChat,
      tipografia: DEFAULT_PBI_SETTINGS.tipografia,
      extras: {},
    });
    onReset?.();
  }

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col bg-muted/30 shadow-lg" data-panel="pbi-settings">

      {/* ── Header ── */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-foreground">Formato</span>
          {fromCodeCount > 0 && activeTab === 'visual' && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <Code2 className="h-2.5 w-2.5" />
              {fromCodeCount} do código
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleReset}
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

          {/* Accordion sections — dinâmico via CAPABILITIES.objects */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            {filteredSections.map((section) => {
              const open   = isSectionOpen(section.key);
              const toggle = () => toggleSection(section.key);
              // Label helper: usa displayName do capabilities se disponível, senão fallback hardcoded
              const cap = capObjects?.[section.objectKey ?? ''];
              const propLabel = (propKey: string, fallback: string) =>
                cap?.properties?.[propKey]?.displayName ?? fallback;

              // ── Tamanho e estilo (sempre estático) ──────────────
              if (section.kind === 'tamanho') return (
                <div key={section.key}>
                  <SectionHeader title={section.title} open={open} onToggle={toggle} />
                  <AccordionContent open={open}>
                    <Field label="Largura"><TextInput value="" onChange={() => {}} placeholder="Automático" /></Field>
                    <Field label="Altura"><TextInput value="" onChange={() => {}} placeholder="Automático" /></Field>
                  </AccordionContent>
                </div>
              );

              // ── Caminho dinâmico: qualquer seção que tenha capObject
              //    (conhecida OU desconhecida) é renderizada 100% a partir
              //    das properties do CAPABILITIES, na ordem do código. ──
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
                          codeValue={codeValOf(oKeyD, pk)}
                          onChange={(v) => setVal(oKeyD, pk, v)}
                        />
                      ))}
                    </AccordionContent>
                  </div>
                );
              }

              // ── Fallback (sem CAPABILITIES no código): seções estáticas ──
              const oKey = section.objectKey;

              if (oKey === 'conexao') {
                // Opções de provedor: usa enumeration do capabilities se disponível
                const provedorProp = cap?.properties?.['provedor'];
                const provedorOpts = provedorProp?.type?.enumeration
                  ? (provedorProp.type.enumeration as { value: string; displayName: string }[]).map(
                      (e) => ({ value: e.value, label: e.displayName })
                    )
                  : PROVEDORES_FALLBACK;
                // Opções de modeloSugerido
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
                      <SmartField label={propLabel('provedor', 'Provedor')} codeValue={fromCod.conexao?.provedor}>
                        <SelectInput value={conexao.provedor} onChange={(v) => patchConexao({ provedor: v })} options={provedorOpts} />
                      </SmartField>
                      <SmartPassword
                        label={propLabel('apiKey', 'Chave de API')}
                        codeValue={fromCod.conexao?.apiKey}
                        value={conexao.apiKey}
                        onChange={(v) => patchConexao({ apiKey: v })}
                      />
                      <SmartField label={propLabel('agentId', 'ID do Agente')} codeValue={fromCod.conexao?.agentId}>
                        <TextInput value={conexao.agentId} onChange={(v) => patchConexao({ agentId: v })} placeholder="agent-xxxxxxxx" />
                      </SmartField>
                      {modeloSugOpts && (
                        <Field label={propLabel('modeloSugerido', 'Modelo sugerido')}>
                          <SelectInput
                            value={conexao.modeloSugerido}
                            onChange={(v) => patchConexao({ modeloSugerido: v })}
                            options={modeloSugOpts}
                          />
                        </Field>
                      )}
                      <SmartField label={propLabel('modelo', 'Modelo personalizado')} codeValue={fromCod.conexao?.modelo}>
                        <TextInput value={conexao.modelo} onChange={(v) => patchConexao({ modelo: v })} placeholder={conexao.modeloSugerido || 'ex: gpt-4o'} />
                      </SmartField>
                      {fromCod.conexao?.systemPrompt !== undefined ? (
                        <CodeField label={propLabel('systemPrompt', 'System Prompt')} value={fromCod.conexao.systemPrompt} multiline />
                      ) : (
                        <Field label={propLabel('systemPrompt', 'System Prompt')}>
                          <TextArea value={conexao.systemPrompt} onChange={(v) => patchConexao({ systemPrompt: v })} placeholder="Instruções para o assistente..." rows={4} />
                        </Field>
                      )}
                    </AccordionContent>
                  </div>
                );
              }

              if (oKey === 'aparenciaChat') return (
                <div key={section.key}>
                  <SectionHeader title={section.title} open={open} onToggle={toggle} />
                  <AccordionContent open={open}>
                    <SmartColor label={propLabel('corFundoHeader', 'Fundo do topo')} codeValue={fromCod.aparenciaChat?.corFundoHeader} value={aparenciaChat.corFundoHeader} onChange={(v) => patchAparenciaChat({ corFundoHeader: v })} />
                    <SmartColor label={propLabel('corTextoHeader', 'Texto do topo')} codeValue={fromCod.aparenciaChat?.corTextoHeader} value={aparenciaChat.corTextoHeader} onChange={(v) => patchAparenciaChat({ corTextoHeader: v })} />
                    <SmartColor label={propLabel('corFundoChat', 'Fundo do chat')} codeValue={fromCod.aparenciaChat?.corFundoChat} value={aparenciaChat.corFundoChat} onChange={(v) => patchAparenciaChat({ corFundoChat: v })} />
                    <SmartColor label={propLabel('corBolhaUsuario', 'Balão do usuário')} codeValue={fromCod.aparenciaChat?.corBolhaUsuario} value={aparenciaChat.corBolhaUsuario} onChange={(v) => patchAparenciaChat({ corBolhaUsuario: v })} />
                    <SmartColor label={propLabel('corBolhaAssistente', 'Balão do agente')} codeValue={fromCod.aparenciaChat?.corBolhaAssistente} value={aparenciaChat.corBolhaAssistente} onChange={(v) => patchAparenciaChat({ corBolhaAssistente: v })} />
                    <SmartColor label={propLabel('corTextoBolha', 'Texto do agente')} codeValue={fromCod.aparenciaChat?.corTextoBolha} value={aparenciaChat.corTextoBolha} onChange={(v) => patchAparenciaChat({ corTextoBolha: v })} />
                    <SmartColor label={propLabel('corTextoBolhaUsuario', 'Texto do usuário')} codeValue={fromCod.aparenciaChat?.corTextoBolhaUsuario} value={aparenciaChat.corTextoBolhaUsuario} onChange={(v) => patchAparenciaChat({ corTextoBolhaUsuario: v })} />
                    <SmartColor label={propLabel('corFundoInput', 'Fundo do input')} codeValue={fromCod.aparenciaChat?.corFundoInput} value={aparenciaChat.corFundoInput} onChange={(v) => patchAparenciaChat({ corFundoInput: v })} />
                    <SmartColor label={propLabel('corBotaoEnviar', 'Cor do botão Enviar')} codeValue={fromCod.aparenciaChat?.corBotaoEnviar} value={aparenciaChat.corBotaoEnviar} onChange={(v) => patchAparenciaChat({ corBotaoEnviar: v })} />
                    {(!cap || cap.properties?.['corTextoBotao']) && (
                      <SmartColor label={propLabel('corTextoBotao', 'Texto do botão')} codeValue={undefined} value={aparenciaChat.corTextoBotao ?? '#ffffff'} onChange={(v) => patchAparenciaChat({ corTextoBotao: v })} />
                    )}
                    {(!cap || cap.properties?.['exibirAvatares']) && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[12px] font-medium text-foreground/80">{propLabel('exibirAvatares', 'Exibir avatares')}</span>
                        <Toggle checked={aparenciaChat.exibirAvatares} onChange={(v) => patchAparenciaChat({ exibirAvatares: v })} />
                      </div>
                    )}
                    {(!cap || cap.properties?.['avatarUsuarioUrl']) && (
                      <SmartField label={propLabel('avatarUsuarioUrl', 'URL Avatar Usuário')} codeValue={fromCod.aparenciaChat?.avatarUsuarioUrl}>
                        <TextInput value={aparenciaChat.avatarUsuarioUrl} onChange={(v) => patchAparenciaChat({ avatarUsuarioUrl: v })} placeholder="https://..." />
                      </SmartField>
                    )}
                    {(!cap || cap.properties?.['avatarAgenteUrl']) && (
                      <SmartField label={propLabel('avatarAgenteUrl', 'URL Avatar Agente')} codeValue={fromCod.aparenciaChat?.avatarAgenteUrl}>
                        <TextInput value={aparenciaChat.avatarAgenteUrl} onChange={(v) => patchAparenciaChat({ avatarAgenteUrl: v })} placeholder="https://..." />
                      </SmartField>
                    )}
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
                // Seção "Título" no fallback (key='titulo', objectKey='layout')
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
                        <SmartField label={propLabel('tituloChat', 'Texto do título')} codeValue={fromCod.layout?.tituloChat}>
                          <TextInput value={layout.tituloChat} onChange={(v) => patchLayout({ tituloChat: v })} placeholder="Assistente IA" />
                        </SmartField>
                      </AccordionContent>
                    </div>
                  );
                }
                return (
                  <div key={section.key}>
                    <SectionHeader title={section.title} open={open} onToggle={toggle} />
                    <AccordionContent open={open}>
                      <SmartField label={propLabel('tituloChat', 'Título do chat')} codeValue={fromCod.layout?.tituloChat}>
                        <TextInput value={layout.tituloChat} onChange={(v) => patchLayout({ tituloChat: v })} placeholder="Assistente IA" />
                      </SmartField>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-foreground/80">{propLabel('exibirTitulo', 'Exibir título')}</span>
                        <Toggle checked={layout.exibirTitulo} onChange={(v) => patchLayout({ exibirTitulo: v })} />
                      </div>
                      {(!cap || cap.properties?.['placeholderInput']) && (
                        <SmartField label={propLabel('placeholderInput', 'Placeholder do input')} codeValue={fromCod.layout?.placeholderInput}>
                          <TextInput value={layout.placeholderInput} onChange={(v) => patchLayout({ placeholderInput: v })} placeholder="Pergunte sobre os dados..." />
                        </SmartField>
                      )}
                      {(!cap || cap.properties?.['textoBotaoEnviar']) && (
                        <SmartField label={propLabel('textoBotaoEnviar', 'Texto do botão Enviar')} codeValue={fromCod.layout?.textoBotaoEnviar}>
                          <TextInput value={layout.textoBotaoEnviar} onChange={(v) => patchLayout({ textoBotaoEnviar: v })} placeholder="Enviar" />
                        </SmartField>
                      )}
                      {(!cap || cap.properties?.['debugExibirContexto']) && (
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-medium text-foreground/80">{propLabel('debugExibirContexto', 'Debug: exibir contexto')}</span>
                          <Toggle checked={layout.debugExibirContexto} onChange={(v) => patchLayout({ debugExibirContexto: v })} />
                        </div>
                      )}
                    </AccordionContent>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
