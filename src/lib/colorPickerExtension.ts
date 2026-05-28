import { ViewPlugin, Decoration, WidgetType, type DecorationSet, EditorView } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';

const HEX_REGEX = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])|#[0-9A-Fa-f]{3}(?![0-9A-Fa-f])/g;

export interface SwatchClickInfo {
  color: string;
  from: number;
  to: number;
  rect: DOMRect;
}

export type SwatchClickCallback = (info: SwatchClickInfo) => void;

class ColorSwatchWidget extends WidgetType {
  color: string;
  from: number;
  to: number;
  callbackRef: { current: SwatchClickCallback | null };

  constructor(
    color: string,
    from: number,
    to: number,
    callbackRef: { current: SwatchClickCallback | null },
  ) {
    super();
    this.color = color;
    this.from = from;
    this.to = to;
    this.callbackRef = callbackRef;
  }

  eq(other: ColorSwatchWidget) {
    return other.color === this.color && other.from === this.from && other.to === this.to;
  }

  toDOM() {
    const span = document.createElement('span');
    span.title = this.color;
    Object.assign(span.style, {
      display: 'inline-block',
      width: '10px',
      height: '10px',
      backgroundColor: this.color,
      borderRadius: '2px',
      border: '1px solid rgba(128,128,128,0.4)',
      marginRight: '3px',
      cursor: 'pointer',
      verticalAlign: 'middle',
      position: 'relative',
      top: '-1px',
      flexShrink: '0',
    });
    span.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cb = this.callbackRef.current;
      if (cb) {
        cb({ color: this.color, from: this.from, to: this.to, rect: span.getBoundingClientRect() });
      }
    });
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

export function colorPickerExtension(callbackRef: { current: SwatchClickCallback | null }): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const { from, to } = view.viewport;
        const text = view.state.doc.sliceString(from, to);
        const matches: Array<{ color: string; from: number; to: number }> = [];

        HEX_REGEX.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = HEX_REGEX.exec(text)) !== null) {
          matches.push({
            color: m[0].toUpperCase(),
            from: from + m.index,
            to: from + m.index + m[0].length,
          });
        }

        matches.sort((a, b) => a.from - b.from);

        for (const match of matches) {
          builder.add(
            match.from,
            match.from,
            Decoration.widget({
              widget: new ColorSwatchWidget(match.color, match.from, match.to, callbackRef),
              side: -1,
            }),
          );
        }

        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
}
