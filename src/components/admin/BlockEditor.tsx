import { useState, useEffect, useCallback } from "react";
import {
  Save, Eye, EyeOff, Copy, Check, RotateCcw, Plus, Trash2,
  ChevronUp, ChevronDown, Code, FormInput, Image, Link, Type,
  GripVertical, Search, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import type { CmsContent } from "@/hooks/use-cms";
import type { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

interface Props {
  sections: CmsContent[];
  activeSection: string;
  isLoading: boolean;
  onSave: (key: string, content: Json, isVisible?: boolean) => Promise<void>;
  isSaving: boolean;
}

export default function BlockEditor({ sections, activeSection, isLoading, onSave, isSaving }: Props) {
  const section = sections.find((s) => s.section_key === activeSection);
  const [jsonStr, setJsonStr] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [originalJson, setOriginalJson] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedArrays, setExpandedArrays] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (section) {
      const str = JSON.stringify(section.content, null, 2);
      setJsonStr(str);
      setOriginalJson(str);
      setIsValid(true);
      setShowRaw(false);
      setSearchTerm("");
      setExpandedArrays(new Set());
    }
  }, [section]);

  const handleChange = useCallback((val: string) => {
    setJsonStr(val);
    try {
      JSON.parse(val);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  }, []);

  const updateFromParsed = useCallback((parsed: unknown) => {
    const str = JSON.stringify(parsed, null, 2);
    setJsonStr(str);
    setIsValid(true);
  }, []);

  const hasChanges = jsonStr !== originalJson;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setJsonStr(originalJson);
    setIsValid(true);
    toast({ title: "Reset", description: "Changes reverted" });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!section) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Select a section from the sidebar to start editing.</p>
    </div>
  );

  let parsed: Record<string, unknown> | unknown[] | null = null;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = null;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">{section.section_label}</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">Key: <code className="text-primary">{section.section_key}</code></span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">Updated {new Date(section.updated_at).toLocaleDateString()}</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${section.is_visible ? "bg-green-500/10 text-green-500" : "bg-border text-muted-foreground"}`}>
              {section.is_visible ? "Visible" : "Hidden"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onSave(section.section_key, section.content as Json, !section.is_visible)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title={section.is_visible ? "Hide section" : "Show section"}
          >
            {section.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
            {section.is_visible ? "Hide" : "Show"}
          </button>
          {hasChanges && (
            <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw size={12} /> Reset
            </button>
          )}
          <button
            onClick={() => { if (!isValid) return; onSave(section.section_key, JSON.parse(jsonStr)); }}
            disabled={!isValid || isSaving || !hasChanges}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-gold-light disabled:opacity-40 transition-colors"
          >
            <Save size={14} /> {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="mb-4 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          You have unsaved changes
        </div>
      )}

      {/* Search */}
      {parsed && typeof parsed === "object" && Object.keys(parsed).length > 4 && (
        <div className="mb-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      )}

      {/* Smart field editor */}
      {parsed && typeof parsed === "object" && !Array.isArray(parsed) && (
        <FieldEditor
          data={parsed as Record<string, unknown>}
          onChange={updateFromParsed}
          searchTerm={searchTerm}
          expandedArrays={expandedArrays}
          setExpandedArrays={setExpandedArrays}
          depth={0}
        />
      )}

      {parsed && Array.isArray(parsed) && (
        <ArrayEditor
          items={parsed}
          fieldKey={section.section_key}
          onChange={updateFromParsed}
          expandedArrays={expandedArrays}
          setExpandedArrays={setExpandedArrays}
        />
      )}

      {/* Toggle raw JSON */}
      <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowRaw(!showRaw)} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Code size={14} />
            {showRaw ? "Hide" : "Show"} Raw JSON
          </button>
          {showRaw && (
            <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        {showRaw && (
          <textarea
            value={jsonStr}
            onChange={(e) => handleChange(e.target.value)}
            rows={Math.min(25, Math.max(8, jsonStr.split("\n").length + 2))}
            className={`w-full px-4 py-3 text-xs font-mono bg-secondary border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${isValid ? "border-border focus:border-primary" : "border-destructive"}`}
            spellCheck={false}
          />
        )}
        {showRaw && !isValid && <p className="text-xs text-destructive mt-1">Invalid JSON — fix errors before saving</p>}
      </div>
    </div>
  );
}

// ===== Field Editor =====

function FieldEditor({
  data,
  onChange,
  searchTerm,
  expandedArrays,
  setExpandedArrays,
  depth,
  parentKey = "",
}: {
  data: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
  searchTerm: string;
  expandedArrays: Set<string>;
  setExpandedArrays: React.Dispatch<React.SetStateAction<Set<string>>>;
  depth: number;
  parentKey?: string;
}) {
  const updateField = (key: string, value: unknown) => {
    onChange({ ...data, [key]: value });
  };

  const addField = () => {
    const key = prompt("Enter field name:");
    if (!key) return;
    onChange({ ...data, [key]: "" });
  };

  const removeField = (key: string) => {
    const copy = { ...data };
    delete copy[key];
    onChange(copy);
  };

  const fields = Object.entries(data).filter(([key]) => {
    if (!searchTerm) return true;
    return key.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-3">
      {fields.map(([key, value]) => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        const label = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ");

        // String
        if (typeof value === "string") {
          const isUrl = value.startsWith("http") || value.startsWith("mailto:");
          const isLong = value.length > 100;
          const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(value);

          return (
            <div key={fullKey} className="glass-surface rounded-lg p-4 group">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground capitalize flex items-center gap-1.5">
                  {isImageUrl && <Image size={12} className="text-primary" />}
                  {isUrl && !isImageUrl && <Link size={12} className="text-primary" />}
                  {!isUrl && <Type size={12} className="text-muted-foreground/50" />}
                  {label}
                </label>
                <button onClick={() => removeField(key)} className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive transition-all" title="Remove field">
                  <Trash2 size={12} />
                </button>
              </div>
              {isImageUrl && (
                <div className="mb-2 rounded-md overflow-hidden bg-secondary/50 border border-border">
                  <img src={value} alt={key} className="max-h-32 object-cover w-full" loading="lazy" />
                </div>
              )}
              {isLong ? (
                <textarea
                  value={value}
                  onChange={(e) => updateField(key, e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary resize-y"
                />
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="flex-1 px-4 py-3 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                  {isUrl && !isImageUrl && (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="p-3 text-muted-foreground hover:text-primary transition-colors border border-border rounded-lg">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        }

        // Boolean
        if (typeof value === "boolean") {
          return (
            <div key={fullKey} className="glass-surface rounded-lg p-4 flex items-center justify-between group">
              <label className="text-sm font-medium text-foreground capitalize">{label}</label>
              <div className="flex items-center gap-2">
                <button onClick={() => removeField(key)} className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive transition-all" title="Remove field">
                  <Trash2 size={12} />
                </button>
                <button
                  onClick={() => updateField(key, !value)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-foreground transition-transform ${value ? "left-6" : "left-1"}`} />
                </button>
              </div>
            </div>
          );
        }

        // Number
        if (typeof value === "number") {
          return (
            <div key={fullKey} className="glass-surface rounded-lg p-4 group">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground capitalize">{label}</label>
                <button onClick={() => removeField(key)} className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive transition-all" title="Remove field">
                  <Trash2 size={12} />
                </button>
              </div>
              <input
                type="number"
                value={value}
                onChange={(e) => updateField(key, Number(e.target.value))}
                className="w-full px-4 py-3 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          );
        }

        // Array
        if (Array.isArray(value)) {
          return (
            <ArrayEditor
              key={fullKey}
              items={value}
              fieldKey={fullKey}
              label={label}
              onChange={(newArr) => updateField(key, newArr)}
              onRemoveField={() => removeField(key)}
              expandedArrays={expandedArrays}
              setExpandedArrays={setExpandedArrays}
            />
          );
        }

        // Nested object
        if (typeof value === "object" && value !== null) {
          const isExpanded = expandedArrays.has(fullKey);
          return (
            <div key={fullKey} className="glass-surface rounded-lg overflow-hidden group">
              <button
                onClick={() => {
                  setExpandedArrays((prev) => {
                    const next = new Set(prev);
                    if (next.has(fullKey)) next.delete(fullKey); else next.add(fullKey);
                    return next;
                  });
                }}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground capitalize flex items-center gap-1.5">
                  <FormInput size={12} className="text-primary" /> {label}
                  <span className="text-primary/60 ml-1">({Object.keys(value).length} fields)</span>
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); removeField(key); }} className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive transition-all">
                    <Trash2 size={12} />
                  </button>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 overflow-hidden"
                  >
                    <FieldEditor
                      data={value as Record<string, unknown>}
                      onChange={(updated) => updateField(key, updated)}
                      searchTerm=""
                      expandedArrays={expandedArrays}
                      setExpandedArrays={setExpandedArrays}
                      depth={depth + 1}
                      parentKey={fullKey}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        return null;
      })}

      {/* Add field button */}
      {depth === 0 && (
        <button
          onClick={addField}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Plus size={14} /> Add Field
        </button>
      )}
    </div>
  );
}

// ===== Array Editor =====

function ArrayEditor({
  items,
  fieldKey,
  label,
  onChange,
  onRemoveField,
  expandedArrays,
  setExpandedArrays,
}: {
  items: unknown[];
  fieldKey: string;
  label?: string;
  onChange: (updated: unknown[]) => void;
  onRemoveField?: () => void;
  expandedArrays: Set<string>;
  setExpandedArrays: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const isExpanded = expandedArrays.has(fieldKey);

  const addItem = () => {
    if (items.length === 0) {
      onChange([...items, ""]);
      return;
    }
    const template = items[0];
    if (typeof template === "object" && template !== null && !Array.isArray(template)) {
      const blank: Record<string, unknown> = {};
      Object.keys(template as Record<string, unknown>).forEach((k) => {
        const val = (template as Record<string, unknown>)[k];
        blank[k] = typeof val === "number" ? 0 : typeof val === "boolean" ? false : "";
      });
      onChange([...items, blank]);
    } else {
      onChange([...items, ""]);
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const copy = [...items];
    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
    onChange(copy);
  };

  const updateItem = (index: number, value: unknown) => {
    const copy = [...items];
    copy[index] = value;
    onChange(copy);
  };

  return (
    <div className="glass-surface rounded-lg overflow-hidden group/array">
      <button
        onClick={() => {
          setExpandedArrays((prev) => {
            const next = new Set(prev);
            if (next.has(fieldKey)) next.delete(fieldKey); else next.add(fieldKey);
            return next;
          });
        }}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <span className="text-xs font-medium text-muted-foreground capitalize flex items-center gap-1.5">
          {label || fieldKey}
          <span className="text-primary font-semibold ml-1">{items.length} items</span>
        </span>
        <div className="flex items-center gap-2">
          {onRemoveField && (
            <button onClick={(e) => { e.stopPropagation(); onRemoveField(); }} className="opacity-0 group-hover/array:opacity-100 text-destructive/50 hover:text-destructive transition-all">
              <Trash2 size={12} />
            </button>
          )}
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 overflow-hidden space-y-2"
          >
            {items.map((item, i) => (
              <div key={i} className="relative p-3 bg-secondary/30 rounded-lg border border-border/50 group/item">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.65rem] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                    <GripVertical size={10} className="text-muted-foreground/30" />
                    Item {i + 1}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                    <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors" title="Move up">
                      <ChevronUp size={12} />
                    </button>
                    <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors" title="Move down">
                      <ChevronDown size={12} />
                    </button>
                    <button onClick={() => removeItem(i)} className="p-1 text-destructive/50 hover:text-destructive transition-colors" title="Remove item">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {typeof item === "object" && item !== null && !Array.isArray(item) ? (
                  <div className="space-y-2">
                    {Object.entries(item as Record<string, unknown>).map(([subKey, subVal]) => (
                      <div key={subKey} className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground w-28 shrink-0 capitalize pt-2.5">{subKey.replace(/([A-Z])/g, " $1")}:</span>
                        {typeof subVal === "boolean" ? (
                          <button
                            onClick={() => {
                              const updated = { ...(item as Record<string, unknown>), [subKey]: !subVal };
                              updateItem(i, updated);
                            }}
                            className={`relative w-9 h-5 rounded-full transition-colors ${subVal ? "bg-primary" : "bg-border"}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-transform ${subVal ? "left-[18px]" : "left-0.5"}`} />
                          </button>
                        ) : typeof subVal === "number" ? (
                          <input
                            type="number"
                            value={subVal}
                            onChange={(e) => {
                              const updated = { ...(item as Record<string, unknown>), [subKey]: Number(e.target.value) };
                              updateItem(i, updated);
                            }}
                            className="flex-1 px-3 py-1.5 text-sm bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
                          />
                        ) : Array.isArray(subVal) ? (
                          <div className="flex-1 space-y-1">
                            {(subVal as string[]).map((sv, si) => (
                              <div key={si} className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={String(sv)}
                                  onChange={(e) => {
                                    const newSubArr = [...subVal as unknown[]];
                                    newSubArr[si] = e.target.value;
                                    const updated = { ...(item as Record<string, unknown>), [subKey]: newSubArr };
                                    updateItem(i, updated);
                                  }}
                                  className="flex-1 px-3 py-1.5 text-sm bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
                                />
                                <button
                                  onClick={() => {
                                    const newSubArr = (subVal as unknown[]).filter((_, idx) => idx !== si);
                                    const updated = { ...(item as Record<string, unknown>), [subKey]: newSubArr };
                                    updateItem(i, updated);
                                  }}
                                  className="p-1 text-destructive/40 hover:text-destructive transition-colors"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newSubArr = [...(subVal as unknown[]), ""];
                                const updated = { ...(item as Record<string, unknown>), [subKey]: newSubArr };
                                updateItem(i, updated);
                              }}
                              className="text-[0.65rem] text-primary hover:text-gold-light transition-colors flex items-center gap-1"
                            >
                              <Plus size={10} /> Add
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={String(subVal ?? "")}
                            onChange={(e) => {
                              const updated = { ...(item as Record<string, unknown>), [subKey]: e.target.value };
                              updateItem(i, updated);
                            }}
                            className="flex-1 px-3 py-1.5 text-sm bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={String(item)}
                    onChange={(e) => updateItem(i, e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-secondary border border-border rounded text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              </div>
            ))}
            <button
              onClick={addItem}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <Plus size={14} /> Add Item
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
