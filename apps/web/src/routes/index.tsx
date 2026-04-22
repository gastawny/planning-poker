import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { env } from "~/env";

export const Route = createFileRoute("/")({
  component: Home,
});

function validateName(name: string): string | undefined {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  if (name.trim().length > 30) return "Name must be at most 30 characters";
}

function extractRoomCode(input: string): string {
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? input.trim();
  } catch {
    return input.trim();
  }
}

function CreateRoomForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateName(name);
    if (err) {
      setNameError(err);
      return;
    }
    setNameError(undefined);
    setLoading(true);
    try {
      const res = await fetch(`${env.apiUrl}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        toast.error(body.message ?? "Failed to create room");
        return;
      }
      const { roomId, hostId } = (await res.json()) as { roomId: string; hostId: string };
      sessionStorage.setItem("userName", name.trim());
      sessionStorage.setItem("userRole", "facilitator");
      sessionStorage.setItem("hostId", hostId);
      await navigate({ to: "/room/$roomId", params: { roomId } });
    } catch {
      toast.error("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Create a room</h2>
        <p className="text-sm text-muted-foreground">Start a new session as the facilitator.</p>
      </div>
      <Input
        id="create-name"
        data-testid="create-name-input"
        label="Your name"
        placeholder="e.g. Alice"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
        maxLength={30}
        autoComplete="nickname"
      />
      <Button type="submit" data-testid="create-room-submit" loading={loading} className="w-full">
        Create room
      </Button>
    </form>
  );
}

function JoinRoomForm() {
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"participant" | "spectator">("participant");
  const [roomError, setRoomError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;

    const roomCode = extractRoomCode(roomInput);
    if (!roomCode) {
      setRoomError("Room code is required");
      valid = false;
    } else {
      setRoomError(undefined);
    }

    const nameErr = validateName(name);
    if (nameErr) {
      setNameError(nameErr);
      valid = false;
    } else {
      setNameError(undefined);
    }

    if (!valid) return;
    setLoading(true);

    try {
      const res = await fetch(`${env.apiUrl}/rooms/${roomCode}`);
      if (res.status === 404) {
        setRoomError("Room not found");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to look up room");
        return;
      }
      sessionStorage.setItem("userName", name.trim());
      sessionStorage.setItem("userRole", role);
      sessionStorage.removeItem("hostId");
      await navigate({ to: "/room/$roomId", params: { roomId: roomCode } });
    } catch {
      toast.error("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Join a room</h2>
        <p className="text-sm text-muted-foreground">Enter a room code or paste an invite link.</p>
      </div>
      <Input
        id="join-room"
        label="Room code or link"
        placeholder="e.g. abc123 or https://…"
        value={roomInput}
        onChange={(e) => setRoomInput(e.target.value)}
        error={roomError}
        autoComplete="off"
      />
      <Input
        id="join-name"
        label="Your name"
        placeholder="e.g. Bob"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
        maxLength={30}
        autoComplete="nickname"
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
              htmlFor={`role-${r}`}
              className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                role === r
                  ? "border-[oklch(0.78_0.14_85_/_60%)] bg-[oklch(0.78_0.14_85_/_8%)]"
                  : "border-border hover:border-border/60 bg-transparent"
              }`}
            >
              <RadioGroupItem value={r} id={`role-${r}`} />
              <span className="text-sm font-medium capitalize">{r}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
      <Button type="submit" variant="secondary" loading={loading} className="w-full">
        Join room
      </Button>
    </form>
  );
}

function Home() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration: large suit symbols */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        <span className="absolute top-8 left-8 text-[12rem] opacity-[0.03] text-foreground font-serif leading-none">♠</span>
        <span className="absolute top-8 right-8 text-[12rem] opacity-[0.03] text-red-400 font-serif leading-none">♥</span>
        <span className="absolute bottom-8 left-8 text-[12rem] opacity-[0.03] text-red-400 font-serif leading-none">♦</span>
        <span className="absolute bottom-8 right-8 text-[12rem] opacity-[0.03] text-foreground font-serif leading-none">♣</span>
        {/* Radial glow in center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.78_0.14_85_/_0.04)_0%,transparent_70%)]" />
      </div>

      <div className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-2xl opacity-60">♠</span>
            <span className="text-2xl opacity-40">♥</span>
          </div>
          <h1
            className="text-5xl font-bold text-foreground tracking-tight"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Planning Poker
          </h1>
          <div className="mt-2 mx-auto w-24 h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.14_85)] to-transparent" />
          <p className="mt-3 text-muted-foreground text-sm tracking-wide uppercase">
            Estimate collaboratively with your team
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card rounded-xl border border-border p-7 shadow-xl shadow-black/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[oklch(0.78_0.14_85_/_0.12)] to-transparent rounded-bl-xl" />
            <CreateRoomForm />
          </div>
          <div className="bg-card rounded-xl border border-border p-7 shadow-xl shadow-black/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[oklch(0.78_0.14_85_/_0.06)] to-transparent rounded-bl-xl" />
            <JoinRoomForm />
          </div>
        </div>
      </div>
    </main>
  );
}
