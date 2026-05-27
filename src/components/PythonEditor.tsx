import { useEffect, useRef } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { history, historyKeymap, defaultKeymap, indentWithTab } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { githubLight } from "@uiw/codemirror-theme-github";

export interface PythonEditorProps {
  value: string;
  onChange: (v: string) => void;
  theme: "default" | "dracula";
  fontSize: number;
  onSave?: () => void;
  onRun?: () => void;
  onClear?: () => void;
}

export function PythonEditor({ value, onChange, theme, fontSize, onSave, onRun, onClear }: PythonEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeComp = useRef(new Compartment());
  const fontComp = useRef(new Compartment());

  useEffect(() => {
    if (!hostRef.current) return;
    const onSaveRef = { current: onSave };
    const onRunRef = { current: onRun };
    const onClearRef = { current: onClear };
    (viewRef as any).callbacks = { onSaveRef, onRunRef, onClearRef };

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          search({ top: true }),
          python(),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            indentWithTab,
            { key: "Mod-s", preventDefault: true, run: () => { onSaveRef.current?.(); return true; } },
            { key: "Mod-Enter", preventDefault: true, run: () => { onRunRef.current?.(); return true; } },
            { key: "Mod-l", preventDefault: true, run: () => { onClearRef.current?.(); return true; } },
          ]),
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChange(u.state.doc.toString());
          }),
          themeComp.current.of(theme === "dracula" ? dracula : githubLight),
          fontComp.current.of(EditorView.theme({ "&": { fontSize: fontSize + "px" } })),
        ],
      }),
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update callbacks without rebuilding the view
  useEffect(() => {
    const cbs = (viewRef as any).callbacks;
    if (cbs) {
      cbs.onSaveRef.current = onSave;
      cbs.onRunRef.current = onRun;
      cbs.onClearRef.current = onClear;
    }
  }, [onSave, onRun, onClear]);

  useEffect(() => {
    const v = viewRef.current; if (!v) return;
    v.dispatch({ effects: themeComp.current.reconfigure(theme === "dracula" ? dracula : githubLight) });
  }, [theme]);

  useEffect(() => {
    const v = viewRef.current; if (!v) return;
    v.dispatch({ effects: fontComp.current.reconfigure(EditorView.theme({ "&": { fontSize: fontSize + "px" } })) });
  }, [fontSize]);

  useEffect(() => {
    const v = viewRef.current; if (!v) return;
    const cur = v.state.doc.toString();
    if (cur !== value) {
      v.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} className="h-full w-full overflow-hidden" />;
}
