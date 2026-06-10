# Smart Account vs EOA-7702: Decision for Next Phase

## Background

Currently we use MetaMask Smart Accounts (ERC-4337 compatible, deployed as a separate contract) for the DCA executing account. The alternative is EIP-7702 (set EOA code temporarily, no deployment needed).

## Current Choice: Smart Account (Why)

### 1. Deterministic Address via Salt

```typescript
const smartAccount = await toMetaMaskSmartAccount({
  implementation: Implementation.Hybrid,
  deploySalt: '0x000...0887',  // Custom salt for deterministic address
  deployParams: [eoaAddress, [], [], []],
});
```

Using a deploy salt guarantees:
- **Every user gets a fresh, predictable smart account address**
- **No collision** with existing accounts that might use incompatible delegation frameworks
- **Address is known before deployment** — the snap shows it in the UI, the backend pre-configures it

### 2. MetaMask Delegation Framework Compatibility

The MetaMask Delegation Framework requires specific contract interfaces at specific addresses. With a newly deployed smart account:
- We control exactly which implementation is used
- We know the `DelegationManager` address from `getSmartAccountsEnvironment()`
- No legacy state, no compatibility surprises

### 3. No Pre-existing State Risk

A fresh deployment via `toMetaMaskSmartAccount` with a private salt means:
- No existing approvals
- No existing delegations
- No nonce issues
- Clean slate for the delegation framework

## EIP-7702 Risk Analysis

### What 7702 Does

EIP-7702 allows EOAs to temporarily set contract code (like a smart account implementation) for a single transaction. The code is cleared after.

### Why 7702 Is Risky for This Use Case

| Risk | Explanation |
|------|-------------|
| **Existing 7702 setup** | User may have previously used 7702 with a different delegation implementation that's incompatible with MetaMask's framework |
| **No deployment = no persistent state** | Delegation permissions need persistent on-chain state (who granted what to whom). 7702 is ephemeral per-tx |
| **Delegation framework dependency** | MetaMask's delegation framework assumes a persistent smart account that holds delegations. 7702's temporary code model doesn't align |
| **Auditability** | Smart accounts have a clear on-chain presence. 7702 spreads authorization across transactions — harder to audit "what permissions are active?" |
| **MetaMask integration status** | As of mid-2026, MetaMask's delegation framework is optimized for smart accounts, not 7702 |

### When 7702 Might Be Better

- **Gasless onboarding** — No deployment tx needed (but Pimlico solves this with sponsored deployment)
- **Simple use cases** — One-time actions where persistent delegation state isn't needed
- **User already has 7702 compatible setup** — But verifying this is the hard problem

## Recommendation

**Stay with Smart Accounts for Phase 1.** Reasons:

1. **Deterministic salt** avoids all compatibility questions
2. **Pimlico paymaster** makes deployment gasless — removes the main advantage of 7702
3. **Delegation framework** is built for smart accounts
4. **Known address before deployment** enables pre-configuration

**Revisit 7702 in Phase 2** when:
- MetaMask adds 7702 support to the delegation framework
- We have a way to verify existing 7702 compatibility on a user's EOA
- The use case requires truly zero-tx onboarding where even a sponsored deployment is too much

## Migration Path (If 7702 Needed Later)

```
Current: Smart Account (deployed via Pimlico)
                           │
                           ▼
Phase 2: Detect if EOA supports 7702 delegation
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
         Supports 7702        Doesn't support
              │                (stay smart acc)
              ▼
         Use 7702 for
         delegation setup
```
