import type { RoomState, RoomUser, UserRole } from "@planning-poker/types";

export class PermissionError extends Error {
  constructor(message = "Permission denied") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assertRole(room: RoomState, userId: string, ...allowedRoles: UserRole[]): RoomUser {
  const user = room.users.find((u) => u.id === userId);
  if (!user) throw new PermissionError("User not found in room");
  if (!allowedRoles.includes(user.role)) throw new PermissionError();
  return user;
}
