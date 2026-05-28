import { useState } from 'react';
import { ChevronDown, ChevronRight, X, Eye, EyeOff, RotateCcw } from 'lucide-react';
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
  icon,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 border-b border-border bg-surface/80 px-3 py-2 text-left transition-colors hover:bg-accent/40"
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-widest text-foreground">
        {title}
      </span>
      {open ? (
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
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
      <label className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
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
      className={`relative h-4 w-8 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
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

function Divider() {
  return <div className="mx-3 border-t border-border/60" />;
}

export function PBISettingsPanel({ settings, onChange, onClose }: Props) {
  const [conexaoOpen, setConexaoOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(true);

  function patchConexao(patch: Partial<typeof settings.conexao>) {
    onChange({ ...settings, conexao: { ...settings.conexao, ...patch } });
  }

  function patchLayout(patch: Partial<typeof settings.layout>) {
    onChange({ ...settings, layout: { ...settings.layout, ...patch } });
  }

  function resetToDefaults() {
    onChange(DEFAULT_PBI_SETTINGS);
  }

  const { conexao, layout } = settings;

  return (
    <div className="flex h-full w-[272px] shrink-0 flex-col border-l border-border bg-surface">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-foreground">Formato Visual</span>
        </div>
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
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Seção Conexão ── */}
        <SectionHeader
          title="Conexão"
          open={conexaoOpen}
          onToggle={() => setConexaoOpen((v) => !v)}
          icon={
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          }
        />

        {conexaoOpen && (
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

        {/* ── Seção Layout ── */}
        <SectionHeader
          title="Layout"
          open={layoutOpen}
          onToggle={() => setLayoutOpen((v) => !v)}
          icon={
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />

        {layoutOpen && (
          <div className="py-1">
            <Field label="Título do Chat">
              <TextInput
                value={layout.tituloChat}
                onChange={(v) => patchLayout({ tituloChat: v })}
                placeholder="Assistente IA"
              />
            </Field>

            <Divider />

            <Field label="Exibir Título" row>
              <Toggle
                checked={layout.exibirTitulo}
                onChange={(v) => patchLayout({ exibirTitulo: v })}
              />
            </Field>

            <Divider />

            <Field label="Placeholder Input">
              <TextInput
                value={layout.placeholderInput}
                onChange={(v) => patchLayout({ placeholderInput: v })}
                placeholder="Pergunte sobre os dados..."
              />
            </Field>

            <Divider />

            <Field label="Botão Enviar">
              <TextInput
                value={layout.textoBotaoEnviar}
                onChange={(v) => patchLayout({ textoBotaoEnviar: v })}
                placeholder="Enviar"
              />
            </Field>

            <Divider />

            <Field label="Debug: Exibir Contexto" row>
              <Toggle
                checked={layout.debugExibirContexto}
                onChange={(v) => patchLayout({ debugExibirContexto: v })}
              />
            </Field>
          </div>
        )}
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
