function generateAvatarSvg(index: number): string {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
  const color = colors[index % colors.length];
  const letter = String.fromCharCode(65 + (index % 26));
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><circle cx='20' cy='20' r='20' fill='${encodeURIComponent(color)}'/><text x='20' y='26' text-anchor='middle' font-size='18' font-family='Arial' fill='white'>${letter}</text></svg>`;
}

function isImageUrl(src: string): boolean {
  if (src.startsWith('/avatars/')) return true;
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(src) ||
    /\/(photos?|images?|avatars?|profile)\//i.test(src);
}

export function processHtml(html: string): string {
  // Replace placeholder/broken image URLs with generated avatars
  let result = html;
  let avatarIndex = 0;
  result = result.replace(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
    if (isImageUrl(src)) {
      const avatar = generateAvatarSvg(avatarIndex++);
      return `<img${before}src="${avatar}"${after}>`;
    }
    return match;
  });

  // Inject custom scrollbar CSS
  const scrollbarCss = `<style>
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(100,100,100,0.3);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(100,100,100,0.5)}
*{scrollbar-width:thin;scrollbar-color:rgba(100,100,100,0.3) transparent}
</style>`;

  if (!result.includes('<style') && !result.includes('<html')) {
    result = scrollbarCss + result;
  }

  return result;
}
