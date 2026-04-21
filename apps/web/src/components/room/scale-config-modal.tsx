import type { ClientEvent, RoundPhase } from "@planning-poker/types";
import { TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";

const LONG_SCALE = ["1", "2", "3", "5", "8", "13", "21", "34", "55", "89"];

const PRESETS: Record<string, string[]> = {
  Short: ["1", "2", "3", "5", "8"],
  Standard: ["1", "2", "3", "5", "8", "13", "21"],
  Long: [...LONG_SCALE],
};

interface ScaleConfigModalProps {
  phase: RoundPhase;
  currentScale: string[];
  currentSpecialCards: string[];
  send: (event: ClientEvent) => void;
  onClose: () => void;
}

function setsEqual(a: Set<string>, b: string[]): boolean {
  if (a.size !== b.length) return false;
  return b.every((v) => a.has(v));
}

function activePresetLabel(selected: Set<string>): string {
  for (const [label, values] of Object.entries(PRESETS)) {
    if (setsEqual(selected, values)) return label;
  }
  return "Custom";
}

export function ScaleConfigModal({
  phase,
  currentScale,
  currentSpecialCards,
  send,
  onClose,
}: ScaleConfigModalProps) {
  const [selectedValues, setSelectedValues] = useState<Set<string>>(() => new Set(currentScale));
  const [coffeeEnabled, setCoffeeEnabled] = useState(currentSpecialCards.includes("☕"));
  const [confirmAction, setConfirmAction] = useState<"apply" | "reset" | null>(null);

  const isVoting = phase === "voting";
  const presetLabel = activePresetLabel(selectedValues);

  const sortedSelected = [...selectedValues].sort((a, b) => Number(a) - Number(b));
  const previewCards = [...sortedSelected, "?", "∞", ...(coffeeEnabled ? ["☕"] : [])];

  function toggleValue(value: string) {
    setSelectedValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        if (next.size <= 2) return prev;
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
    setConfirmAction(null);
  }

  function selectPreset(values: string[]) {
    setSelectedValues(new Set(values));
    setConfirmAction(null);
  }

  function handleApply() {
    if (isVoting && confirmAction !== "apply") {
      setConfirmAction("apply");
      return;
    }
    send({
      type: "scale:update",
      scale: sortedSelected,
      specialCards: ["?", "∞", ...(coffeeEnabled ? ["☕"] : [])],
    });
    onClose();
  }

  function handleReset() {
    if (isVoting && confirmAction !== "reset") {
      setConfirmAction("reset");
      return;
    }
    send({ type: "scale:reset" });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure scale</DialogTitle>
        </DialogHeader>

        <section className="mb-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Preset
          </p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(PRESETS).map(([label, values]) => (
              <Button
                key={label}
                type="button"
                variant={presetLabel === label ? "default" : "outline"}
                size="sm"
                onClick={() => selectPreset(values)}
              >
                {label}
              </Button>
            ))}
            {presetLabel === "Custom" && (
              <Button type="button" variant="outline" size="sm" disabled>
                Custom
              </Button>
            )}
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Values
          </p>
          <div className="flex flex-wrap gap-2">
            {LONG_SCALE.map((value) => {
              const isSelected = selectedValues.has(value);
              const isDisabledToggleOff = isSelected && selectedValues.size <= 2;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleValue(value)}
                  disabled={isDisabledToggleOff}
                  title={isDisabledToggleOff ? "Minimum 2 values required" : undefined}
                  className={`w-12 h-10 rounded-md border-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-border/80"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Special cards
          </p>
          <div className="flex gap-4 flex-wrap">
            {(["?", "∞"] as const).map((card) => (
              <div
                key={card}
                className="flex items-center gap-2 opacity-50 cursor-not-allowed select-none"
              >
                <Checkbox checked disabled id={`special-${card}`} />
                <Label
                  htmlFor={`special-${card}`}
                  className="font-mono font-semibold cursor-not-allowed"
                >
                  {card}
                  <span className="text-xs text-muted-foreground ml-1">(always on)</span>
                </Label>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Checkbox
                id="special-coffee"
                checked={coffeeEnabled}
                onCheckedChange={(checked) => {
                  setCoffeeEnabled(!!checked);
                  setConfirmAction(null);
                }}
              />
              <Label htmlFor="special-coffee" className="font-mono font-semibold cursor-pointer">
                ☕
              </Label>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Preview
          </p>
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-border min-h-[4rem]">
            {previewCards.map((card) => (
              <div
                key={card}
                className="w-10 h-14 rounded-md border-2 border-border bg-background flex items-center justify-center text-sm font-bold text-foreground shadow-sm"
              >
                {card}
              </div>
            ))}
          </div>
        </section>

        {confirmAction && (
          <Alert variant="destructive" className="mb-4">
            <TriangleAlertIcon />
            <AlertTitle>This will clear all votes in the current round. Continue?</AlertTitle>
            <AlertDescription>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={confirmAction === "apply" ? handleApply : handleReset}
                >
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmAction(null)}>
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Restore default
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
