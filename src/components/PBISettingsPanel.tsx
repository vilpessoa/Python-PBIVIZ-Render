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
} from 'lucide-react';
import type { PBISettings } from '@/lib/storage';
import { DEFAULT_PBI_SETTINGS } from '@/lib/storage';

interface Props {
  settings: PBISettings;
  onChange: (s: PBISettings) => void;
  onClose: () => void;
}

const PROVEDORES = [
  { value: 'tess', label: 'Tess AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'custom', label: 'Personalizado' },
];

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
  title,
  open,
  onToggle,
  toggleNode,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  toggleNode?: React.ReactNode;
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

/* ── Accordion content wrapper ── */
function AccordionContent({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden border-b border-border transition-[max-height] duration-300 ease-in-out"
      style={{ maxHeight: open ? 800 : 0 }}
    >
      <div className="flex flex-col gap-3 px-4 py-3">{children}</div>
    </div>
  );
}

/* ── Text input ── */
function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
      className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
    />
  );
}

/* ── Textarea ── */
function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      spellCheck={false}
      className="w-full resize-none rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
    />
  );
}

/* ── Select ── */
function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Password field ── */
function PasswordField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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

/* ── Color picker — connected swatch + chevron ── */
function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="truncate text-[12px] font-medium text-foreground/80">{label}</span>
      <label className="inline-flex cursor-pointer items-stretch overflow-hidden rounded border border-border bg-background transition-colors hover:border-foreground/40" style={{ width: 'fit-content' }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <div className="h-7 w-7 shrink-0" style={{ backgroundColor: value }} />
        <div className="flex h-7 w-9 items-center justify-center border-l border-border bg-background">
          <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      </label>
    </div>
  );
}

/* ── Field wrapper for non-color fields ── */
function Field({ label, children, row }: { label: string; children: React.ReactNode; row?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${row ? 'flex-row items-center justify-between' : ''}`}>
      <span className="text-[12px] font-medium text-foreground/80">{label}</span>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */

export function PBISettingsPanel({ settings, onChange, onClose }: Props) {
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

  const allSections = [
    'Tamanho e estilo',
    'Título',
    'Conexão',
    'Aparência - Chat',
    'Aparência - Tipografia',
    'Aparência - Layout',
  ];
  const filtered = searchQuery.trim()
    ? allSections.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : allSections;
  const show = (name: string) => filtered.includes(name);

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col bg-muted/30 shadow-lg">

      {/* ── Header ── */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <span className="text-[15px] font-semibold text-foreground">Formato</span>
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

      {/* ── Search ── */}
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

      {/* ── Accordion sections ── */}
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
            <Field label="Texto do título">
              <TextInput value={layout.tituloChat} onChange={(v) => patchLayout({ tituloChat: v })} placeholder="Assistente IA" />
            </Field>
          </AccordionContent>
        </>}

        {/* Conexão */}
        {show('Conexão') && <>
          <SectionHeader title="Conexão" open={conexaoOpen} onToggle={() => setConexaoOpen(v => !v)} />
          <AccordionContent open={conexaoOpen}>
            <Field label="Provedor">
              <SelectInput value={conexao.provedor} onChange={(v) => patchConexao({ provedor: v })} options={PROVEDORES} />
            </Field>
            <Field label="Chave de API">
              <PasswordField value={conexao.apiKey} onChange={(v) => patchConexao({ apiKey: v })} placeholder="sk-••••••••••••" />
            </Field>
            <Field label="ID do Agente">
              <TextInput value={conexao.agentId} onChange={(v) => patchConexao({ agentId: v })} placeholder="agent-xxxxxxxx" />
            </Field>
            <Field label="Modelo">
              <TextInput value={conexao.modelo} onChange={(v) => patchConexao({ modelo: v })} placeholder={conexao.modeloSugerido || 'ex: gpt-4o'} />
            </Field>
            <Field label="System Prompt">
              <TextArea value={conexao.systemPrompt} onChange={(v) => patchConexao({ systemPrompt: v })} placeholder="Instruções para o assistente..." rows={4} />
            </Field>
          </AccordionContent>
        </>}

        {/* Aparência - Chat */}
        {show('Aparência - Chat') && <>
          <SectionHeader title="Aparência - Chat" open={aparenciaChatOpen} onToggle={() => setAparenciaChatOpen(v => !v)} />
          <AccordionContent open={aparenciaChatOpen}>
            <ColorField label="Cor de fundo do cabeçalho" value={aparenciaChat.corFundoCabecalho} onChange={(v) => patchAparenciaChat({ corFundoCabecalho: v })} />
            <ColorField label="Cor do texto do cabeçalho" value={aparenciaChat.corTextoCabecalho} onChange={(v) => patchAparenciaChat({ corTextoCabecalho: v })} />
            <ColorField label="Cor de fundo do chat" value={aparenciaChat.corFundoChat} onChange={(v) => patchAparenciaChat({ corFundoChat: v })} />
            <ColorField label="Cor das bolhas do usuário" value={aparenciaChat.corBolhasUsuario} onChange={(v) => patchAparenciaChat({ corBolhasUsuario: v })} />
            <ColorField label="Cor das bolhas do assistente" value={aparenciaChat.corBolhasAssistente} onChange={(v) => patchAparenciaChat({ corBolhasAssistente: v })} />
          </AccordionContent>
        </>}

        {/* Aparência - Tipografia */}
        {show('Aparência - Tipografia') && <>
          <SectionHeader title="Aparência - Tipografia" open={aparenciaTipografiaOpen} onToggle={() => setAparenciaTipografiaOpen(v => !v)} />
          <AccordionContent open={aparenciaTipografiaOpen}>
            <Field label="Família de fonte">
              <SelectInput value="default" onChange={() => {}} options={[{ value: 'default', label: 'Padrão' }, { value: 'sans', label: 'Sans-serif' }, { value: 'mono', label: 'Monospace' }]} />
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
            <Field label="Placeholder do input">
              <TextInput value={layout.placeholderInput} onChange={(v) => patchLayout({ placeholderInput: v })} placeholder="Pergunte sobre os dados..." />
            </Field>
            <Field label="Texto do botão enviar">
              <TextInput value={layout.textoBotaoEnviar} onChange={(v) => patchLayout({ textoBotaoEnviar: v })} placeholder="Enviar" />
            </Field>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-foreground/80">Debug: exibir contexto</span>
              <Toggle checked={layout.debugExibirContexto} onChange={(v) => patchLayout({ debugExibirContexto: v })} />
            </div>
          </AccordionContent>
        </>}

      </div>
    </div>
  );
}
