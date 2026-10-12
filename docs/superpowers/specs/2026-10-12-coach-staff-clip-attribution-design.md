# Coach Staff Clip Attribution

## Goal

Allow clips submitted from a president or coach channel to be approved and published with the person's name and the shared public tag **Coach Staff**.

## Current behavior

Clip import resolves the channel against `TEAM` only. Presidents and coaches are maintained separately in `COACH_STAFF`, so their clips currently fail import as an unlinked channel. Published clips only resolve their displayed owner name from `TEAM`.

## Design

- Keep the existing roster-player lookup first to preserve current behavior and avoid changing matches for players.
- If no player matches, look up the source channel in `COACH_STAFF` using the configured Kick channel URL or Twitch social handle.
- Persist a nullable `coach_staff_id` on `clips` for clips owned by a Coach Staff member. Player clips continue to use `player_id`; Coach Staff clips do not masquerade as players.
- Store the matched owner during both direct staff imports and community-submission imports for Kick and Twitch.
- Published public cards show the Coach Staff member's configured name and the shared `Coach Staff` tag. The admin's recent-import row also identifies Coach Staff clips; its player selector is not offered for those rows.
- Unknown channels keep the existing retryable import failure behavior. Submission form, moderation states, consented submitter byline, and clip playback remain unchanged.

## Verification

- Unit tests cover matching Kick and Twitch Coach Staff handles, player-first precedence, and unknown handles.
- Import regression tests verify the matched Coach Staff ID is saved for direct and community imports.
- UI verification checks that the name and `Coach Staff` tag appear publicly and that admin rows are not presented as unassigned players.
- Full tests, TypeScript, lint, and production build must pass.

## Alternatives considered

1. **Resolve both catalogs and store a typed Coach Staff reference (chosen):** auto-attributes clips while preserving the distinction between players and organization staff.
2. **Show only a generic Coach Staff label:** avoids identifying the person but loses useful attribution and still requires a way to import their clips.
3. **Manual player assignment:** cannot represent presidents/coaches cleanly and does not solve automatic import failure.
