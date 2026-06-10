# Pimlico Paymaster: Smart Account Deployment via Backend

## Problem

Execution fails with `skippedReason: "needs_smart_account_deployment"`. The smart account has never been deployed on-chain (only computed deterministically via `toMetaMaskSmartAccount` with a deploy salt). Without deployment, delegation verification fails → "invalid signed" error.

## Solution

Use the Pimlico paymaster (already implemented on backend) to deploy the smart account AND execute the first swap in a single UserOperation — gas sponsored by Pimlico.

## Backend Endpoints (Already Implemented)

All under `POST /pimlico/*` with `x-pimlico-key` header:

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /pimlico/entry-points` | No | Check supported entry points |
| `POST /pimlico/deploy-and-execute` | Yes | Deploy smart account + execute swap in one UserOp |
| `POST /pimlico/user-operation/receipt` | Yes | Check UserOperation status |
| `POST /pimlico/user-operation/poll` | Yes | Block until UserOperation confirmed (server-side polling, timeout 120s) |

API Key: `b0bc742e-6741-48dd-afb5-151366226f47`

## Flow

### Step 1: Normal Install

User installs skill normally:
```
POST /installations/confirm
```

### Step 2: Detect Deployment Need

After install, check execution status via:
```
GET /installations/:id/executions
```

If any execution record has `skippedReason: "needs_smart_account_deployment"`, trigger deployment.

### Step 3: Deploy + Execute

```
POST /pimlico/deploy-and-execute
x-pimlico-key: b0bc742e-6741-48dd-afb5-151366226f47

{
  "sender": "0x<smartAccountAddress>",
  "initCode": "0x<factoryAddr><createCalldata>",
  "callData": "0x<encodedExecute>"
}
```

#### Building `initCode`

```typescript
const FACTORY_ADDRESS = '0x...'; // from smart account SDK config

const initCode = (FACTORY_ADDRESS + encodeFunctionData({
  abi: [{
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'createAccount',
    outputs: [{ name: 'account', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  }],
  functionName: 'createAccount',
  args: [userEOA],
}).slice(2)) as `0x${string}`;
```

Factory address comes from `smartAccount.getDeploymentConfig()`.

#### Building `callData`

Encoded `execute(address to, uint256 value, bytes data)` — standard smart account function:

```typescript
const callData = encodeFunctionData({
  abi: [{
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  }],
  functionName: 'execute',
  args: [
    swapRouter02,                    // target swap router (Uniswap)
    0n,                              // value = 0 for ERC-20
    exactInputSingleCalldata,        // encoded swap call
  ],
});
```

The `exactInputSingleCalldata` matches what `buildDcaExecutions()` in the backend runner constructs — using `outputToken`, `amountUsdc`, `feeTier` from the installation parameters.

### Step 4: Poll for Confirmation

```typescript
// Check status once
POST /pimlico/user-operation/receipt
{ "userOpHash": "0x..." }

// Response — pending
{ "userOpHash": "0x...", "status": "pending" }
// Response — confirmed
{ "userOpHash": "0x...", "transactionHash": "0x...", "success": true, "blockNumber": "0x...", "status": "confirmed" }
```

Or use server-side polling (recommended):
```typescript
POST /pimlico/user-operation/poll
{ "userOpHash": "0x...", "timeoutMs": 120000 }
```

### Step 5: Done

Once confirmed → smart account is deployed on-chain. All subsequent runs work normally via 1Shot delegation execution.

## Where to Integrate

There are two approaches:

### Option A: Snap-side (Recommended)

Add Pimlico API functions to `packages/snap/src/api/pimlico.ts`:

```typescript
const API_URL = process.env.API_URL;
const PIMLICO_KEY = 'b0bc742e-6741-48dd-afb5-151366226f47';

export const deployAndExecute = async (payload: DeployExecutePayload) => {
  return request('/pimlico/deploy-and-execute', payload);
};

export const pollUserOperation = async (userOpHash: string) => {
  return request('/pimlico/user-operation/poll', { userOpHash, timeoutMs: 120000 });
};
```

Then in the snap UI, after install confirmation:
1. Show "Deploying smart account..." screen
2. Call `deployAndExecute()` with initCode + callData
3. Call `pollUserOperation()` to wait for confirmation
4. Show success screen when done

### Option B: Site-side

Add the same logic to `packages/site/src/utils/pimlico.ts` and handle deployment from the front-end web app.

## Data Flow

```
Snap/Site                              Backend (NestJS)                    Pimlico
    │                                      │                                 │
    │── POST /installations/confirm ──────▶│                                 │
    │◀───── { installationId } ────────────│                                 │
    │                                      │                                 │
    │── GET /installations/:id/executions─▶│                                 │
    │◀─── [{ skippedReason: "needs_...}] ──│                                 │
    │                                      │                                 │
    │── POST /pimlico/deploy-and-execute─▶│                                 │
    │   { sender, initCode, callData }     │── (Pimlico bundler) ──────────▶│
    │◀──── { userOpHash } ────────────────│                                 │
    │                                      │                                 │
    │── POST /pimlico/user-operation/poll▶│                                 │
    │   { userOpHash }                     │── (poll every 3s) ────────────▶│
    │◀─── { transactionHash, success } ────│                                 │
    │                                      │                                 │
    │  ✅ Smart account deployed           │                                 │
    │  Subsequent runs use 1Shot normal    │                                 │
```

## Construction Details

### Getting Factory Address

```typescript
import { toMetaMaskSmartAccount, Implementation } from '@metamask/smart-accounts-kit';

const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [eoaAddress, [], [], []],
  deploySalt: '0x...',
  signer: { walletClient },
});

// Get factory address
const deployConfig = smartAccount.getDeploymentConfig?.();
const factoryAddress = deployConfig?.factory; // e.g. "0x..."
```

### Getting the Swap Calldata

The exact swap parameters (outputToken, amountUsdc, feeTier) come from the installation's parameters. The backend's `buildDcaExecutions()` already constructs this. For the snap, the swap calldata can either:
1. Be pre-computed by the backend and returned in the install response
2. Be constructed by the snap using the same Uniswap V3 SDK logic

Recommendation: Option 1 — have the backend return the exact swap calldata in `/installations/confirm` response so the snap can pass it directly to Pimlico.

## Next Steps

1. [ ] Add `getDeploymentConfig()` or expose factory address in smartAccount.ts
2. [ ] Create `packages/snap/src/api/pimlico.ts` with deploy and poll functions
3. [ ] Update `handleConfirmInstallation` to detect deployment need
4. [ ] Add deployment UI flow in the snap
5. [ ] Handle the `exactInputSingleCalldata` — either from backend or constructed in snap
6. [ ] Test on Base Sepolia with Pimlico testnet
