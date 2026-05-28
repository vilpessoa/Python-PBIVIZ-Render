const DEFAULT_SAMPLE = `# Galeria de Usuários — Python para HTML
# Dados de exemplo: lista de usuários do sistema

_usuarios = [
    {"nome": "Alice Silva",    "email": "alice@company.com",    "cargo": "Engenheira de Software"},
    {"nome": "Bruno Costa",    "email": "bruno@company.com",    "cargo": "Analista de Dados"},
    {"nome": "Carlos Mendes",  "email": "carlos@company.com",   "cargo": "DevOps Engineer"},
    {"nome": "Diana Oliveira", "email": "diana@company.com",    "cargo": "Product Manager"},
    {"nome": "Eduardo Lima",   "email": "eduardo@company.com",  "cargo": "Tech Lead"},
    {"nome": "Fernanda Gomes", "email": "fernanda@company.com", "cargo": "UX Designer"},
]

_css = """
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 32px 16px;
}
.container {
  max-width: 960px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  overflow: hidden;
}
.header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 28px 32px;
  color: white;
}
.header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.header p  { font-size: 14px; opacity: 0.85; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 24px;
}
.card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: box-shadow .2s, transform .2s;
  background: #fafafa;
}
.card:hover { box-shadow: 0 8px 24px rgba(102,126,234,.2); transform: translateY(-2px); background: white; }
.avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 20px; font-weight: 700;
  flex-shrink: 0;
}
.info .name  { font-weight: 600; font-size: 14px; color: #1e293b; }
.info .email { font-size: 12px; color: #64748b; margin: 2px 0; }
.info .cargo { font-size: 11px; color: #667eea; font-weight: 500; }
</style>
"""

_cards = "".join([
    f'<div class="card"><div class="avatar">{u["nome"][0]}</div><div class="info"><div class="name">{u["nome"]}</div><div class="email">{u["email"]}</div><div class="cargo">{u["cargo"]}</div></div></div>'
    for u in _usuarios
])

_html = f"""
<div class="container">
  <div class="header">
    <h1>👥 Equipe de Tecnologia</h1>
    <p>{len(_usuarios)} profissionais · Sistema Python</p>
  </div>
  <div class="grid">{_cards}</div>
</div>
"""

return _html
`;

export default DEFAULT_SAMPLE;
