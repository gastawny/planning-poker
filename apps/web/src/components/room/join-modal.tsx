import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface JoinModalProps {
  onJoin: (name: string, role: "participant" | "spectator") => void;
}

function validateName(name: string): string | undefined {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  if (name.trim().length > 30) return "Name must be at most 30 characters";
}

export function JoinModal({ onJoin }: JoinModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"participant" | "spectator">("participant");
  const [nameError, setNameError] = useState<string | undefined>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateName(name);
    if (err) {
      setNameError(err);
      return;
    }
    setNameError(undefined);
    onJoin(name.trim(), role);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <dialog
        open
        aria-labelledby="join-modal-title"
        className="bg-white rounded-xl border border-zinc-200 shadow-lg w-full max-w-sm mx-4 p-6 m-0"
      >
        <h2 id="join-modal-title" className="text-lg font-semibold text-zinc-900 mb-1">
          Join this room
        </h2>
        <p className="text-sm text-zinc-500 mb-5">Enter your name to join the session.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            id="modal-name"
            label="Your name"
            placeholder="e.g. Alice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            maxLength={30}
            autoComplete="nickname"
            autoFocus
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-zinc-700">Join as</legend>
            <div className="flex gap-4">
              {(["participant", "spectator"] as const).map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="modal-role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="accent-indigo-600"
                  />
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit" className="w-full">
            Join room
          </Button>
        </form>
      </dialog>
    </div>
  );
}
