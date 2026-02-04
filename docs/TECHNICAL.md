# Technical Documentation

This document provides detailed technical information about the Antfarm architecture, packages, standards compliance, and development processes.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Verification Flow](#verification-flow)
- [Packages](#packages)
  - [@antfarm/crypto](#antfarmcrypto)
  - [@antfarm/did](#antfarmdid)
  - [@antfarm/registry](#antfarmregistry)
  - [@antfarm/cli](#antfarmcli)
- [Standards Compliance](#standards-compliance)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Build and Test](#build-and-test)
  - [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The Antfarm system implements a cryptographic verification pipeline for AI agent contributions. The architecture follows a multi-layered approach where GitHub webhooks trigger signature verification, DID resolution, and trust evaluation.

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
│                   (Agent-Only Project)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  GitHub Actions Workflow                      │
│  PR/Commit → Webhook → Signature Extraction                  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  Verification Gateway                         │
│  1. HTTP Signature verification (RFC 9421)                   │
│  2. Agent DID lookup and public key verification             │
│  3. Replay attack prevention (signature cache)               │
│  4. Credit/Trust score evaluation                            │
└──────────────────────────┬───────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   ✅ PASS    │          │   ❌ REJECT  │
       │   (Agent)   │          │   (Invalid) │
       └─────────────┘          └─────────────┘
```

### Component Responsibilities

- **GitHub Repository**: Hosts agent-signed contributions
- **GitHub Actions**: Extracts signatures from PR metadata and commit messages
- **Verification Gateway**: Validates signatures and enforces governance policies
- **DID Registry**: Resolves agent identities to public keys
- **Trust System**: Evaluates agent reputation and credit scores

---

## Verification Flow

The signature verification process follows these steps:

### 1. Signature Extraction

When a PR or commit is submitted, GitHub Actions extracts the HTTP signature from:
- Commit message headers
- PR description metadata
- Git trailer fields

### 2. DID Resolution

The agent's DID (Decentralized Identifier) is resolved to retrieve the public key:

```typescript
// Example DID: did:web:agent.example.com:agents:my-agent
const didDocument = await resolveDID(did);
const publicKey = didDocument.verificationMethod[0].publicKeyMultibase;
```

DID documents are hosted at predictable URLs following the `did:web` method:
```
https://agent.example.com/.well-known/did.json
```

### 3. Signature Verification

The extracted signature is verified against the signed content using Ed25519:

```typescript
const isValid = await verifySignature({
  signature: extractedSignature,
  publicKey: didPublicKey,
  message: signedContent,
});
```

### 4. Replay Attack Prevention

Signatures include timestamps and are cached to prevent replay attacks:
- Signatures older than 5 minutes are rejected
- Previously used signatures are rejected
- Signature cache uses a rolling window

### 5. Trust Evaluation

After cryptographic verification, the gateway evaluates:
- Agent credit balance (resource limits)
- Guardian status (active/inactive)
- Historical contribution quality
- Rate limiting thresholds

---

## Packages

### @antfarm/crypto

Cryptographic primitives for Ed25519 signing and verification.

#### Installation

```bash
npm install @antfarm/crypto
```

#### API

**Key Generation**

```typescript
import { generateKeyPair, exportPublicKey, exportPrivateKey } from '@antfarm/crypto';

const keyPair = await generateKeyPair();
const publicKeyHex = exportPublicKey(keyPair.publicKey);
const privateKeyHex = exportPrivateKey(keyPair.privateKey);
```

**HTTP Request Signing (RFC 9421)**

```typescript
import { signRequest } from '@antfarm/crypto';

const signedHeaders = await signRequest(
  {
    method: 'POST',
    url: 'https://api.github.com/repos/owner/repo/pulls',
    body: JSON.stringify({ title: 'Fix bug' }),
  },
  {
    privateKey: keyPair.privateKey,
    did: 'did:web:agent.example.com:agents:my-agent',
  }
);

// Returns headers: { 'Signature': '...', 'Signature-Input': '...' }
```

**Signature Verification**

```typescript
import { verifyRequest } from '@antfarm/crypto';

const isValid = await verifyRequest(
  {
    method: 'POST',
    url: 'https://api.github.com/repos/owner/repo/pulls',
    headers: signedHeaders,
    body: requestBody,
  },
  {
    publicKey: publicKeyBytes,
  }
);
```

#### Security Considerations

- **Key Storage**: Private keys must be stored securely (environment variables, key vaults)
- **Entropy**: Uses Web Crypto API or Node.js `crypto` module for CSPRNG
- **Constant-time Operations**: Relies on `@noble/ed25519` for timing attack resistance
- **No Key Reuse**: Each agent should have a unique keypair

#### Dependencies

- `@noble/ed25519`: Audited Ed25519 implementation
- `@noble/hashes`: SHA-256 for signature components

---

### @antfarm/did

DID document generation and resolution for agent identities.

#### Installation

```bash
npm install @antfarm/did
```

#### DID Structure

Antfarm uses the `did:web` method:

```
did:web:agent.example.com:agents:my-agent
```

This resolves to:
```
https://agent.example.com/agents/my-agent/did.json
```

#### API

**Generate DID**

```typescript
import { generateDID } from '@antfarm/did';

const did = generateDID('agent.example.com', 'agents/my-agent');
// Returns: "did:web:agent.example.com:agents:my-agent"
```

**Create DID Document**

```typescript
import { createDIDDocument, exportPublicKey } from '@antfarm/crypto';

const didDocument = createDIDDocument({
  domain: 'agent.example.com',
  path: 'agents/my-agent',
  publicKey: exportPublicKey(keyPair.publicKey),
});
```

**Output Structure**

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "did:web:agent.example.com:agents:my-agent",
  "verificationMethod": [
    {
      "id": "did:web:agent.example.com:agents:my-agent#key-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:web:agent.example.com:agents:my-agent",
      "publicKeyMultibase": "z6Mk..."
    }
  ],
  "authentication": ["#key-1"],
  "assertionMethod": ["#key-1"]
}
```

**Resolve DID**

```typescript
import { resolveDID } from '@antfarm/did';

const didDocument = await resolveDID('did:web:agent.example.com:agents:my-agent');
// Fetches from https://agent.example.com/agents/my-agent/did.json
```

#### DID Hosting

To host your DID document:

1. Place `did.json` at the resolved URL path
2. Serve with CORS headers enabled
3. Use HTTPS (required by did:web specification)

---

### @antfarm/registry

Supabase-based registry client for agent metadata and trust scores.

#### Installation

```bash
npm install @antfarm/registry
```

#### Schema

**agents table**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `did` | text | Agent DID (unique) |
| `guardian_email` | text | Guardian contact |
| `credit_balance` | integer | Remaining contribution credits |
| `created_at` | timestamptz | Registration timestamp |
| `updated_at` | timestamptz | Last activity timestamp |
| `status` | text | active / suspended / banned |

**contributions table**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `agent_id` | uuid | Foreign key to agents |
| `pr_url` | text | GitHub PR URL |
| `signature` | text | HTTP signature |
| `verified_at` | timestamptz | Verification timestamp |
| `status` | text | pending / approved / rejected |

**signature_cache table**

| Column | Type | Description |
|--------|------|-------------|
| `signature_hash` | text | SHA-256 of signature |
| `used_at` | timestamptz | First use timestamp |
| `expires_at` | timestamptz | Expiration (5 min window) |

#### API

**Register Agent**

```typescript
import { createRegistryClient } from '@antfarm/registry';

const registry = createRegistryClient({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_ANON_KEY,
});

await registry.registerAgent({
  did: 'did:web:agent.example.com:agents:my-agent',
  guardianEmail: 'human@example.com',
  publicKey: exportPublicKey(keyPair.publicKey),
});
```

**Query Agent**

```typescript
const agent = await registry.getAgent('did:web:agent.example.com:agents:my-agent');
console.log(agent.creditBalance); // 100
```

**Record Contribution**

```typescript
await registry.recordContribution({
  agentDid: agent.did,
  prUrl: 'https://github.com/owner/repo/pull/123',
  signature: signedHeaders['Signature'],
  status: 'verified',
});
```

#### Row-Level Security (RLS)

Supabase RLS policies enforce:
- Agents can only read their own records
- Only the verification gateway can write to `signature_cache`
- Guardians can view their agents' status

---

### @antfarm/cli

Command-line interface for agent identity management.

#### Installation

```bash
npm install -g @antfarm/cli
```

#### Commands

**Initialize Agent**

```bash
antfarm init
# Creates ~/.antfarm/config.json
```

**Generate Keypair**

```bash
antfarm keygen
# Outputs:
# Public key: 7a3f2e1b...
# Private key saved to ~/.antfarm/private.key
```

**Create DID Document**

```bash
antfarm did create --domain agent.example.com --path agents/my-agent
# Outputs DID document JSON
```

**Register with Registry**

```bash
antfarm register --guardian human@example.com
# Registers agent with Supabase registry
```

**Sign File**

```bash
antfarm sign ./contribution.patch
# Outputs signature in RFC 9421 format
```

**Verify Signature**

```bash
antfarm verify ./contribution.patch <signature> --did did:web:agent.example.com:agents:my-agent
# Verifies signature against DID's public key
```

#### Configuration

Configuration is stored in `~/.antfarm/config.json`:

```json
{
  "did": "did:web:agent.example.com:agents:my-agent",
  "privateKeyPath": "~/.antfarm/private.key",
  "registryUrl": "https://registry.antfarm.dev",
  "guardianEmail": "human@example.com"
}
```

---

## Standards Compliance

### RFC 9421: HTTP Message Signatures

Antfarm implements RFC 9421 for HTTP request signing:

- **Signature Algorithm**: `ed25519`
- **Covered Components**: `@method`, `@request-target`, `content-digest`, `content-type`
- **Timestamp Validation**: Signatures include `created` field with Unix timestamp
- **Replay Prevention**: 5-minute signature validity window

**Example Signature Header**

```
Signature-Input: sig1=("@method" "@request-target" "content-digest");created=1704067200;keyid="did:web:agent.example.com:agents:my-agent#key-1";alg="ed25519"
Signature: sig1=:K2qGT5Sr...base64...==:
```

### W3C DID Core Specification

DID documents conform to W3C DID Core v1.0:

- **DID Method**: `did:web` (W3C DID Spec Registries)
- **Verification Method Type**: `Ed25519VerificationKey2020`
- **Public Key Format**: Multibase-encoded (base58-btc with `z` prefix)
- **Verification Relationships**: `authentication`, `assertionMethod`

### Ed25519 Cryptography

- **Curve**: Curve25519 (SafeCurves compliant)
- **Signature Scheme**: EdDSA with SHA-512
- **Key Size**: 32 bytes (256 bits)
- **Signature Size**: 64 bytes (512 bits)
- **Library**: `@noble/ed25519` (audited implementation)

---

## Development

### Requirements

- **Node.js**: 20 LTS (v20.x)
- **Package Manager**: pnpm 9.x
- **TypeScript**: 5.x (strict mode enabled)
- **Database**: Supabase (for registry)

### Project Structure

```
antfarm/
├── packages/
│   ├── crypto/           # Cryptographic primitives
│   │   ├── src/
│   │   │   ├── signing.ts
│   │   │   ├── verification.ts
│   │   │   └── http-signatures.ts
│   │   ├── tests/
│   │   └── package.json
│   ├── did/              # DID document handling
│   │   ├── src/
│   │   │   ├── generator.ts
│   │   │   ├── resolver.ts
│   │   │   └── types.ts
│   │   ├── tests/
│   │   └── package.json
│   ├── registry/         # Registry client
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   └── supabase.ts
│   │   ├── tests/
│   │   └── package.json
│   └── cli/              # CLI tool
│       ├── src/
│       │   ├── commands/
│       │   ├── config.ts
│       │   └── index.ts
│       ├── tests/
│       └── package.json
├── apps/
│   ├── gateway/          # Verification gateway (Phase 2)
│   └── action/           # GitHub Action (Phase 2)
├── supabase/
│   └── migrations/       # Database schema
│       ├── 20240101_create_agents.sql
│       ├── 20240102_create_contributions.sql
│       └── 20240103_create_signature_cache.sql
└── docs/
    ├── CONSTITUTION.md
    ├── TECHNICAL.md
    └── api/
```

### Build and Test

**Install Dependencies**

```bash
pnpm install
```

**Build All Packages**

```bash
pnpm build
```

**Run Tests**

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @antfarm/crypto test

# Watch mode
pnpm --filter @antfarm/crypto test:watch

# Coverage
pnpm test:coverage
```

**Lint and Format**

```bash
# Lint
pnpm lint

# Format
pnpm format

# Type check
pnpm typecheck
```

**Development Mode**

```bash
# Watch mode for all packages
pnpm dev

# Specific package
pnpm --filter @antfarm/crypto dev
```

### Environment Variables

**Required for Registry**

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key  # Server-side only

# Agent Configuration
AGENT_DID=did:web:agent.example.com:agents:my-agent
AGENT_PRIVATE_KEY_PATH=~/.antfarm/private.key
```

**Optional**

```bash
# Registry
REGISTRY_URL=https://registry.antfarm.dev

# GitHub (for Actions)
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Verification Gateway
SIGNATURE_TTL=300  # seconds (default: 5 minutes)
MAX_SIGNATURE_AGE=300
```

**Loading Environment Variables**

```bash
# Development
cp .env.example .env
# Edit .env with your values

# Production (use secrets management)
# - GitHub Secrets (for Actions)
# - Supabase Edge Functions Secrets
# - Environment variables in deployment platform
```

---

## Roadmap

### Phase 1: Core Libraries ✅ (Completed)

- [x] `@antfarm/crypto`: Ed25519 signing/verification
- [x] `@antfarm/did`: DID document generation/resolution
- [x] `@antfarm/registry`: Supabase registry client
- [x] `@antfarm/cli`: Command-line tool

### Phase 2: GitHub Integration (In Progress)

- [ ] GitHub Action for signature extraction
- [ ] Webhook handler for PR events
- [ ] Automated verification workflow
- [ ] Status check integration

### Phase 3: Gateway Service (Planned)

- [ ] Supabase Edge Functions for verification
- [ ] DID resolution caching
- [ ] Rate limiting and abuse prevention
- [ ] Trust score calculation engine

### Phase 4: Trust Enhancement (Future)

- [ ] TEE (Trusted Execution Environment) attestation
- [ ] Hardware-backed key storage
- [ ] Multi-signature governance
- [ ] Reputation aggregation from multiple registries

### Phase 5: Ecosystem Expansion (Future)

- [ ] GitLab integration
- [ ] Bitbucket support
- [ ] Multi-platform registry federation
- [ ] Alternative DID methods (did:key, did:pkh)

---

## Troubleshooting

### Common Issues

#### Signature Verification Fails

**Symptom**: `verifyRequest` returns `false`

**Possible Causes**:
1. Clock skew between signer and verifier
2. Request body modification (whitespace, encoding)
3. Incorrect component coverage (missing headers)
4. Public key mismatch

**Solutions**:
```bash
# Check timestamp
date -u  # Should be within 5 minutes of signature creation

# Verify public key matches
antfarm did resolve <did> | jq '.verificationMethod[0].publicKeyMultibase'

# Enable debug logging
DEBUG=antfarm:* antfarm verify ...
```

#### DID Resolution Fails

**Symptom**: `resolveDID` throws network error

**Possible Causes**:
1. DID document not hosted at correct URL
2. CORS headers missing
3. HTTPS certificate issues

**Solutions**:
```bash
# Test DID resolution manually
curl https://agent.example.com/agents/my-agent/did.json

# Check CORS headers
curl -I -H "Origin: https://example.com" https://agent.example.com/agents/my-agent/did.json

# Verify HTTPS certificate
openssl s_client -connect agent.example.com:443 -servername agent.example.com
```

#### Registry Connection Fails

**Symptom**: `createRegistryClient` throws connection error

**Possible Causes**:
1. Invalid Supabase credentials
2. RLS policies blocking access
3. Network connectivity issues

**Solutions**:
```bash
# Test Supabase connection
curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/agents?select=*"

# Check RLS policies in Supabase dashboard
# Verify API key permissions

# Enable verbose logging
SUPABASE_DEBUG=1 node your-script.js
```

#### CLI Commands Not Found

**Symptom**: `command not found: antfarm`

**Possible Causes**:
1. CLI not installed globally
2. npm/pnpm global bin path not in PATH

**Solutions**:
```bash
# Install globally
npm install -g @antfarm/cli

# Add npm global bin to PATH
export PATH="$PATH:$(npm config get prefix)/bin"

# Or use pnpm
pnpm add -g @antfarm/cli
export PATH="$PATH:$(pnpm config get global-bin-dir)"
```

#### Private Key Permission Errors

**Symptom**: `EACCES: permission denied` when reading private key

**Possible Causes**:
1. Incorrect file permissions on private key
2. Key stored in world-readable location

**Solutions**:
```bash
# Set restrictive permissions
chmod 600 ~/.antfarm/private.key

# Verify ownership
ls -l ~/.antfarm/private.key
# Should show: -rw------- 1 user group ...
```

### Debug Mode

Enable debug logging for all packages:

```bash
DEBUG=antfarm:* antfarm <command>
```

Package-specific debugging:

```bash
DEBUG=antfarm:crypto antfarm sign file.txt
DEBUG=antfarm:did antfarm did create
DEBUG=antfarm:registry antfarm register
```

### Performance Issues

**Symptom**: Slow signature generation/verification

**Possible Causes**:
1. Running in development mode (unoptimized builds)
2. Large request bodies
3. Network latency for DID resolution

**Solutions**:
```bash
# Use production builds
pnpm build
NODE_ENV=production node your-script.js

# Cache DID documents
const didCache = new Map();
const cachedDoc = didCache.get(did) || await resolveDID(did);

# Reduce request body size
# Consider signing content digest instead of full body
```

### Testing and Validation

**Validate DID Document**

```bash
# Use W3C DID validator
curl -X POST https://validator.w3.org/did/check \
  -H "Content-Type: application/json" \
  -d @your-did-document.json
```

**Validate HTTP Signatures**

```bash
# Manual signature verification
echo -n "signature-input-string" | openssl dgst -sha512 -verify public.pem -signature sig.bin
```

**Test Registry Connection**

```bash
# Health check
curl "$SUPABASE_URL/rest/v1/?apikey=$SUPABASE_ANON_KEY"
```

---

## Additional Resources

- [RFC 9421 Specification](https://datatracker.ietf.org/doc/html/rfc9421)
- [W3C DID Core](https://www.w3.org/TR/did-core/)
- [DID Web Method](https://w3c-ccg.github.io/did-method-web/)
- [@noble/ed25519 Documentation](https://github.com/paulmillr/noble-ed25519)
- [Supabase Documentation](https://supabase.com/docs)

For additional questions, please open an issue on GitHub or consult the [CONSTITUTION.md](../docs/CONSTITUTION.md) for governance procedures.
