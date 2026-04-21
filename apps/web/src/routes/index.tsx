import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useToast } from "~/components/ui/toast";
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
  const { addToast } = useToast();
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
        addToast("error", body.message ?? "Failed to create room");
        return;
      }
      const { roomId, hostId } = (await res.json()) as { roomId: string; hostId: string };
      sessionStorage.setItem("userName", name.trim());
      sessionStorage.setItem("userRole", "facilitator");
      sessionStorage.setItem("hostId", hostId);
      await navigate({ to: "/room/$roomId", params: { roomId } });
    } catch {
      addToast("error", "Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Create a room</h2>
        <p className="text-sm text-zinc-500">Start a new session as the facilitator.</p>
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
  const { addToast } = useToast();
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
        addToast("error", "Failed to look up room");
        return;
      }
      sessionStorage.setItem("userName", name.trim());
      sessionStorage.setItem("userRole", role);
      sessionStorage.removeItem("hostId");
      await navigate({ to: "/room/$roomId", params: { roomId: roomCode } });
    } catch {
      addToast("error", "Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Join a room</h2>
        <p className="text-sm text-zinc-500">Enter a room code or paste an invite link.</p>
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
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-700">Join as</legend>
        <div className="flex gap-4">
          {(["participant", "spectator"] as const).map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="radio"
                name="role"
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
      <Button type="submit" variant="secondary" loading={loading} className="w-full">
        Join room
      </Button>
    </form>
  );
}

function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Planning Poker</h1>
          <p className="mt-2 text-zinc-500">Estimate collaboratively with your team.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <CreateRoomForm />
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
            <JoinRoomForm />
          </div>
        </div>
      </div>
    </main>
  );
}
