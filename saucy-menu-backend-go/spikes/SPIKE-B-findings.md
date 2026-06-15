# Spike B — Password Hash Format

## Status: COMPLETE

## Source

`lib/auth.ts` overrides better-auth's default password handling with:
```ts
password: {
    hash: async (password) => await Bun.password.hash(password),
    verify: async (data) => await Bun.password.verify(data.password, data.hash),
}
```

better-auth's default (scrypt) is **NOT used**. All passwords in the `account.password`
column are hashed by `Bun.password.hash` which uses **argon2id**.

## Hash Format (verified from `Bun.password.hash("Password123!")`)

```
$argon2id$v=19$m=65536,t=2,p=1$<salt>$<hash>
```

- **Algorithm:** argon2id
- **Version:** 19 (0x13)
- **Parameters:** m=65536 (64 MiB), t=2 iterations, p=1 thread
- **Salt:** 32 bytes, encoded as base64 RawStd (standard alphabet `+/`, NO padding)
- **Hash:** 32 bytes, encoded as base64 RawStd (standard alphabet `+/`, NO padding)

Example:
```
$argon2id$v=19$m=65536,t=2,p=1$KMWnd11HWS0bkxO0MFQYJ46o+Aevnu9XmMDeI+vgz1Y$x8W0A2xI8JCNmLs7AyKWgPEXi5r3D0LOTjKvR9BnF/s
```

## Go Implementation

In `internal/auth/passwordhash/hash.go`:
- Use `golang.org/x/crypto/argon2.IDKey` with params `time=2, memory=65536, threads=1, keyLen=32`
- Encode salt + hash as `base64.RawStdEncoding` (standard `+/` alphabet, no `=` padding)
- Hash format: `$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s`
- Verify: parse the stored hash string, extract m/t/p/salt/hash, recompute, constant-time compare

## Decision

Since the backend is pre-production, we standardize forward on this exact Bun argon2id
format. All new passwords will use these parameters. The Go verifier accepts this format;
the Go hasher produces this format. The `lib/auth.ts` override is reproduced exactly.

## Verify the reference value in Go

To prove Go compatibility, the test must accept:
```
password: "Password123!"
hash: "$argon2id$v=19$m=65536,t=2,p=1$KMWnd11HWS0bkxO0MFQYJ46o+Aevnu9XmMDeI+vgz1Y$x8W0A2xI8JCNmLs7AyKWgPEXi5r3D0LOTjKvR9BnF/s"
```
