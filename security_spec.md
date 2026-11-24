# Security Specification — SIMANTEN Black Edition Wedding Invitation

## 1. Data Invariants

1. Public invitation content (`/wedding/main`, `/events/*`, `/gifts/*`, `/gallery/*`) is readable by guests and writable ONLY by verified administrators (`isAdmin()`).
2. Private PII & management records (`/guests/*`, `/rsvps/*`, `/admins/*`) are NEVER readable or listable by unauthenticated or non-admin users.
3. Public guests may submit `/rsvps/{rsvpId}` and `/wishes/{wishId}` ONLY with strictly allowlisted keys, valid string lengths, valid enums (`Hadir` / `Tidak Hadir`), bounded numeric ranges (`attendeeCount` 0..10), and server-verified timestamp `request.time`.
4. Public list queries on `/wishes` are strictly constrained by `resource.data.status == 'approved'` unless the caller is a verified admin; unapproved or rejected wishes are never exposed publicly.
5. Admin identity requires both verified email (`request.auth.token.email_verified == true`) and either matching the bootstrapped owner email (`saeful.muzani@gmail.com`) or existing in `/admins/$(request.auth.uid)`.
6. All document IDs on single-document operations are validated with `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Ghost/Shadow Field Injection on RSVP**: `{ guestName: "Attacker", attendance: "Hadir", attendeeCount: 2, message: "Hi", guestSlug: "attacker", createdAt: serverTimestamp(), isAdmin: true }`
2. **Oversized Message Payload (Denial of Wallet)**: `{ guestName: "A".repeat(200), attendance: "Hadir", attendeeCount: 1, message: "X".repeat(2000), createdAt: serverTimestamp() }`
3. **Invalid Attendance Enum**: `{ guestName: "Guest", attendance: "Maybe", attendeeCount: 1, createdAt: serverTimestamp() }`
4. **Out-of-Bounds Attendee Count**: `{ guestName: "Guest", attendance: "Hadir", attendeeCount: 999, createdAt: serverTimestamp() }`
5. **Forged Client Timestamp on RSVP**: `{ guestName: "Guest", attendance: "Hadir", attendeeCount: 1, createdAt: new Date("2020-01-01") }`
6. **Public Wish Status Escalation to Rejected/Arbitrary**: `{ guestName: "Guest", attendance: "Hadir", message: "Spam", status: "admin_pinned", createdAt: serverTimestamp() }`
7. **Unauthenticated Read of Private Guest List**: `getDocs(collection(db, "guests"))`
8. **Unauthenticated Read of RSVP PII**: `getDocs(collection(db, "rsvps"))`
9. **Unverified Admin Email Spoof**: Authenticated user with `email: "saeful.muzani@gmail.com"` and `email_verified: false` attempting write to `/wedding/main`.
10. **Non-Admin Self-Escalation to `/admins/{uid}`**: Authenticated non-admin writing `{ email: "user@example.com", role: "admin", createdAt: serverTimestamp() }` to `/admins/self`.
11. **Public Overwrite of Existing Event**: Non-admin attempting `updateDoc` on `/events/akad` with valid schema fields.
12. **Poisoned Document ID**: Attempting `setDoc` on `/rsvps/${"a".repeat(300)}` or `/rsvps/bad$id!`.
