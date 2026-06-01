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

export async function exportPbiviz(code: string): Promise<{ blob: Blob; displayName: string }> {
  const css = extractTripleQuotedBlock(code, 'CSS');
  const js  = extractTripleQuotedBlock(code, 'JS');

  const displayName =
    extractScalar(code, 'DISPLAY_NAME') ??
    extractScalar(code, 'TITULO_CHAT') ??
    'Python Visual';

  const version =
    extractScalar(code, 'VERSION') ?? '1.0.0.0';

  const apiVersion =
    extractScalar(code, 'API_VERSION') ?? '2.6.0';

  const guid = extractScalar(code, 'GUID') ?? ('PythonVisual' + Date.now());

  const capabilities = extractCapabilities(code) ?? { dataRoles: [], dataViewMappings: [], objects: {} };

  const iconDataUri = `data:image/png;base64,${ICON_PNG_BASE64}`;

  // Estrutura correta: tudo embutido em resources/<guid>.pbiviz.json
  // Conforme: https://learn.microsoft.com/pt-br/power-bi/developer/visuals/visual-project-structure
  const resourceFileName = `resources/${guid}.pbiviz.json`;

  const pbivizResourceJson = {
    visual: {
      name: guid,
      displayName,
      guid,
      visualClassName: 'Visual',
      version,
      description: '',
      supportUrl: '',
      gitHubUrl: '',
    },
    author: { name: '', email: '' },
    apiVersion,
    style: 'style/visual.less',
    stringResources: {},
    capabilities,
    content: {
      js,
      css,
      iconBase64: iconDataUri,
    },
    visualEntryPoint: '',
    externalJS: [],
    assets: { icon: 'assets/icon.png' },
  };

  const packageJson = {
    version,
    author: { name: '', email: '' },
    resources: [
      { resourceId: 'rId0', sourceType: 5, file: resourceFileName },
    ],
    visual: {
      name: guid,
      displayName,
      guid,
      visualClassName: 'Visual',
      version,
      description: '',
      supportUrl: '',
      gitHubUrl: '',
    },
    metadata: { pbivizjson: { resourceId: 'rId0' } },
  };

  const zip = new JSZip();
  zip.file('package.json', JSON.stringify(packageJson, null, '\t'));
  zip.file(resourceFileName, JSON.stringify(pbivizResourceJson, null, 2));

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return { blob, displayName };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
