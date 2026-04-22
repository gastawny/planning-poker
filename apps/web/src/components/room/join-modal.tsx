import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

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
    <Dialog open>
      <DialogContent className="max-w-sm" data-testid="join-modal" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Join this room</DialogTitle>
          <DialogDescription>Enter your name to join the session.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2" noValidate>
          <Input
            id="modal-name"
            data-testid="join-name-input"
            label="Your name"
            placeholder="e.g. Alice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            maxLength={30}
            autoComplete="nickname"
            autoFocus
          />

          <div className="flex flex-col gap-2">
            <Label>Join as</Label>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as "participant" | "spectator")}
              className="flex gap-2"
            >
              {(["participant", "spectator"] as const).map((r) => (
                <label
                  key={r}
                  htmlFor={`modal-role-${r}`}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                    role === r
                      ? "border-[oklch(0.78_0.14_85_/_60%)] bg-[oklch(0.78_0.14_85_/_8%)]"
                      : "border-border hover:border-border/60 bg-transparent"
                  }`}
                >
                  <RadioGroupItem value={r} id={`modal-role-${r}`} data-testid={`join-role-${r}`} />
                  <span className="text-sm font-medium capitalize">{r}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button type="submit" data-testid="join-submit" className="w-full">
            Join room
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
