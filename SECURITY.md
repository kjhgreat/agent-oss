# Security Policy

## Overview

Antfarm is an open-source contribution verification system designed to accept contributions signed by AI agents. Security is a critical component of this mission, as we rely on cryptographic signatures, digital identity verification, and secure key management.

This document outlines our security practices, supported versions, and vulnerability reporting procedures.

## Supported Versions

We provide security updates for the following versions:

| Version | Status | Support Until |
|---------|--------|---------------|
| 1.x | Current | Feb 2027 |
| 0.2.x | Maintenance | Aug 2026 |
| < 0.2.0 | End of Life | Not supported |

Security patches will be released for the current and maintenance release lines. Critical vulnerabilities may receive backports to older versions at the maintainers' discretion.

## Reporting a Vulnerability

If you discover a security vulnerability in Antfarm, please report it responsibly to **security@antfarm.dev** instead of creating a public GitHub issue.

### Reporting Guidelines

When reporting a vulnerability, please include:

1. **Description**: What is the vulnerability and how does it affect the system?
2. **Affected Components**: Which package(s) or version(s) are affected?
   - @antfarm/crypto
   - @antfarm/did
   - @antfarm/registry
   - @antfarm/cli
   - Gateway service (Phase 2+)

3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Impact**: What could an attacker do with this vulnerability?
5. **Proof of Concept**: If possible, provide a minimal example (code, test case, etc.)
6. **Suggested Fix**: If you have ideas for remediation

### Reporting Timeline

- **Upon receipt**: We acknowledge your report within 2 business days
- **Initial assessment**: We evaluate severity within 5 business days
- **Updates**: We provide status updates every 7 days
- **Resolution**: We work toward a patch and coordinated disclosure

## Security Best Practices for This Project

### For Users

#### Key Management

1. **Private Key Security**
   - Store private keys securely (hardware wallet, encrypted storage, HSM)
   - Never commit private keys to version control
   - Use environment variables or secure key management systems
   - Rotate keys periodically
   - Use different keys for different environments (dev, staging, production)

2. **Public Key Distribution**
   - Publish public keys via DID documents on trusted domains
   - Use HTTPS for all DID document retrieval
   - Verify DID document integrity and signatures
   - Maintain backups of DID documents

#### Contribution Workflow

1. **Before Signing**
   - Review all changes carefully before creating signatures
   - Verify that the patch matches intended modifications
   - Use replay attack prevention (timestamp validation in HTTP signatures)
   - Test locally before submitting signed contributions

2. **Guardian Responsibility**
   - All AI agents must register a human guardian
   - Guardians are accountable for agent actions
   - Guardians should monitor agent activity
   - Establish clear guidelines for agent behavior

#### Verification

1. **Validate Signatures**
   - Always verify HTTP signatures before processing contributions
   - Check that signatures are not replayed (verify timestamps)
   - Validate DID documents before trusting public keys
   - Maintain a blacklist of revoked keys

### For Contributors

#### Code Security

1. **Cryptographic Operations**
   - Only use audited cryptographic libraries
   - Do not implement custom cryptography
   - Follow the principle of least privilege
   - Validate all inputs before cryptographic operations

2. **Dependency Management**
   - Keep dependencies up to date
   - Monitor for security advisories
   - Use lock files (pnpm-lock.yaml)
   - Audit dependencies regularly: `pnpm audit`

3. **Secret Management**
   - Never hardcode secrets in code
   - Use environment variables for sensitive data
   - Use `.env.example` for non-sensitive defaults
   - Review `.gitignore` to prevent accidental secret leaks

#### Testing Security

1. **Test Coverage**
   - Include tests for edge cases and error conditions
   - Test with invalid inputs
   - Test signature verification failure cases
   - Maintain >80% test coverage

2. **Code Review**
   - All changes require code review
   - Security-sensitive changes require additional review
   - Use automated linters and type checking
   - Run `pnpm lint` and `pnpm test` before submission

### Package-Specific Security Guidance

#### @antfarm/crypto

- **Cryptographic Integrity**: Uses RFC 9421 compliant HTTP message signatures
- **Algorithm Security**: Based on `@noble/ed25519`, a peer-reviewed implementation
- **Key Material**: Private keys should never be logged or exposed
- **Signature Verification**: Always verify before accepting contributions

**Security Requirements for Changes:**
- Backward compatibility must be maintained
- New algorithms require security review
- Only use `@noble/*` libraries for cryptographic primitives
- Include comprehensive tests for all cryptographic operations

#### @antfarm/did

- **DID Specification Compliance**: Adheres to W3C DID Core specification
- **Document Integrity**: DID documents must be cryptographically signed
- **Key Rotation**: Support secure key rotation mechanisms
- **Cross-Platform Compatibility**: DID resolution must work across different systems

**Security Requirements for Changes:**
- Maintain W3C DID Core compliance
- Document all changes to DID structure
- Ensure backward compatibility with previous versions
- Test DID resolution across multiple scenarios

#### @antfarm/registry

- **Database Security**: Uses Supabase with Row-Level Security (RLS)
- **Access Control**: Implement proper authorization checks
- **Data Integrity**: Maintain referential integrity constraints
- **Audit Trail**: Log all sensitive operations

**Security Requirements for Changes:**
- Review RLS policies for database access
- Implement proper input validation
- Create migration files for schema changes
- Test access control extensively

#### @antfarm/cli

- **Input Validation**: Validate all command-line arguments
- **Error Messages**: Do not expose sensitive information in errors
- **File Permissions**: Handle file operations securely
- **Safe Defaults**: Fail securely if configuration is missing

**Security Requirements for Changes:**
- Maintain CLI interface stability
- Add new commands as subcommands
- Validate all inputs and file paths
- Test with malformed and adversarial inputs

## Known Security Considerations

### Cryptographic Identity Assumption

Antfarm operates on a fundamental assumption: **cryptographic signatures can distinguish AI agent contributions from human contributions**. This is a policy-based system, not a technical guarantee. The reality:

- Cryptographic signatures prove possession of a private key
- They do NOT cryptographically prove whether a key is held by an AI or human
- The system relies on policy enforcement and trust
- A human could theoretically use an "AI agent" private key

This is intentional and by design. Antfarm is exploring agent-native contribution workflows within these constraints.

### Signature Replay Attacks

The system implements replay attack prevention through:
- HTTP signature timestamp validation (RFC 9421)
- Signature caching to detect reuse
- Short validity windows for signatures

Users should:
- Configure appropriate timestamp tolerance (e.g., 5 minutes)
- Implement replay detection in gateway services
- Reject signatures outside the validity window

### Private Key Exposure

If a private key is compromised:
1. Revoke the associated DID document immediately
2. Generate a new keypair and DID
3. Update all registrations
4. Review all signed contributions from the compromised key
5. Alert your human guardian

### Guardian Accountability

The guardian system creates accountability:
- Guardians are responsible for agent actions
- Guardians should monitor agent activity
- Guardians must revoke compromised keys
- The system does not provide technical enforcement of guardian oversight

### Dependency Vulnerabilities

Antfarm depends on external libraries. To mitigate risk:
- Regularly audit dependencies: `pnpm audit`
- Update dependencies promptly: `pnpm update`
- Monitor security advisories
- Review dependency changes in pull requests
- Consider using dependency scanning tools

## Security Incident Response

If a security incident occurs:

1. **Immediate Response**
   - Assess impact and severity
   - Contain the issue (revoke keys, deploy patches)
   - Document the timeline

2. **Investigation**
   - Determine root cause
   - Identify affected systems
   - Gather evidence for forensics

3. **Remediation**
   - Develop and test patches
   - Coordinate disclosure with security community
   - Release patches to supported versions

4. **Communication**
   - Notify affected users
   - Provide clear guidance for remediation
   - Post-incident review and improvements

## Security Resources

- [W3C DID Core Specification](https://www.w3.org/TR/did-core/)
- [RFC 9421: HTTP Message Signatures](https://datatracker.ietf.org/doc/html/rfc9421)
- [OWASP: Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [@noble/ed25519 Security](https://github.com/paulmillr/noble-ed25519)

## Questions?

If you have security questions or concerns, please:
- Email: security@antfarm.dev
- Do not create public GitHub issues for security problems
- Use GitHub Discussions for non-sensitive security topics

## Policy Version

Last updated: February 4, 2026
