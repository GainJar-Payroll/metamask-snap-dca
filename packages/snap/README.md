# SkillWallet Snap

A MetaMask Snap that enables users to install and execute AI-powered DCA (Dollar-Cost Averaging) skills for automated on-chain trading.

## Features

- **AI-Powered DCA**: Dollar-cost average USDC into WETH, enhanced with Venice AI market analysis before each swap.
- **Custom Cron DCA**: Dollar-cost average USDC into WETH on your custom cron schedule using any valid cron expression.
- **USDC Inbound DCA**: Automatically swaps USDC when funds arrive in the smart account, with controls for fixed or percentage-based spending.
- **Scoped Delegation**: Skills define allowed targets, function selectors, and spending limits before execution.
- **Daily Spend Limits**: Configure maximum USDC spending per day for automated execution.

## Installation

### For Users

1. Install [MetaMask](https://metamask.io/) in your browser.
2. Open the SkillWallet website and connect your MetaMask wallet.
3. Click **Install SkillWallet Snap** and approve the permissions in MetaMask.
4. Select a DCA skill and configure your parameters.
5. Enable the skill for automatic execution.

### For Developers

```bash
# Clone the repository
git clone https://github.com/GainJar-Payroll/skillwallet-snap.git
cd skillwallet-snap

# Install dependencies
yarn install

# Build the snap
yarn workspace skillwallet-snap run build

# Run tests
yarn workspace skillwallet-snap test
```

## Development

### Prerequisites

- Node.js >= 18.6.0
- Yarn 3.2.1

### Project Structure

```
packages/snap/
├── src/
│   ├── index.tsx              # Main snap entry point
│   ├── api/
│   │   ├── skills.tsx         # Skills API
│   │   └── installations.tsx  # Installations API
│   ├── handler/
│   │   ├── skillSelectorForm.tsx
│   │   ├── confirmInstallation.tsx
│   │   ├── prepareInstallation.tsx
│   │   ├── executionHistory.tsx
│   │   └── deploySmartAccount.tsx
│   ├── utils/
│   │   ├── smartAccount.ts    # Smart account utilities
│   │   ├── getUsdcBalance.ts  # USDC balance checker
│   │   ├── deployment.ts      # Deployment utilities
│   │   └── format.ts          # Formatting utilities
│   └── types/
│       ├── SkillItem.ts
│       ├── installationResponse.ts
│       └── PrepareInstallation.ts
├── images/
│   ├── logo-only.svg
│   ├── logo-only.png
│   └── text-only.png
├── dist/
│   └── bundle.js              # Built snap bundle
├── snap.manifest.json
├── package.json
└── snap.config.ts
```

### Running Locally

```bash
# Start the snap in development mode
yarn workspace skillwallet-snap start

# Build the snap for production
yarn workspace skillwallet-snap build

# Run tests
yarn workspace skillwallet-snap test
```

### Configuration

The snap requires the following environment variable:

```bash
# API Backend URL for executing cronjob and fetching data
API_URL=http://localhost:4000
```
For the backend repository you can refers to [https://github.com/GainJar-Payroll/skillwallet-api](https://github.com/GainJar-Payroll/skillwallet-api)

Set this in your `.env` file or export it in your shell.

## Skills

### AI-Powered DCA

- Uses Venice AI market analysis before each swap
- Fetches crypto news via x402 OttoAI
- Analyzes sentiment with Venice AI
- Stores AI market context with each execution

### Custom Cron DCA

- Configure `cronSchedule` parameter with any valid cron expression
- Example: `0 9 * * 1-5` for weekdays at 9 AM
- Built for personalized recurring DCA plans

### USDC Inbound DCA

- Triggered by inbound USDC transfers
- Fixed amount or percent of inbound
- Daily USDC spend limit

## Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `outputToken` | Token to accumulate | `weth` |
| `amountUsdc` | Amount of USDC per run in base units | `10000000` |
| `dailySpendLimit` | Maximum daily spend in USDC | `10000000` |
| `spendMode` | Spend mode | `fixed` or `percent-of-inbound` |
| `percentOfInboundBps` | Percent of inbound in basis points | `5000` (50%) |
| `cronSchedule` | Cron expression for custom schedule | `0 9 * * *` |

## Testing

```bash
# Run all tests
yarn workspace skillwallet-snap test

# Run tests in watch mode
yarn workspace skillwallet-snap test --watch
```

## Publishing

```bash
# Build the snap
yarn workspace skillwallet-snap build

# Publish to npmjs
cd packages/snap
npm publish --access=public
```

The snap will be available at: `https://www.npmjs.com/package/skillwallet-snap`

### Snap ID

After publishing, users can install your snap using:

```
npm:skillwallet-snap
```

## Permissions

The snap requests the following permissions:

- `endowment:network-access` - Network access for API calls
- `endowment:page-home` - Home page UI
- `endowment:signature-insight` - Signature inspection
- `snap_manageState` - State management
- `endowment:ethereum-provider` - Ethereum provider access

## License

This project is licensed under the terms of the MIT-0 License (See [LICENSE](https://github.com/MetaMask/template-snap-monorepo/blob/main/LICENSE) file for details). This project also includes code from the MetaMask template monorepo which is licensed under the Apache-2.0 License.
