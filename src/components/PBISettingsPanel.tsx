import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
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
    <div className="flex w-full items-center border-b border-border bg-surface/80 transition-colors hover:bg-accent/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-1 items-center gap-2 px-3 py-2 text-left"
      >
        <span className="flex-1 text-[11px] font-semibold text-foreground">{title}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {toggleNode && <div className="pr-3">{toggleNode}</div>}
    </div>
  );
}

function Field({
  label,
  children,
  row,
}: {
  label: string;
  children: React.ReactNode;
  row?: boolean;
}) {
  return (
    <div className={`px-3 py-1.5 ${row ? 'flex items-center justify-between gap-2' : 'space-y-1'}`}>
      <label className="shrink-0 text-[10px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
      className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
    />
  );
}

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
      className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
    />
  );
}

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
      className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[18px] w-9 shrink-0 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        checked ? 'border-primary bg-primary' : 'border-border bg-muted/60'
      }`}
    >
      <span
        className={`absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}

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
        className="w-full rounded border border-border bg-background py-1 pl-2 pr-7 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
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

function ColorField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="px-3 py-1.5 space-y-1">
      <span className="block truncate text-[10px] font-medium text-muted-foreground">{label}</span>
      <label className="inline-flex cursor-pointer items-center overflow-hidden rounded border border-border bg-background hover:border-primary/60 transition-colors">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <div className="h-5 w-6" style={{ backgroundColor: value }} />
        <div className="flex h-5 w-4 items-center justify-center border-l border-border">
          <ChevronDown className="h-2 w-2 text-muted-foreground" />
        </div>
      </label>
    </div>
  );
}

function Divider() {
  return <div className="mx-3 border-t border-border/60" />;
}

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

  function resetToDefaults() {
    onChange(DEFAULT_PBI_SETTINGS);
  }

  const { conexao, layout, aparenciaChat } = settings;

  const sections = [
    'Tamanho e estilo',
    'Título',
    'Conexão',
    'Aparência - Chat',
    'Aparência - Tipografia',
    'Aparência - Layout',
  ];

  const filtered = searchQuery.trim()
    ? sections.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : sections;

  const show = (name: string) => filtered.includes(name);

  return (
    <div className="flex h-full w-[272px] shrink-0 flex-col border-l border-border bg-surface shadow-lg">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[11px] font-semibold text-foreground">Formato</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={resetToDefaults}
            title="Restaurar padrões"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1">
          <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar"
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <>
            {/* ── Tamanho e estilo ── */}
            {show('Tamanho e estilo') && (
              <SectionHeader
                title="Tamanho e estilo"
                open={tamanhoOpen}
                onToggle={() => setTamanhoOpen((v) => !v)}
              />
            )}
            {tamanhoOpen && show('Tamanho e estilo') && (
              <div className="py-1">
                <Field label="Largura">
                  <TextInput value="" onChange={() => {}} placeholder="Automático" />
                </Field>
                <Divider />
                <Field label="Altura">
                  <TextInput value="" onChange={() => {}} placeholder="Automático" />
                </Field>
              </div>
            )}

            {/* ── Título ── */}
            {show('Título') && (
              <SectionHeader
                title="Título"
                open={tituloOpen}
                onToggle={() => setTituloOpen((v) => !v)}
                toggleNode={
                  <Toggle
                    checked={layout.exibirTitulo}
                    onChange={(v) => patchLayout({ exibirTitulo: v })}
                  />
                }
              />
            )}
            {tituloOpen && show('Título') && (
              <div className="py-1">
                <Field label="Texto do título">
                  <TextInput
                    value={layout.tituloChat}
                    onChange={(v) => patchLayout({ tituloChat: v })}
                    placeholder="Assistente IA"
                  />
                </Field>
              </div>
            )}

            {/* ── Conexão ── */}
            {show('Conexão') && (
              <SectionHeader
                title="Conexão"
                open={conexaoOpen}
                onToggle={() => setConexaoOpen((v) => !v)}
              />
            )}
            {conexaoOpen && show('Conexão') && (
              <div className="py-1">
                <Field label="Provedor">
                  <SelectInput
                    value={conexao.provedor}
                    onChange={(v) => patchConexao({ provedor: v })}
                    options={PROVEDORES}
                  />
                </Field>
                <Divider />
                <Field label="Chave de API">
                  <PasswordField
                    value={conexao.apiKey}
                    onChange={(v) => patchConexao({ apiKey: v })}
                    placeholder="sk-••••••••••••"
                  />
                </Field>
                <Divider />
                <Field label="ID do Agente">
                  <TextInput
                    value={conexao.agentId}
                    onChange={(v) => patchConexao({ agentId: v })}
                    placeholder="agent-xxxxxxxx"
                  />
                </Field>
                <Divider />
                <Field label="Modelo">
                  <TextInput
                    value={conexao.modelo}
                    onChange={(v) => patchConexao({ modelo: v })}
                    placeholder={conexao.modeloSugerido || 'ex: gpt-4o'}
                  />
                </Field>
                <Divider />
                <Field label="System Prompt">
                  <TextArea
                    value={conexao.systemPrompt}
                    onChange={(v) => patchConexao({ systemPrompt: v })}
                    placeholder="Instruções para o assistente..."
                    rows={4}
                  />
                </Field>
              </div>
            )}

            {/* ── Aparência - Chat ── */}
            {show('Aparência - Chat') && (
              <SectionHeader
                title="Aparência - Chat"
                open={aparenciaChatOpen}
                onToggle={() => setAparenciaChatOpen((v) => !v)}
              />
            )}
            {aparenciaChatOpen && show('Aparência - Chat') && (
              <div className="py-1">
                <ColorField
                  label="Cor de fundo do cabeçalho"
                  value={aparenciaChat.corFundoCabecalho}
                  onChange={(v) => patchAparenciaChat({ corFundoCabecalho: v })}
                />
                <Divider />
                <ColorField
                  label="Cor do texto do cabeçalho"
                  value={aparenciaChat.corTextoCabecalho}
                  onChange={(v) => patchAparenciaChat({ corTextoCabecalho: v })}
                />
                <Divider />
                <ColorField
                  label="Cor de fundo do chat"
                  value={aparenciaChat.corFundoChat}
                  onChange={(v) => patchAparenciaChat({ corFundoChat: v })}
                />
                <Divider />
                <ColorField
                  label="Cor das bolhas do usuário"
                  value={aparenciaChat.corBolhasUsuario}
                  onChange={(v) => patchAparenciaChat({ corBolhasUsuario: v })}
                />
                <Divider />
                <ColorField
                  label="Cor das bolhas do assistente"
                  value={aparenciaChat.corBolhasAssistente}
                  onChange={(v) => patchAparenciaChat({ corBolhasAssistente: v })}
                />
              </div>
            )}

            {/* ── Aparência - Tipografia ── */}
            {show('Aparência - Tipografia') && (
              <SectionHeader
                title="Aparência - Tipografia"
                open={aparenciaTipografiaOpen}
                onToggle={() => setAparenciaTipografiaOpen((v) => !v)}
              />
            )}
            {aparenciaTipografiaOpen && show('Aparência - Tipografia') && (
              <div className="py-1">
                <Field label="Família de fonte">
                  <SelectInput
                    value="default"
                    onChange={() => {}}
                    options={[
                      { value: 'default', label: 'Padrão' },
                      { value: 'sans', label: 'Sans-serif' },
                      { value: 'mono', label: 'Monospace' },
                    ]}
                  />
                </Field>
                <Divider />
                <Field label="Tamanho da fonte">
                  <TextInput value="12" onChange={() => {}} placeholder="12" />
                </Field>
              </div>
            )}

            {/* ── Aparência - Layout ── */}
            {show('Aparência - Layout') && (
              <SectionHeader
                title="Aparência - Layout"
                open={aparenciaLayoutOpen}
                onToggle={() => setAparenciaLayoutOpen((v) => !v)}
              />
            )}
            {aparenciaLayoutOpen && show('Aparência - Layout') && (
              <div className="py-1">
                <Field label="Placeholder do input">
                  <TextInput
                    value={layout.placeholderInput}
                    onChange={(v) => patchLayout({ placeholderInput: v })}
                    placeholder="Pergunte sobre os dados..."
                  />
                </Field>
                <Divider />
                <Field label="Texto do botão enviar">
                  <TextInput
                    value={layout.textoBotaoEnviar}
                    onChange={(v) => patchLayout({ textoBotaoEnviar: v })}
                    placeholder="Enviar"
                  />
                </Field>
                <Divider />
                <Field label="Debug: exibir contexto" row>
                  <Toggle
                    checked={layout.debugExibirContexto}
                    onChange={(v) => patchLayout({ debugExibirContexto: v })}
                  />
                </Field>
              </div>
            )}
        </>
      </div>

      {/* Footer hint */}
      <div className="shrink-0 border-t border-border px-3 py-2">
        <p className="text-[10px] text-muted-foreground/70">
          Alterações aplicadas automaticamente ao preview.
        </p>
      </div>
    </div>
  );
}
