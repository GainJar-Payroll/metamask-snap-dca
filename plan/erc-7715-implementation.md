# ERC-7715 Advanced Permissions Implementation Guide

## Overview

ERC-7715 is an Ethereum standard for grant-based permission systems. MetaMask implements it via `wallet_requestExecutionPermissions` RPC method, which shows a native MetaMask UI for users to approve advanced permissions.

For DCA skills, ERC-7715 replaces raw `eth_signTypedData_v4` delegation signing as the primary flow. Instead of the user blindly signing typed data, they see a MetaMask permission screen specifying exactly what the smart account can do (token, amount, frequency, expiry).

---

## Why ERC-7715

| Aspect | Raw `eth_signTypedData_v4` | ERC-7715 |
|--------|--------------------------|----------|
| User experience | Blind signing of hex data | MetaMask native permission UI |
| Auditability | User doesn't know what they signed | Clear: "Spend X USDC every Y days" |
| Revocability | Manual on-chain tx | MetaMask permission management |
| Gasless | Yes | Yes |

---

## Implementation Requirements

### 1. Dependencies

```json
// packages/snap/package.json
"@metamask/smart-accounts-kit": "^1.7.0",
"viem": "^2.22.0"
```

### 2. Smart Account Setup

`packages/snap/src/utils/smartAccount.ts` — Add a wallet client configured with ERC-7715 provider actions:

```typescript
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions';

export const getWalletClientWithERC7715 = () => {
  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: custom(ethereum as any),
  });
  return walletClient.extend(erc7715ProviderActions);
};
```

### 3. Permission Request

In `prepareInstallation.tsx`, after calling `POST /installations/prepare`, request ERC-7715 permission:

```typescript
const walletClient = getWalletClientWithERC7715();

const grantedPermissions = await walletClient.requestExecutionPermissions([{
  chainId: 84532,                                          // Base Sepolia
  to: smartAccountAddress,                                 // Session account granted permission
  expiry: Math.floor(Date.now() / 1000) + 90 * 86400,     // 90-day expiry (required)
  permission: {
    type: 'erc20-token-periodic',                          // Permission type
    data: {
      tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',  // USDC Base Sepolia
      periodAmount: parseUnits('50', 6),                   // Amount per period (BigInt)
      periodDuration: 86400,                               // Period in seconds (Number)
    },
    isAdjustmentAllowed: false,                            // Fixed permission (required boolean)
  },
}]);
```

**Key format rules (from MetaMask source):**
- `requestExecutionPermissions` takes an **array** `[{...}]` — not a single object
- `to` is required — the address granted the permission (smart account)
- `expiry` is required — timestamp in seconds
- `isAdjustmentAllowed` is required — boolean inside `permission`
- `periodDuration` must be `Number` type (not BigInt — Viem's `toHexOrThrow` converts it)
- `periodAmount` must be convertible via `toHexOrThrow` — BigInt works (from `parseUnits`)

### 4. Permission Grant Response

`requestExecutionPermissions` returns:

```typescript
interface GrantedPermission {
  context: string;             // Permission context (hex) — needed for delegation
  delegationManager: string;   // Delegation manager contract address
  permissions: string[];       // Granted permission IDs
}
```

### 5. Confirm Flow

Extract `context` from the grant and send it to backend in `confirmInstallation`:

```typescript
const grantResult = grantedPermissions[0];
await confirmInstallation({
  skillId,
  userAddress,
  smartAccountAddress,
  sessionAccountAddress: smartAccountAddress,         // to field from request
  chainId: 84532,
  parameters: parametersArray,                         // [{key, value}] format
  permissionContext: grantResult.context,              // ERC-7715 context hex
  delegationManager: grantResult.delegationManager,    // Delegation manager address
  periodAmount: "50",                                  // Display value (optional metadata)
  periodDuration: "1 weeks",                           // Display value (optional metadata)
});
```

### 6. Dynamic Amounts Per Skill Type

All 3 skills use `erc20-token-periodic` but with different parameters:

| Skill Type | Amount Source | Duration |
|-----------|--------------|----------|
| `event-trigger` (USDC Inbound DCA) | `dailySpendLimit` (atoms from backend) | 1 day (`86400` seconds) |
| `cron` (Custom Cron DPA/AI-Powered DCA) | `amountUsdc` (atoms from form) | Cron interval converted to seconds |

```typescript
function buildPermissionAmount(params, runType) {
  if (runType === 'event-trigger' && params.dailySpendLimit) {
    return { atoms: BigInt(params.dailySpendLimit), display: "..." };
  }
  if (params.amountUsdc) {
    return { atoms: BigInt(params.amountUsdc), display: "..." };
  }
  // fallback
}

function buildPermissionDuration(params, freqNum, freqUnit, runType) {
  if (runType === 'event-trigger') {
    return { seconds: 86400n, display: '1 day' };
  }
  // cron: convert frequency to seconds
}
```

---

## Permission Type: `erc20-token-periodic`

This permission type grants the right to spend a specific ERC-20 token periodically.

**Data fields:**
| Field | Type | Description |
|-------|------|-------------|
| `tokenAddress` | `Address` | ERC-20 token address |
| `periodAmount` | `bigint` | Max amount per period (in atoms) |
| `periodDuration` | `number` | Period length in seconds |
| `startTime` | `number` (optional) | Unix timestamp when permission starts |
| `justification` | `string` (optional) | Human-readable reason shown in MetaMask UI |

The permission works like a rate limit: the smart account can spend up to `periodAmount` tokens every `periodDuration` seconds, cumulatively up to `expiry`.

---

## Backend Integration

### `ConfirmAdvancedPermission` Type

```typescript
interface ConfirmAdvancedPermission {
  skillId: string;
  userAddress: string;
  smartAccountAddress: string;
  sessionAccountAddress: string;   // = smartAccountAddress (the "to" field)
  chainId: number;
  parameters: Record<string, any>;  // [{key, value}] array or flat object
  permissionContext: string;         // ERC-7715 context hex
  delegationManager: string;         // Delegation manager contract
  // Optional metadata for display
  periodAmount?: string;
  periodDuration?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
}
```

### Backend Responsibilities

1. Store `permissionContext` alongside installation record
2. At each execution tick, create delegation signatures referencing the permission context
3. Submit UserOperations with the delegation attached
4. On-chain: the `DelegationManager` verifies the delegation was authorized via ERC-7715

---

## Testing

1. Install MetaMask Flask with the permissions-kernel-snap installed
2. Need `snap.manifest.json` `dapps` allowlist configured for `localhost:8080`
3. The permissions-kernel-snap must be installed in Flask:
   - Either via `snap.manifest.json` `initialPermissions`
   - Or manually installed and configured

---

## Error Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `permissions-kernel-snap is not permitted to handle requests from localhost:8080` | Flask environment not configured | Install permissions-kernel-snap + configure dapps allowlist |
| `Invalid parameters: to is undefined` | Missing `to` field | Add `to: smartAccountAddress` |
| `Invalid parameters: isAdjustmentAllowed is undefined` | Missing `isAdjustmentAllowed` | Add `isAdjustmentAllowed: false` inside `permission` |
| `periodDuration must be a number` | periodDuration is BigInt | Wrap with `Number()` |

---

## Branch Reference

The full ERC-7715 implementation is saved in branch `feat/erc-7715`:

```
git log feat/erc-7715 --oneline
54a1b21 fix(snap): dynamic permission per skill type (cron + event-trigger)
d5086e2 fix(snap): correct permission request format for wallet_requestExecutionPermissions
ee85e62 fix(snap): requestExecutionPermissions expects array, not single object
8fb82b7 fix(snap): confirm path also sends parameters as [{key, value}]
9ef88ba fix(snap): restore parameters as [{key, value}] for backend
7b50317 fix(snap): cronSchedule param sends cron not seconds
22d0a9e feat(snap): ERC-7715 Advanced Permissions primary flow
9e251a8 feat(snap): checkpoint before ERC-7715 refactor
```

To resume ERC-7715 work:
```bash
git checkout feat/erc-7715
```
