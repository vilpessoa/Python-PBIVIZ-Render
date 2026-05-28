import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  MoreHorizontal,
  ChevronsRight,
  Code2,
  Plus,
  Trash2,
  Database,
} from 'lucide-react';
import type { PBISettings, PBIDadosColuna, PBIDadosMedida } from '@/lib/storage';
import { DEFAULT_PBI_SETTINGS, DEFAULT_PBI_DADOS } from '@/lib/storage';
import type { ExtractedPbivizConfig } from '@/lib/pythonParser/types';

interface Props {
  settings: PBISettings;
  onChange: (s: PBISettings) => void;
  onClose: () => void;
  extractedFromCode?: ExtractedPbivizConfig;
}

const PROVEDORES = [
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

/* ── Color picker ── */
function ColorField({ value, onChange, label, disabled }: {
  value: string; onChange: (v: string) => void; label: string; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="truncate text-[12px] font-medium text-foreground/80">{label}</span>
      <label
        className={`inline-flex cursor-pointer items-stretch overflow-hidden rounded border border-border bg-background transition-colors hover:border-foreground/40 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        style={{ width: 'fit-content' }}
      >
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" disabled={disabled} />
        <div className="h-7 w-7 shrink-0" style={{ backgroundColor: value }} />
        <div className="flex h-7 w-9 items-center justify-center border-l border-border bg-background">
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      </label>
    </div>
  );
}

/* ── Field wrapper ── */
function Field({ label, children, row }: { label: string; children: React.ReactNode; row?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${row ? 'flex-row items-center justify-between' : ''}`}>
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

/* ════════════════════════════════════════
   ABA DADOS — colunas e medidas mock
   ════════════════════════════════════════ */
function DadosTab({ settings, onChange }: { settings: PBISettings; onChange: (s: PBISettings) => void }) {
  const { colunas, medidas } = settings.dados;

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

      {/* Colunas */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[13px] font-medium text-foreground">Colunas</span>
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
          <span className="text-[13px] font-medium text-foreground">Medidas</span>
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
export function PBISettingsPanel({ settings, onChange, onClose, extractedFromCode }: Props) {
  const [activeTab, setActiveTab] = useState<'formato' | 'dados'>('formato');
  const [searchQuery, setSearchQuery] = useState('');
  const [tamanhoOpen, setTamanhoOpen] = useState(false);
  const [tituloOpen, setTituloOpen] = useState(false);
  const [conexaoOpen, setConexaoOpen] = useState(false);
  const [aparenciaChatOpen, setAparenciaChatOpen] = useState(true);
  const [aparenciaTipografiaOpen, setAparenciaTipografiaOpen] = useState(false);
  const [aparenciaLayoutOpen, setAparenciaLayoutOpen] = useState(false);

  function patchConexao(patch: Partial<typeof settings.conexao>) {
    onChange({ ...settings, conexao: { ...settings.conexao, ...patch } });
  }
  function patchLayout(patch: Partial<typeof settings.layout>) {
    onChange({ ...settings, layout: { ...settings.layout, ...patch } });
  }
  function patchAparenciaChat(patch: Partial<typeof settings.aparenciaChat>) {
    onChange({ ...settings, aparenciaChat: { ...settings.aparenciaChat, ...patch } });
  }

  const { conexao, layout, aparenciaChat } = settings;
  const fromCod = extractedFromCode ?? {};

  // Conta quantos campos estão sendo lidos do código Python
  const fromCodeCount = [
    fromCod.conexao?.apiKey, fromCod.conexao?.provedor, fromCod.conexao?.agentId,
    fromCod.conexao?.modelo, fromCod.conexao?.systemPrompt,
    fromCod.layout?.tituloChat, fromCod.layout?.placeholderInput, fromCod.layout?.textoBotaoEnviar,
    fromCod.aparenciaChat?.corFundoCabecalho, fromCod.aparenciaChat?.corTextoCabecalho,
    fromCod.aparenciaChat?.corFundoChat, fromCod.aparenciaChat?.corBolhasUsuario,
    fromCod.aparenciaChat?.corBolhasAssistente,
  ].filter((v) => v !== undefined).length;

  const allSections = ['Tamanho e estilo', 'Título', 'Conexão', 'Aparência - Chat', 'Aparência - Tipografia', 'Aparência - Layout'];
  const filtered = searchQuery.trim()
    ? allSections.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : allSections;
  const show = (name: string) => filtered.includes(name);

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col bg-muted/30 shadow-lg">

      {/* ── Header ── */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-foreground">Formato</span>
          {fromCodeCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <Code2 className="h-2.5 w-2.5" />
              {fromCodeCount} do código
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_PBI_SETTINGS)}
            title="Restaurar padrões"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Mais opções"
          >
            <MoreHorizontal className="h-4 w-4" />
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
          onClick={() => setActiveTab('formato')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors ${
            activeTab === 'formato'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Formato
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
          <DadosTab settings={settings} onChange={onChange} />
        </div>
      )}

      {/* ── Aba Formato ── */}
      {activeTab === 'formato' && <>

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

        {/* Accordion sections */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">

          {/* Tamanho e estilo */}
          {show('Tamanho e estilo') && <>
            <SectionHeader title="Tamanho e estilo" open={tamanhoOpen} onToggle={() => setTamanhoOpen(v => !v)} />
            <AccordionContent open={tamanhoOpen}>
              <Field label="Largura"><TextInput value="" onChange={() => {}} placeholder="Automático" /></Field>
              <Field label="Altura"><TextInput value="" onChange={() => {}} placeholder="Automático" /></Field>
            </AccordionContent>
          </>}

          {/* Título */}
          {show('Título') && <>
            <SectionHeader
              title="Título"
              open={tituloOpen}
              onToggle={() => setTituloOpen(v => !v)}
              toggleNode={<Toggle checked={layout.exibirTitulo} onChange={(v) => patchLayout({ exibirTitulo: v })} />}
            />
            <AccordionContent open={tituloOpen}>
              <SmartField label="Texto do título" codeValue={fromCod.layout?.tituloChat}>
                <TextInput
                  value={layout.tituloChat}
                  onChange={(v) => patchLayout({ tituloChat: v })}
                  placeholder="Assistente IA"
                />
              </SmartField>
            </AccordionContent>
          </>}

          {/* Conexão */}
          {show('Conexão') && <>
            <SectionHeader title="Conexão" open={conexaoOpen} onToggle={() => setConexaoOpen(v => !v)} />
            <AccordionContent open={conexaoOpen}>
              <SmartField label="Provedor" codeValue={fromCod.conexao?.provedor}>
                <SelectInput value={conexao.provedor} onChange={(v) => patchConexao({ provedor: v })} options={PROVEDORES} />
              </SmartField>
              <SmartPassword
                label="Chave de API"
                codeValue={fromCod.conexao?.apiKey}
                value={conexao.apiKey}
                onChange={(v) => patchConexao({ apiKey: v })}
              />
              <SmartField label="ID do Agente" codeValue={fromCod.conexao?.agentId}>
                <TextInput value={conexao.agentId} onChange={(v) => patchConexao({ agentId: v })} placeholder="agent-xxxxxxxx" />
              </SmartField>
              <SmartField label="Modelo" codeValue={fromCod.conexao?.modelo}>
                <TextInput value={conexao.modelo} onChange={(v) => patchConexao({ modelo: v })} placeholder={conexao.modeloSugerido || 'ex: gpt-4o'} />
              </SmartField>
              {fromCod.conexao?.systemPrompt !== undefined ? (
                <CodeField label="System Prompt" value={fromCod.conexao.systemPrompt} multiline />
              ) : (
                <Field label="System Prompt">
                  <TextArea value={conexao.systemPrompt} onChange={(v) => patchConexao({ systemPrompt: v })} placeholder="Instruções para o assistente..." rows={4} />
                </Field>
              )}
            </AccordionContent>
          </>}

          {/* Aparência - Chat */}
          {show('Aparência - Chat') && <>
            <SectionHeader title="Aparência - Chat" open={aparenciaChatOpen} onToggle={() => setAparenciaChatOpen(v => !v)} />
            <AccordionContent open={aparenciaChatOpen}>
              <SmartColor
                label="Cor de fundo do cabeçalho"
                codeValue={fromCod.aparenciaChat?.corFundoCabecalho}
                value={aparenciaChat.corFundoCabecalho}
                onChange={(v) => patchAparenciaChat({ corFundoCabecalho: v })}
              />
              <SmartColor
                label="Cor do texto do cabeçalho"
                codeValue={fromCod.aparenciaChat?.corTextoCabecalho}
                value={aparenciaChat.corTextoCabecalho}
                onChange={(v) => patchAparenciaChat({ corTextoCabecalho: v })}
              />
              <SmartColor
                label="Cor de fundo do chat"
                codeValue={fromCod.aparenciaChat?.corFundoChat}
                value={aparenciaChat.corFundoChat}
                onChange={(v) => patchAparenciaChat({ corFundoChat: v })}
              />
              <SmartColor
                label="Cor das bolhas do usuário"
                codeValue={fromCod.aparenciaChat?.corBolhasUsuario}
                value={aparenciaChat.corBolhasUsuario}
                onChange={(v) => patchAparenciaChat({ corBolhasUsuario: v })}
              />
              <SmartColor
                label="Cor das bolhas do assistente"
                codeValue={fromCod.aparenciaChat?.corBolhasAssistente}
                value={aparenciaChat.corBolhasAssistente}
                onChange={(v) => patchAparenciaChat({ corBolhasAssistente: v })}
              />
            </AccordionContent>
          </>}

          {/* Aparência - Tipografia */}
          {show('Aparência - Tipografia') && <>
            <SectionHeader title="Aparência - Tipografia" open={aparenciaTipografiaOpen} onToggle={() => setAparenciaTipografiaOpen(v => !v)} />
            <AccordionContent open={aparenciaTipografiaOpen}>
              <Field label="Família de fonte">
                <SelectInput value="default" onChange={() => {}} options={[
                  { value: 'default', label: 'Padrão' },
                  { value: 'sans', label: 'Sans-serif' },
                  { value: 'mono', label: 'Monospace' },
                ]} />
              </Field>
              <Field label="Tamanho da fonte">
                <TextInput value="12" onChange={() => {}} placeholder="12" />
              </Field>
            </AccordionContent>
          </>}

          {/* Aparência - Layout */}
          {show('Aparência - Layout') && <>
            <SectionHeader title="Aparência - Layout" open={aparenciaLayoutOpen} onToggle={() => setAparenciaLayoutOpen(v => !v)} />
            <AccordionContent open={aparenciaLayoutOpen}>
              <SmartField label="Placeholder do input" codeValue={fromCod.layout?.placeholderInput}>
                <TextInput value={layout.placeholderInput} onChange={(v) => patchLayout({ placeholderInput: v })} placeholder="Pergunte sobre os dados..." />
              </SmartField>
              <SmartField label="Texto do botão enviar" codeValue={fromCod.layout?.textoBotaoEnviar}>
                <TextInput value={layout.textoBotaoEnviar} onChange={(v) => patchLayout({ textoBotaoEnviar: v })} placeholder="Enviar" />
              </SmartField>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-foreground/80">Debug: exibir contexto</span>
                <Toggle checked={layout.debugExibirContexto} onChange={(v) => patchLayout({ debugExibirContexto: v })} />
              </div>
            </AccordionContent>
          </>}

        </div>
      </>}
    </div>
  );
}
