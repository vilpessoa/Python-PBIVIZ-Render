import JSZip from 'jszip';
import { extractCapabilities } from './pythonParser/pbivizExtractor';

// Minimal 20x20 transparent PNG (base64)
const ICON_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGD4DwABBAEAWjR/WQAAAABJRU5ErkJggg==';

function extractTripleQuotedBlock(code: string, varName: string): string {
  const re = new RegExp(
    `\\b${varName}\\s*=\\s*r?(?:"""([\\s\\S]*?)"""|'''([\\s\\S]*?)''')`,
  );
  const m = re.exec(code);
  if (!m) return '';
  return m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : '';
}

function extractScalar(code: string, varName: string): string | null {
  const re = new RegExp(`\\b${varName}\\s*=\\s*["']([^"'\\n]+)["']`);
  const m = re.exec(code);
  return m ? m[1] : null;
}

export async function exportPbiviz(code: string): Promise<Blob> {
  const css = extractTripleQuotedBlock(code, 'CSS');
  const js  = extractTripleQuotedBlock(code, 'JS');

  const displayName =
    extractScalar(code, 'DISPLAY_NAME') ??
    extractScalar(code, 'TITULO_CHAT') ??
    'Python Visual';

  const guid = 'PythonVisual' + Date.now();
  const capabilities = extractCapabilities(code) ?? { dataRoles: [], objects: {} };

  const pbivizJson = {
    visual: {
      name: guid,
      displayName,
      guid,
      visualClassName: 'Visual',
      version: '1.0.0',
      description: '',
      supportUrl: '',
      gitHubUrl: '',
    },
    apiVersion: '5.1.0',
    author: { name: '', email: '' },
    assets: { icon: 'assets/icon.png' },
    externalJS: [],
    style: 'resources/visual.css',
    capabilities: 'capabilities.json',
    stringResources: [],
  };

  const packageJson = {
    name: guid.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '1.0.0',
    description: displayName,
    scripts: {},
    dependencies: {},
  };

  const zip = new JSZip();
  zip.file('pbiviz.json', JSON.stringify(pbivizJson, null, 2));
  zip.file('package.json', JSON.stringify(packageJson, null, 2));
  zip.file('capabilities.json', JSON.stringify(capabilities, null, 2));
  zip.file('resources/visual.js', js);
  zip.file('resources/visual.css', css);
  zip.file('assets/icon.png', ICON_PNG_BASE64, { base64: true });

  return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
