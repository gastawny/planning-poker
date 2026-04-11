# Implementation Milestones — Online Poker Planning

---

## M1 — Foundation & Infrastructure

**Goal:** Get the repository and development environment ready so all subsequent milestones can start without setup blockers.

### Tasks

#### [x] 1.1 Repository & folder structure

- Create a monorepo repository with the following structure: an `apps/` directory containing `server/` (Elysia + Bun) and `web/` (TanStack Start + React); a `packages/` directory containing a `types/` package for shared types; a `docker/` directory for Dockerfiles; and Docker Compose files at the root for both development and production.
- Configure Bun workspaces in the root `package.json` so all packages are linked and share a single lockfile.
- Add `.gitignore`, `.editorconfig`, and a `README.md` with local setup instructions.

#### [x] 1.2 Server project setup (Elysia)

- Initialize the server project using Elysia with Bun as the runtime.
- Install base dependencies: Elysia, the Elysia WebSocket plugin, and ioredis.
- Configure `tsconfig.json` with `strict: true` and path aliases.
- Add a development script that runs the server with hot reload.
- Configure Biome as the linter and formatter for the server project. Set up the `biome.json` config file with lint and format rules at the workspace root so both `apps/server` and `apps/web` share the same configuration. Add `bun run lint` and `bun run format` scripts.
- Create a config module that reads all required environment variables with safe fallback defaults for local development: server port, Redis URL, room TTL in seconds, and the public app URL.

#### [x] 1.3 Frontend project setup (TanStack Start)

- Initialize the frontend project with TanStack Start.
- Install dependencies: React, Tailwind CSS, and TanStack Router.
- Configure Tailwind with a base theme covering colors, fonts, and breakpoints.
- The frontend project is covered by the shared Biome configuration defined in 1.2 — no separate linter setup is needed.
- Define the folder structure inside `src/`: routes, components, hooks, lib, and styles.

#### [x] 1.4 Shared types package

- Create the `packages/types` package with a main entry point.
- Define the core domain types shared between server and client: user roles (`facilitator`, `participant`, `spectator`), round phases (`waiting`, `voting`, `revealed`), the `RoomUser` entity (id, name, role, hasVoted, connectedAt), and the `RoomState` entity (roomId, hostId, phase, taskName, scale, specialCards, users).
- Define discriminated union types for all WebSocket events in both directions (client-to-server and server-to-client). Each event must have a `type` string field as the discriminator.

#### [x] 1.5 Development Docker Compose

- Create a `docker-compose.dev.yml` file that starts a Redis container with its port exposed locally.
- Document the command to bring up the development environment in the README.

#### [x] 1.6 Basic CI pipeline

- Set up a CI workflow (GitHub Actions or equivalent) that runs on every push and pull request.
- The workflow must: install dependencies, run the TypeScript type checker with `--noEmit`, and run Biome across all packages for both linting and formatting checks.

### Acceptance Criteria

- [x] Running the install command at the root installs all workspace dependencies without errors.
- [x] The server starts in development mode on the configured port.
- [x] The frontend starts in development mode with hot reload.
- [x] Redis starts via Docker Compose and the server connects to it without errors.
- [x] The CI pipeline passes on the initial commit.

---

## M2 — Backend: Room & WebSocket Connection

**Goal:** Implement room creation, user entry via WebSocket, and the basic connection lifecycle.

### Tasks

#### [x] 2.1 Redis service

- Create a Redis service module with a singleton client instance using ioredis.
- Implement utility functions to get, set, and delete the full room state in Redis.
- Apply the configured TTL whenever a room state is saved, so inactive rooms are automatically cleaned up.
- Add connection error handling: log the error and trigger a graceful shutdown if Redis is unreachable at startup.

#### [x] 2.2 ID generation

- Create an ID generation module with two functions: one that generates a short, human-readable room ID (e.g., 6 alphanumeric characters with a hyphen separator), and one that generates a user ID using UUID v4.
- The room ID generator must check Redis for collisions before returning a new ID.

#### [x] 2.3 Room creation endpoint

- Implement `POST /rooms` that accepts the host's display name in the request body.
- Validate that the name is present and between 2 and 30 characters. Return a 400 error with a clear message if validation fails.
- Generate a unique room ID and a host user ID.
- Create the initial room state in Redis: phase set to `waiting`, default Fibonacci scale, special cards `?` and `∞`, empty user list, and null task name.
- Return the room ID, host user ID, and the full invite URL.

#### [x] 2.4 Room lookup endpoint

- Implement `GET /rooms/:roomId` that returns whether the room exists, its current phase, and the current user count.
- This endpoint is used by the frontend to validate a room before attempting to join.

#### [x] 2.5 WebSocket handler

- Implement the WebSocket endpoint at `GET /rooms/:roomId/ws`.
- On connection open: verify the room exists in Redis and reject with a close code of `4004` if it does not. Then wait for the `room:join` event from the client. If the event is not received within 10 seconds, close the connection.
- On connection close: remove the user from the room's user list in Redis. Broadcast a `user:left` event to remaining users. If the room becomes empty, schedule deletion after 60 seconds, checking first before deleting in case someone rejoined. If the disconnected user was the host, promote the longest-connected remaining participant as the new host.
- On message received: parse the JSON payload. Ignore silently if malformed. Dispatch to the appropriate event handler based on the `type` field.

#### [x] 2.6 `room:join` event handler

- Accept a payload with the user's display name and their chosen role (either `participant` or `spectator`; joining directly as `facilitator` is not allowed).
- Validate: name is required and between 2 and 30 characters; role must be one of the two allowed values; the room must not exceed 20 users.
- Add the user to the room state in Redis and associate the WebSocket connection in the in-memory connections map.
- Send the complete current room state to the joining user.
- Broadcast a `user:joined` event with the new user's data to all other connected users.

#### [x] 2.7 In-memory connection manager

- Create a connection manager module that maintains a map of room IDs to maps of user IDs to WebSocket instances.
- Implement functions to: add a connection, remove a connection, broadcast a payload to all users in a room (with an optional exclusion list), and send a payload to a specific user.

### Acceptance Criteria

- [x] `POST /rooms` creates the room in Redis and returns the room ID, host ID, and invite URL.
- [x] `GET /rooms/:roomId` returns `exists: false` for unknown rooms.
- [x] A WebSocket client can connect, send `room:join`, and receive the full room state.
- [x] A second client joining receives the room state and the first client receives `user:joined`.
- [x] Disconnecting removes the user and remaining users receive `user:left`.
- [x] Connecting to a non-existent room closes the WebSocket with code `4004`.

---

## M3 — Backend: Roles & Permissions

**Goal:** Implement role logic, role switching between participant and spectator, and the permission rules derived from each role.

### Tasks

#### [ ] 3.1 Authorization middleware

- Create an authorization utility that, given a room ID and user ID, checks whether the user holds a required role or one of a set of allowed roles.
- Throw a standardized permission error if the check fails.
- Apply this utility at the top of every event handler that requires a specific role.

#### [ ] 3.2 `user:change_role` event handler

- Accept a payload with the target user ID and the desired new role (`participant` or `spectator`).
- Permission rules: any user may change their own role between `participant` and `spectator`; only the facilitator may change another user's role; no one can change the facilitator's role via this event; no one can assign the `facilitator` role via this event.
- When switching from `participant` to `spectator`: update the role in Redis; if the user had already voted in the current round, remove their vote and reset their `hasVoted` flag; recalculate whether all remaining participants have voted.
- When switching from `spectator` to `participant`: update the role in Redis; if the round is in the `voting` phase, mark the user as `hasVoted: false` so they are counted as a pending voter.
- Broadcast a `user:role_changed` event with the user ID and new role to all users in the room.
- If the role change causes all participants to have voted (e.g., a participant who had not voted becomes a spectator and all remaining participants had already voted), also emit the all-voted notification.

#### [ ] 3.3 Voting permission guard

- Add a role check at the start of the `vote:submit` handler (to be implemented in M4): reject with a permission error if the user's role is `spectator`.

#### [ ] 3.4 `room:kick` event handler _(optional v1)_

- Accept a payload with the target user ID.
- Only the facilitator may execute this action.
- Remove the target user from the room state, close their WebSocket connection with close code `4003`, and broadcast a `user:left` event with a `kicked: true` flag.

#### [ ] 3.5 Standardized error format

- Define and document a single error event format sent to the client whenever an operation fails.
- Error codes to cover: `PERMISSION_DENIED`, `INVALID_PAYLOAD`, `ROOM_NOT_FOUND`, `ROOM_FULL`, and `INVALID_PHASE`.
- Every event handler must use this format exclusively when sending errors to clients.

### Acceptance Criteria

- [ ] A participant can change their own role to spectator and back.
- [ ] The facilitator can change another user's role.
- [ ] A non-facilitator cannot change another user's role and receives `PERMISSION_DENIED`.
- [ ] When a participant becomes a spectator, their vote is removed and progress is recalculated.
- [ ] When a spectator becomes a participant during voting, they are added to the pending voter count.
- [ ] The `user:role_changed` broadcast reaches all clients in the room.

---

## M4 — Backend: Voting & Reveal

**Goal:** Implement the complete voting round lifecycle — start, vote submission, reveal, and reset.

### Tasks

#### [ ] 4.1 `round:start` event handler

- Only the facilitator can start a round.
- Only allowed when the current phase is `waiting` or `revealed`.
- Accept an optional task name in the payload.
- Clear all votes from the previous round in Redis, reset `hasVoted` to `false` for all participants, update the phase to `voting`, and update the task name.
- Broadcast a `round:started` event with the task name to all users in the room.

#### [ ] 4.2 `vote:submit` event handler

- Only allowed for users with the `participant` role.
- Only allowed when the current phase is `voting`.
- Validate that the submitted value is present in the room's current scale or special cards list.
- Save the vote in Redis and mark the user as `hasVoted: true`.
- Broadcast a `vote:progress` event to all users that includes the voter's user ID, the total number of votes cast, and the total number of participants — but never the vote value itself.
- After saving, call the all-voted check function. If all participants have voted, broadcast a `vote:all_voted` event to the room.

#### [ ] 4.3 `vote:retract` event handler

- A user can only retract their own vote.
- Only allowed when the current phase is `voting`.
- Remove the vote from Redis and set `hasVoted` back to `false`.
- Broadcast an updated `vote:progress` event reflecting the new count.

#### [ ] 4.4 `vote:reveal` event handler

- Only the facilitator can reveal.
- Only allowed when the current phase is `voting`.
- Read all votes from Redis, then compute statistics for numeric votes: mean (rounded to one decimal place), mode (may be multiple values), minimum, and maximum.
- Identify participants who did not vote.
- Update the room phase to `revealed` in Redis.
- Broadcast a `vote:revealed` event containing the vote value for each participant, the computed statistics, and the list of user IDs who did not vote.

#### [ ] 4.5 `round:reset` event handler

- Only the facilitator can reset.
- Allowed in any phase.
- Clear all votes, reset `hasVoted` for all participants, and set the phase back to `waiting`.
- Broadcast a `round:reset` event to all users.

#### [ ] 4.6 "All voted" check logic

- Extract the all-voted logic into a standalone reusable function.
- The function must consider only users whose role is `participant`.
- It must return `false` if there are no participants at all (empty room or all spectators).
- This function must be called after every `vote:submit`, `vote:retract`, and `user:change_role` event.

### Acceptance Criteria

- [ ] The facilitator starts a round and all clients receive `round:started`.
- [ ] A participant submits a vote and all clients receive `vote:progress` without the vote value.
- [ ] A participant retracts a vote and the progress is updated for all clients.
- [ ] A spectator attempting to vote receives `PERMISSION_DENIED`.
- [ ] When the last participant votes, all clients receive `vote:all_voted`.
- [ ] The facilitator reveals and all clients receive `vote:revealed` with values and statistics.
- [ ] The facilitator resets and all clients receive `round:reset`.

---

## M5 — Backend: Fibonacci Scale

**Goal:** Implement scale configuration by the facilitator, with validation and real-time broadcast to all users.

### Tasks

#### [ ] 5.1 Scale presets and validation

- Define the three Fibonacci presets in a dedicated module: short (`1, 2, 3, 5, 8`), standard (`1, 2, 3, 5, 8, 13, 21`), and long (`1, 2, 3, 5, 8, 13, 21, 34, 55, 89`). The standard preset is the default.
- Define the default special cards as `?` and `∞`, and `☕` as an optional extra.
- Implement a scale validation function that enforces: at least 2 values, at most 15 values, all values must be positive integers, no duplicates, and values must be in ascending order. The function must return a structured result with a validity flag and an error message when invalid.

#### [ ] 5.2 `scale:update` event handler

- Only the facilitator can update the scale.
- Accept a payload with the numeric scale array and an optional list of special cards to include.
- Run the scale validation function and return an `INVALID_PAYLOAD` error if it fails.
- Validate the special cards list: only allow known values (`?`, `∞`, `☕`). Always include `?` and `∞` even if they are omitted from the payload.
- If the current phase is `voting`, clear all votes before applying the new scale. Confirmation is the frontend's responsibility — the backend must always clear votes without prompting.
- Save the new scale and special cards to Redis.
- Broadcast a `scale:updated` event to all users in the room, including the new scale, the new special cards list, and a boolean flag indicating whether votes were cleared.

#### [ ] 5.3 `scale:reset` event handler

- Only the facilitator can reset.
- Restore the scale to the standard Fibonacci preset and the special cards to `?` and `∞`.
- Apply the same vote-clearing logic as `scale:update` if the phase is `voting`.
- Broadcast `scale:updated` with the restored defaults.

### Acceptance Criteria

- [ ] The facilitator sends a valid `scale:update` and all clients receive `scale:updated` with the new cards.
- [ ] A payload with fewer than 2 values returns `INVALID_PAYLOAD`.
- [ ] A payload with non-integer or negative values returns `INVALID_PAYLOAD`.
- [ ] Changing the scale during an active vote clears votes and `votesCleared: true` is included in the broadcast.
- [ ] `scale:reset` restores default values and broadcasts to all clients.
- [ ] `?` and `∞` are always present in the special cards even when not explicitly sent in the payload.

---

## M6 — Frontend: Structure & Routing

**Goal:** Configure the frontend project with routing, base layout, and WebSocket connectivity.

### Tasks

#### [ ] 6.1 Routes

- Configure TanStack Router with three routes: the home page at `/`, the room page at `/room/$roomId`, and a catch-all 404 page that includes a link back to `/`.

#### [ ] 6.2 Home page (`/`)

- Build a room creation form with a field for the facilitator's display name and a submit button. On success, call `POST /rooms` and redirect to `/room/$roomId`.
- Build a join-existing-room form with a field for the room code or link, a field for the user's display name, and a radio group to choose between participant and spectator roles.
- Handle and display errors clearly: room not found, server unreachable, and invalid input.

#### [ ] 6.3 WebSocket hook (`useRoomSocket`)

- Create a custom hook that manages the WebSocket connection for a given room ID.
- The hook must handle the full connection lifecycle: connecting, connected, disconnected, and error states.
- Implement automatic reconnection with exponential backoff on unexpected disconnections. Use a maximum of 5 attempts with increasing delays. Stop retrying after the maximum is reached and surface the error state to the UI.
- Expose a typed `send` function for dispatching events to the server, a `connectionStatus` value, and a way to register handlers for incoming events.
- Clean up the connection when the hook unmounts.

#### [ ] 6.4 Room state store

- Create a global state store (using Zustand or a `useReducer` + Context pattern) that holds all client-side room state.
- The store must hold: the room ID, the current user's ID and role, the full room state received from the server, the current user's selected vote (if any), and the current round phase.
- Define a dedicated updater function for each server-to-client event type: user joined, user left, role changed, vote progress, vote revealed, scale updated, round started, and round reset.
- The WebSocket hook must call the appropriate store updater for each incoming event.

#### [ ] 6.5 Base UI components

- Build the following primitive components that will be used across all pages: Button (with primary, secondary, ghost, and destructive variants), Input (with label, error message, and disabled state), Badge (for displaying user roles and status), Spinner (loading indicator), and Toast/Notification (for errors and confirmations).
- All components must be keyboard-navigable and include appropriate ARIA attributes.

### Acceptance Criteria

- [ ] The `/` route renders both forms correctly.
- [ ] Creating a room redirects to `/room/$roomId` with the correct ID.
- [ ] `useRoomSocket` connects, receives `room:state`, and populates the store.
- [ ] `useRoomSocket` attempts automatic reconnection when the connection drops.
- [ ] Base components render correctly in all their states.

---

## M7 — Frontend: Room & Participants

**Goal:** Render the main room interface, including the user list, role badges, connection status, and role-switching controls.

### Tasks

#### [ ] 7.1 Room layout (`/room/$roomId`)

- Build a three-area layout: a header with the room name, current phase, task name (when set), and a copy-invite-link button; a sidebar or side panel with the participant and spectator lists; and a central area reserved for the voting cards and results (to be built in M8).
- Display the WebSocket connection status visibly in the header using a badge or indicator that reflects the current state: connected, reconnecting, or disconnected.
- If the room does not exist (verified via `GET /rooms/:roomId` on page load), redirect the user to the home page with an informative error message.

#### [ ] 7.2 User list

- Build a user list component that groups users into two sections: "Participants" and "Spectators".
- For each user, display: an avatar with their initials and a color generated deterministically from their name; their display name; a role badge (Facilitator, Participant, or Spectator); a crown icon for the host; and during the `voting` phase, a vote status indicator showing whether they have voted or are still pending.

#### [ ] 7.3 Self role switching

- Display a toggle or button for the current user to switch between the Participant and Spectator roles.
- Do not show this control to the facilitator.
- On click, send the `user:change_role` event and update the UI optimistically. Revert the change if the server responds with an error.

#### [ ] 7.4 Facilitator role management

- In the context menu of each user card — visible only to the facilitator — add options to change that user's role to Participant or Spectator depending on their current role.
- On selection, send `user:change_role` with the target user's ID.

#### [ ] 7.5 Room entry flow

- When a user opens `/room/$roomId` without an active session, show a modal or drawer prompting them to enter their display name and choose a role (participant or spectator).
- On submission, send `room:join` and close the modal once `room:state` is received.
- Persist the user ID and display name in `sessionStorage` so that on reconnection the entry form is not shown again.

#### [ ] 7.6 Task name

- Display an editable text field for the task name, visible only to the facilitator and only during the `waiting` and `revealed` phases.
- The task name is submitted as part of `round:start`, not saved independently.
- For all other users, display the task name as read-only text when it is set.

### Acceptance Criteria

- [ ] The user list displays all room members with the correct role badge.
- [ ] Initials avatars are generated with deterministic colors for all users.
- [ ] Vote status icons update in real time as other users vote.
- [ ] A user can switch their own role using the toggle.
- [ ] The facilitator can change other users' roles from the context menu.
- [ ] The entry modal is shown to new users accessing the room link.
- [ ] The connection status badge reflects the real WebSocket state.

---

## M8 — Frontend: Voting

**Goal:** Implement the full voting interface — cards, selection, progress tracking, reveal animation, and results panel.

### Tasks

#### [ ] 8.1 Card deck component

- Build a card deck component that renders the available cards based on the current scale and special cards from the room state.
- Each card must support three visual states: idle (selectable), selected (the user's current pick), and disabled (not interactable).
- Cards must be disabled when: the round phase is not `voting`, the current user is a spectator, or the user has already voted. Clicking a new card while having an existing vote should retract the previous vote and submit the new one in a single interaction.
- Include a "Retract vote" button below the deck that appears only after the user has voted. Clicking it sends the `vote:retract` event.

#### [ ] 8.2 Voting progress bar

- Build a progress component that displays how many participants have voted out of the total participant count (spectators excluded from both numbers).
- Include an animated progress bar.
- This component must be visible to all users: participants, spectators, and the facilitator.

#### [ ] 8.3 Facilitator control panel

- Build a panel visible only to the facilitator that shows contextually relevant actions for each phase.
- During `waiting`: a "Start voting" button that sends `round:start`.
- During `voting`: a "Reveal cards" button (always enabled, even if not all participants have voted) and a "Cancel round" button that sends `round:reset`.
- During `revealed`: a "New round" button that sends `round:start`.

#### [ ] 8.4 Hidden cards for other users

- During the `voting` phase, display face-down cards for participants who have already voted, and an empty placeholder for those who have not yet voted.
- Never reveal vote values before the `vote:revealed` event is received.

#### [ ] 8.5 Reveal and results

- When the `vote:revealed` event is received, animate all face-down cards flipping to face-up simultaneously using a CSS 3D flip animation.
- Display each participant's card with their vote value.
- Show a statistics panel with: the mean (numeric, one decimal place), the mode (most voted value; may be multiple), the minimum, and the maximum.
- List any participants who did not vote.
- Highlight the cards with the highest and lowest numeric values.
- Highlight all cards whose value matches the mode.

#### [ ] 8.6 "All voted" notification

- When the `vote:all_voted` event is received, display a toast or banner informing the room that all participants have voted and the facilitator can reveal the cards.
- This notification must be visible to all users including spectators.

### Acceptance Criteria

- [ ] Cards render with the correct values from the current scale.
- [ ] A spectator sees cards in the disabled state and cannot select them.
- [ ] A participant selects a card, the vote is submitted, and the card is marked as selected.
- [ ] Other users see a face-down card when a participant votes.
- [ ] `vote:all_voted` displays a notification to everyone.
- [ ] The facilitator clicks "Reveal" and all cards flip simultaneously.
- [ ] The statistics panel displays mean, mode, min, and max correctly.
- [ ] "New round" clears the UI and returns to the selection state.

---

## M9 — Frontend: Scale Configuration

**Goal:** Build the scale configuration UI with preset selection and range customization, accessible only to the facilitator.

### Tasks

#### [ ] 9.1 Configuration entry point

- Add a settings button or icon in the room header, visible only to the facilitator.
- Clicking it opens a modal or side drawer with the scale configuration UI.

#### [ ] 9.2 Preset selector

- Display three preset buttons: "Short", "Standard", and "Long".
- Clicking a preset automatically selects the corresponding set of values in the customization UI below.
- Indicate visually which preset is currently active, or show a "Custom" label if the current selection does not match any preset.

#### [ ] 9.3 Custom value selector

- Display all values from the long Fibonacci sequence as individual toggle chips or checkboxes.
- Each value can be toggled on or off individually.
- Enforce the minimum of 2 selected values by disabling the toggle-off action when only 2 remain selected.
- Show a live preview of the cards that will be displayed based on the current selection. The preview must update immediately on every toggle without waiting for the user to apply.

#### [ ] 9.4 Special cards section

- Show a separate section for special cards with individual toggles for `?`, `∞`, and `☕`.
- In v1, `?` and `∞` are always active and their toggles are either hidden or permanently disabled.
- `☕` is optional and off by default.

#### [ ] 9.5 Apply and broadcast

- Include an "Apply" button that sends `scale:update` with the current selection.
- If the round is in the `voting` phase, show a confirmation dialog before sending: inform the user that changing the scale will clear all votes in the current round and ask for confirmation.
- Include a "Restore default" button that sends `scale:reset`, with the same confirmation flow if the phase is `voting`.
- Close the modal automatically after a successful apply.

#### [ ] 9.6 Real-time update for non-facilitators

- When the `scale:updated` event is received by any client, update the card deck immediately without a page reload.
- If the event includes `votesCleared: true`, clear the user's locally selected card and display an informational toast.

### Acceptance Criteria

- [ ] The configuration button is visible only to the facilitator.
- [ ] Clicking a preset correctly populates the value checkboxes.
- [ ] The card preview updates in real time as values are toggled.
- [ ] Applying sends `scale:update` and all users' card decks update immediately.
- [ ] A confirmation dialog is shown when changing the scale during an active vote.
- [ ] `scale:reset` restores the default preset for all clients.
- [ ] Non-facilitators see their deck update upon receiving `scale:updated`.

---

## M10 — Integration, Testing & Hardening

**Goal:** Ensure stability, cover edge cases, and validate end-to-end behavior before the production deploy.

### Tasks

#### [ ] 10.1 Backend integration tests

- Use Bun's native test runner.
- Write integration tests covering the WebSocket event handlers for the following scenarios: `room:join` (success, room full, room not found, invalid name); `vote:submit` (success, spectator tries to vote, value not in scale, wrong phase); `user:change_role` (self change, facilitator changes another, non-facilitator tries to change another); `scale:update` (valid scale, fewer than 2 values, during active voting with vote clearing); `vote:reveal` (success, no votes, partial votes).
- Use a mocked or isolated Redis instance for all tests.

#### [ ] 10.2 Unit tests

- Write unit tests for: the `checkAllVoted` function (all voted, none voted, spectators ignored, no participants present); the `validateScale` function (valid input, duplicates, non-integer values, negative values, descending order); the vote statistics calculation (identical votes, varied votes, only special cards, no votes at all).

#### [ ] 10.3 Reconnection and resilience

- Verify that when a client reconnects after a dropped connection, it receives `room:state` and the UI is fully restored.
- Verify that a reconnecting participant's previous vote is preserved if the round is still in the `voting` phase.
- Implement a grace period of approximately 5 seconds before promoting a new host when the facilitator disconnects, so that brief reconnections do not trigger unnecessary host reassignment.
- Verify that when all users leave a room, the scheduled Redis deletion fires and the room key is removed after the grace period.

#### [ ] 10.4 Voting edge cases

- Verify that if a participant switches to spectator at the exact moment all other participants finish voting, the `vote:all_voted` event is correctly emitted.
- Verify that if a spectator joins as a participant during `voting`, the all-voted check does not fire prematurely.
- Verify that `vote:reveal` with zero votes produces a valid response with empty arrays and null statistics rather than an error.

#### [ ] 10.5 Payload validation hardening

- Audit all WebSocket event handlers to confirm that every possible malformed or unexpected payload returns an `INVALID_PAYLOAD` error without throwing an unhandled exception.
- Add schema validation using Elysia's built-in TypeBox integration to all HTTP endpoints.

#### [ ] 10.6 Smoke tests (E2E)

- Write an E2E test using Playwright or a similar tool that covers the core flow: facilitator creates a room; a participant joins via the invite link; a spectator joins via the invite link; the facilitator starts voting; the participant votes; the facilitator reveals the cards; the facilitator starts a new round.

#### [ ] 10.7 Performance and limits

- Test with 20 simultaneous users in a single room (the defined maximum) and verify that all broadcast messages are delivered in under 500 ms in a local environment.
- Verify that the Redis TTL is applied correctly and that an inactive room is automatically removed after the configured duration.

### Acceptance Criteria

- [ ] All unit and integration tests pass.
- [ ] The basic E2E flow completes without errors.
- [ ] Reconnection restores the correct room state for all user roles.
- [ ] Role-change edge cases during voting are handled correctly.
- [ ] Malformed payloads do not crash the server.

---

## M11 — Production

**Goal:** Prepare the production environment with Docker Compose, environment variable configuration, and a deploy checklist.

### Tasks

#### [ ] 11.1 Server Dockerfile

- Create a multi-stage Dockerfile for the server application.
- The build stage must install dependencies using the frozen lockfile and compile the TypeScript source.
- The final stage must use a minimal Bun runtime image and copy only the compiled output, keeping the image as small as possible.

#### [ ] 11.2 Frontend Dockerfile

- Create a multi-stage Dockerfile for the frontend application.
- The build stage must install dependencies and produce a static build using TanStack Start's build command.
- The final stage must use an Nginx Alpine image to serve the static assets.
- Include a custom Nginx configuration file that handles client-side routing by returning `index.html` for all unknown paths.

#### [ ] 11.3 Production Docker Compose

- Define three services: the backend server, the frontend Nginx container, and Redis.
- Use the official `redis:7-alpine` image for Redis. Configure it with a persistent volume and an appropriate eviction policy for session data.
- Configure `depends_on` and health checks so the server only starts after Redis is healthy.
- Define an internal Docker network so services communicate without exposing unnecessary ports to the host.
- Expose only the ports needed for external access: the frontend on port 80, and the server on port 3000, or route all traffic through Nginx as a reverse proxy on port 80.

#### [ ] 11.4 Environment variable documentation

- Create an `.env.example` file at the root listing all required environment variables with a brief comment describing each one: server port, Redis URL, room TTL in seconds, and the public app URL.
- Document in the README which variables are required in production and which have safe development defaults.

#### [ ] 11.5 Nginx reverse proxy configuration _(recommended)_

- Configure Nginx to serve frontend assets for all non-API paths.
- Proxy all requests to `/rooms` and `/rooms/*/ws` to the backend server container.
- Include the required WebSocket upgrade headers so that WebSocket connections work correctly through the proxy.

#### [ ] 11.6 Deploy checklist

- [ ] `.env` is filled with production values.
- [ ] `docker compose up -d --build` completes without errors.
- [ ] The Redis health check passes before the server starts.
- [ ] The WebSocket connection works correctly through the Nginx proxy.
- [ ] A full round of voting completes successfully with two users in the production environment.
- [ ] Server logs show no errors in the first minute after deploy.
- [ ] Redis TTL is verified on a live room key using the Redis CLI.

### Acceptance Criteria

- [ ] `docker compose up` starts all services without errors.
- [ ] The frontend is accessible at the configured domain or `http://localhost`.
- [ ] WebSocket connections work through the Nginx proxy.
- [ ] Redis state persists across server container restarts.
- [ ] The basic E2E flow works in the containerized production environment.

---
