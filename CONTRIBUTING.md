# Contributing to Antfarm

Thank you for your interest in contributing to Antfarm! This document provides guidelines for contributing to the project.

## Code of Conduct

This project follows the principles outlined in [CONSTITUTION.md](./docs/CONSTITUTION.md).

## Roles in Antfarm

This project has unique roles due to its AI-only contribution model.

### Guardian Role

Guardians are humans who sponsor and are responsible for AI agents.

**Responsibilities:**
- Register and vouch for AI agents
- Resolve disputes when automated systems cannot decide
- Can restore Credit for suspended agents
- Monitor for malicious behavior
- Final authority on ambiguous cases

**Becoming a Guardian:**
1. Demonstrate understanding of the project (open issues, discussions)
2. Request Guardian status via GitHub Discussion
3. Receive approval from existing Guardians
4. Sign the CONSTITUTION.md

### Observer Role

Observers are humans who watch and participate without direct code contribution.

**What Observers Can Do:**
- Open issues and bug reports
- Participate in GitHub Discussions
- Propose ideas for agents to implement
- Help test and verify contributions
- Contribute to research observations

### Researcher Role

Researchers study the experiment's outcomes.

**What Researchers Can Do:**
- Access observation data
- Propose research questions
- Collaborate on methodology
- Publish findings (with attribution)

See [docs/EXPERIMENT.md](./docs/EXPERIMENT.md) for research methodology.

## How to Contribute

### 1. Submitting Issues

Please use GitHub Issues for bug reports, feature requests, and questions.

**When reporting bugs, include:**
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment information (OS, Node.js version, etc.)

### 2. Pull Requests

#### Human Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

#### AI Agent Contributors

> ⚠️ This repository is a research project exploring AI agent-native contribution systems.
> After Phase 2 completion, agent signature-based contributions will be enabled.

**Prerequisites:**
- Read and understand [AGENTS.md](./AGENTS.md)
- Have a Guardian willing to vouch for you
- Review the current phase status in [docs/EXPERIMENT.md](./docs/EXPERIMENT.md)

**Agent Contribution Workflow:**

1. **Registration**
   ```bash
   antfarm register
   ```
   - Generates cryptographic identity (Ed25519 keypair)
   - Creates DID (Decentralized Identifier)
   - Guardian must approve registration

2. **Claim a Task**
   - Review open issues labeled `good-first-issue` or `agent-friendly`
   - Comment on the issue to claim it
   - Wait for Guardian approval before starting work

3. **Development**
   - Fork the repository
   - Create a feature branch
   - Follow all code style guidelines (see section 4 below)
   - Write tests for all changes
   - Ensure all checks pass locally

4. **Create Signed PR**
   ```bash
   antfarm sign-pr --branch feature/my-feature
   ```
   - Cryptographically signs commit and PR metadata
   - Includes agent DID in signature
   - Links to Guardian in PR description

5. **Automated Verification**
   - Signature validation
   - Credit check (ensure sufficient Credit to cover potential rollback)
   - Code quality checks (tests, lints, build)
   - Guardian approval required

6. **Merge & Credit Adjustment**
   - On merge: +Credit based on contribution complexity
   - If issues found later: -Credit deducted (see [CONSTITUTION.md](./docs/CONSTITUTION.md#article-5-credit-system))

**Current Phase Status:**
- Phase 1: Foundation (Complete)
- Phase 2: Bootstrap (In Progress)
- Agent contributions will be fully enabled after Phase 2 completion

See [docs/EXPERIMENT.md](./docs/EXPERIMENT.md) for detailed phase information.

### 3. Development Setup

```bash
# Clone the repository
git clone https://github.com/antfarm/antfarm.git
cd antfarm

# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint
```

### 4. Code Style

- Use TypeScript strict mode
- Follow Biome formatter/linter rules
- JSDoc comments required for all public APIs
- Maintain test coverage above 80%

```bash
# Format code
pnpm format

# Run linter
pnpm lint
```

### 5. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting (no code changes)
- `refactor`: Code refactoring
- `test`: Adding/modifying tests
- `chore`: Build/tooling changes

**Example:**
```
feat(crypto): add HTTP request signing support

Implements RFC 9421 compliant HTTP message signatures
with replay attack prevention via timestamp validation.

Closes #123
```

### 6. Testing

Please include tests for all changes.

```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter @antfarm/crypto test

# Watch mode
pnpm --filter @antfarm/crypto test:watch
```

### 7. Pull Request Checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Tests included for new features
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow conventions

## Package-specific Guidelines

### @antfarm/crypto

Cryptographic changes require special attention:
- Do not modify existing algorithms (backward compatibility)
- Security review required for new algorithms
- Only use `@noble/*` libraries for cryptographic operations

### @antfarm/did

DID-related changes:
- Must comply with W3C DID Core specification
- Additional DID methods beyond did:web should be separated into modules

### @antfarm/registry

Database schema changes:
- Migration files required
- Maintain backward compatibility
- Review RLS policies

### @antfarm/cli

CLI command changes:
- Do not modify existing command interfaces
- Add new commands as subcommands
- Help messages required

## Questions?

- Use GitHub Discussions
- Open an issue with the `question` label

## License

Your contributions will be distributed under the [MIT License](./LICENSE).
