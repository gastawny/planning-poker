import type { ClientEvent, RoundPhase } from "@planning-poker/types";
import { useState } from "react";
import { Button } from "~/components/ui/button";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <dialog
        open
        aria-labelledby="scale-modal-title"
        className="bg-white rounded-xl border border-zinc-200 shadow-lg w-full max-w-lg mx-4 p-6 m-0 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="scale-modal-title" className="text-lg font-semibold text-zinc-900">
            Configure scale
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-zinc-600 text-xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            ×
          </button>
        </div>

        <section className="mb-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Preset</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(PRESETS).map(([label, values]) => (
              <button
                key={label}
                type="button"
                onClick={() => selectPreset(values)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  presetLabel === label
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
            {presetLabel === "Custom" && (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium border border-zinc-300 bg-zinc-100 text-zinc-500">
                Custom
              </span>
            )}
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Values</p>
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
                  className={`w-12 h-10 rounded-md border-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Special cards
          </p>
          <div className="flex gap-4 flex-wrap">
            {(["?", "∞"] as const).map((card) => (
              <label
                key={card}
                className="flex items-center gap-2 text-sm text-zinc-500 cursor-not-allowed select-none"
              >
                <input type="checkbox" checked disabled className="accent-indigo-600" readOnly />
                <span className="font-mono font-semibold">{card}</span>
                <span className="text-xs text-zinc-400">(always on)</span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={coffeeEnabled}
                onChange={(e) => {
                  setCoffeeEnabled(e.target.checked);
                  setConfirmAction(null);
                }}
                className="accent-indigo-600"
              />
              <span className="font-mono font-semibold">☕</span>
            </label>
          </div>
        </section>

        <section className="mb-6">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Preview</p>
          <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200 min-h-[4rem]">
            {previewCards.map((card) => (
              <div
                key={card}
                className="w-10 h-14 rounded-md border-2 border-zinc-300 bg-white flex items-center justify-center text-sm font-bold text-zinc-700 shadow-sm"
              >
                {card}
              </div>
            ))}
          </div>
        </section>

        {confirmAction && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <p className="font-medium mb-2">
              This will clear all votes in the current round. Continue?
            </p>
            <div className="flex gap-2">
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
          </div>
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
      </dialog>
    </div>
  );
}
