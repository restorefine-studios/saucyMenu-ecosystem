import { useCallback, useEffect, useState } from "react";
import { InputComponent, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PlusCircle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Row {
  id: string;
  name: string;
}

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export function TagInput({ label, value, onChange }: TagInputProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>(
    value.length > 0
      ? value.map((name, i) => ({ id: String(i), name }))
      : [{ id: "1", name: "" }],
  );

  // Keep the flat string[] in sync whenever rows change.
  useEffect(() => {
    const names = rows.map((r) => r.name).filter((n) => n.trim().length > 0);
    onChange(names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { id: String(prev.length + 1), name: "" }]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const updateRow = useCallback((id: string, val: string) => {
    if (!val.includes(",")) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name: val } : r)));
      return;
    }
    const parts = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length <= 1) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, name: val.replace(/,/g, "").trim() } : r)),
      );
      return;
    }
    const [first, ...rest] = parts;
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const newRows: Row[] = rest.map((name, i) => ({
        id: `row-${Date.now()}-${i}`,
        name,
      }));
      return [...prev.slice(0, idx), { ...prev[idx], name: first }, ...newRows, ...prev.slice(idx + 1)];
    });
  }, []);

  return (
    <section className="w-full" aria-labelledby="taginput-heading">
      <div className="flex items-center justify-between mb-3">
        <Label id="taginput-heading" className="text-base font-semibold">
          {label}
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4" />
          {t("admin.menu.addDish.ingredients.btn")}
        </Button>
      </div>
      <ScrollArea className="max-h-[400px] rounded-md border border-gray-200">
        <div
          className={cn(
            rows.length === 1 ? "grid-cols-1" : rows.length === 2 ? "grid-cols-2" : "grid-cols-3",
            "grid gap-2 p-2 min-w-full",
          )}
        >
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50/50 p-1">
              <InputComponent
                id={`taginput-row-${row.id}`}
                value={row.name}
                onChange={(e) => updateRow(row.id, e.target.value)}
                placeholder={t("admin.menu.addDish.ingredients.placeholder")}
                className="border-0 bg-transparent shadow-none flex-1 min-w-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label={t("admin.menu.addDish.ingredients.removeBtn")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
