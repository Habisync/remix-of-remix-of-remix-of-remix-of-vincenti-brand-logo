import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "@/lib/editorStore";
import { supabase } from "@/integrations/supabase/client";
import { Sliders, Sparkles, Globe, Loader2, Wand2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "props", label: "Props", icon: Sliders },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "seo", label: "SEO", icon: Globe },
];

function flatten(obj, prefix = "") {
  const out = [];
  Object.entries(obj || {}).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v === null || v === undefined) out.push([key, ""]);
    else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out.push([key, v]);
    else if (Array.isArray(v)) out.push([key, v]);
    else out.push(...flatten(v, key));
  });
  return out;
}

function setDeep(obj, path, value) {
  const keys = path.split(".");
  const out = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = cur[k] && typeof cur[k] === "object" ? (Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] }) : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return out;
}

function PropsTab() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const blocks = useEditorStore((s) => s.blocks);
  const replaceData = useEditorStore((s) => s.replaceData);
  const block = blocks.find((b) => b.id === selectedId);
  const [mode, setMode] = useState("form"); // form | json
  const [jsonText, setJsonText] = useState("");
  const [jsonErr, setJsonErr] = useState(null);

  useEffect(() => {
    if (block) setJsonText(JSON.stringify(block.data || {}, null, 2));
    setJsonErr(null);
  }, [selectedId]);

  if (!block) {
    return (
      <div className="p-6 text-xs text-[#6a6a6e] text-center">
        Select a block on the canvas to edit its properties.
      </div>
    );
  }

  const entries = flatten(block.data || {});

  const applyForm = (path, value) => {
    const next = setDeep(block.data || {}, path, value);
    replaceData(block.id, next);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      replaceData(block.id, parsed);
      setJsonErr(null);
      toast.success("Props updated");
    } catch (e) {
      setJsonErr(e.message);
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e]">Block</div>
          <div className="text-sm text-[#D4AF37] font-medium">{block.type}</div>
        </div>
        <div className="flex items-center bg-[#0f0f10] rounded ring-1 ring-[#1a1a1d] text-[10px]">
          {["form", "json"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-1 uppercase tracking-[0.18em] ${mode === m ? "text-[#D4AF37]" : "text-[#6a6a6e] hover:text-[#f0ede8]"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "form" ? (
        entries.length === 0 ? (
          <div className="text-xs text-[#6a6a6e] py-4 text-center">
            This block has no editable props yet. Click directly on text in the canvas to edit, or switch to JSON mode.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(([key, val]) => (
              <div key={key}>
                <label className="block text-[10px] uppercase tracking-[0.18em] text-[#6a6a6e] mb-1">{key}</label>
                {Array.isArray(val) ? (
                  <textarea
                    rows={Math.min(8, val.length + 1)}
                    defaultValue={JSON.stringify(val, null, 2)}
                    onBlur={(e) => {
                      try { applyForm(key, JSON.parse(e.target.value)); }
                      catch { toast.error(`Invalid JSON for ${key}`); }
                    }}
                    className="w-full bg-[#0f0f10] text-[#f0ede8] text-xs px-2 py-1.5 rounded ring-1 ring-[#1a1a1d] focus:ring-[#D4AF37]/60 outline-none font-mono"
                  />
                ) : typeof val === "boolean" ? (
                  <button
                    onClick={() => applyForm(key, !val)}
                    className={`px-2 py-1 text-xs rounded ring-1 ${val ? "bg-[#D4AF37]/10 ring-[#D4AF37]/40 text-[#D4AF37]" : "ring-[#1a1a1d] text-[#A1A1AA]"}`}
                  >
                    {String(val)}
                  </button>
                ) : (
                  <input
                    type={typeof val === "number" ? "number" : "text"}
                    defaultValue={val}
                    onBlur={(e) => {
                      const v = typeof val === "number" ? Number(e.target.value) : e.target.value;
                      applyForm(key, v);
                    }}
                    className="w-full bg-[#0f0f10] text-[#f0ede8] text-xs px-2 py-1.5 rounded ring-1 ring-[#1a1a1d] focus:ring-[#D4AF37]/60 outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={18}
            className="w-full bg-[#0f0f10] text-[#f0ede8] text-xs px-2 py-2 rounded ring-1 ring-[#1a1a1d] focus:ring-[#D4AF37]/60 outline-none font-mono"
          />
          {jsonErr && (
            <div className="text-[11px] text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {jsonErr}
            </div>
          )}
          <button
            onClick={applyJson}
            className="w-full px-3 py-1.5 text-xs font-semibold rounded bg-[#D4AF37] text-[#0a0a0b] hover:bg-[#E5C158]"
          >
            Apply JSON
          </button>
        </div>
      )}
    </div>
  );
}

const QUICK_PROMPTS = [
  "Make it more luxurious and editorial",
  "Tighten copy — cut 30% of words",
  "Make headline more urgent",
  "Rewrite for property owners",
];

function AITab() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const blocks = useEditorStore((s) => s.blocks);
  const replaceData = useEditorStore((s) => s.replaceData);
  const block = blocks.find((b) => b.id === selectedId);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!block || !prompt.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("cms-ai-generate", {
        body: {
          sectionKey: `block:${block.type}`,
          sectionLabel: block.type,
          currentContent: block.data || {},
          prompt,
          mode: "refine",
        },
      });
      if (error) throw error;
      const content = data?.content;
      if (content && typeof content === "object") {
        replaceData(block.id, content);
        toast.success("Block refined by AI");
      } else {
        toast.error("AI returned no usable content");
      }
    } catch (e) {
      toast.error(e.message || "AI request failed");
    } finally {
      setBusy(false);
    }
  };

  if (!block) {
    return <div className="p-6 text-xs text-[#6a6a6e] text-center">Select a block to refine with AI.</div>;
  }

  return (
    <div className="p-3 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e]">Refining</div>
        <div className="text-sm text-[#D4AF37] font-medium">{block.type}</div>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={5}
        placeholder="Describe the change you want…"
        className="w-full bg-[#0f0f10] text-[#f0ede8] text-xs px-2 py-2 rounded ring-1 ring-[#1a1a1d] focus:ring-[#D4AF37]/60 outline-none"
      />
      <div className="grid grid-cols-2 gap-1.5">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            onClick={() => setPrompt((p) => (p ? p + ". " + q : q))}
            className="text-left text-[10px] text-[#A1A1AA] hover:text-[#D4AF37] bg-[#0f0f10] ring-1 ring-[#1a1a1d] hover:ring-[#D4AF37]/40 rounded px-2 py-1.5"
          >
            {q}
          </button>
        ))}
      </div>
      <button
        onClick={run}
        disabled={busy || !prompt.trim()}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-[#D4AF37] text-[#0a0a0b] hover:bg-[#E5C158] disabled:opacity-40"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        Generate
      </button>
    </div>
  );
}

function SeoTab() {
  const slug = useEditorStore((s) => s.slug);
  const seo = useEditorStore((s) => s.seo);
  const setSeo = useEditorStore((s) => s.setSeo);

  const fields = [
    { key: "title", label: "Title", hint: "<60 chars" },
    { key: "description", label: "Meta description", hint: "<160 chars", textarea: true },
    { key: "keywords", label: "Keywords" },
    { key: "ogImage", label: "Open Graph image URL" },
    { key: "canonical", label: "Canonical URL" },
  ];

  return (
    <div className="p-3 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e]">SEO</div>
        <div className="text-sm text-[#D4AF37] font-medium capitalize">{slug}</div>
      </div>
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-[#6a6a6e] mb-1">
            {f.label} {f.hint && <span className="text-[#3a3a3e] normal-case">· {f.hint}</span>}
          </label>
          {f.textarea ? (
            <textarea
              rows={3}
              value={seo?.[f.key] || ""}
              onChange={(e) => setSeo({ [f.key]: e.target.value })}
              className="w-full bg-[#0f0f10] text-[#f0ede8] text-xs px-2 py-1.5 rounded ring-1 ring-[#1a1a1d] focus:ring-[#D4AF37]/60 outline-none"
            />
          ) : (
            <input
              value={seo?.[f.key] || ""}
              onChange={(e) => setSeo({ [f.key]: e.target.value })}
              className="w-full bg-[#0f0f10] text-[#f0ede8] text-xs px-2 py-1.5 rounded ring-1 ring-[#1a1a1d] focus:ring-[#D4AF37]/60 outline-none"
            />
          )}
        </div>
      ))}
      <div className="text-[10px] text-[#6a6a6e]">
        SEO data saves with the page. Hook a head manager in your pages to render these tags.
      </div>
    </div>
  );
}

export function RightSidebar() {
  const rightOpen = useEditorStore((s) => s.rightOpen);
  const rightTab = useEditorStore((s) => s.rightTab);
  const setShell = useEditorStore((s) => s.setShell);
  if (!rightOpen) return null;

  return (
    <aside className="w-80 shrink-0 bg-[#0a0a0b] border-l border-[#1a1a1d] flex flex-col">
      <div className="flex items-center border-b border-[#1a1a1d]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setShell({ rightTab: id })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] uppercase tracking-[0.18em] border-b-2 ${rightTab === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-[#6a6a6e] hover:text-[#f0ede8]"}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {rightTab === "props" && <PropsTab />}
        {rightTab === "ai" && <AITab />}
        {rightTab === "seo" && <SeoTab />}
      </div>
    </aside>
  );
}
