# SkillWallet Frontend

The landing page and web interface for SkillWallet — a MetaMask Snap enabling users to install and execute AI-powered DCA (Dollar-Cost Averaging) skills for automated on-chain trading.

## Features

- **Snap Installation**: Connect MetaMask and install the SkillWallet Snap directly from the website.
- **Skill Selection**: Browse and configure AI-Powered DCA, Custom Cron DCA, and USDC Inbound DCA skills.
- **Real-time Status**: View installed skills, execution history, and active plans.
- **Dark UI**: Modern dark theme with cyan/violet accent colors.

## Installation

### Prerequisites

- Node.js >= 18.6.0
- Yarn 3.2.1

### Setup

```bash
# Clone the repository
git clone https://github.com/GainJar-Payroll/skillwallet-snap.git
cd skillwallet-snap

# Install dependencies
yarn install

# Start development server
yarn workspace site start
```

Open [http://localhost:8000](http://localhost:8000) to view it in the browser.

## Development

### Project Structure

```
packages/site/
├── src/
│   ├── pages/
│   │   └── index.tsx              # Main landing page
│   ├── components/
│   │   ├── Header.tsx             # Sticky navigation header
│   │   ├── Footer.tsx             # Footer with links
│   │   ├── HeroSections.tsx       # Hero section
│   │   ├── HowToUse.tsx           # How to install section
│   │   ├── ListSkills.tsx         # Skills listing
│   │   ├── ConfigureOptions.tsx   # Configuration section
│   │   ├── Testimonials.tsx       # User testimonials
│   │   ├── FAQ.tsx                # Frequently asked questions
│   │   ├── Buttons.tsx            # MetaMask install buttons
│   │   ├── Card.tsx               # Reusable card component
│   │   ├── Toggle.tsx             # Theme toggle
│   │   └── Toaster.tsx            # Error notification
│   ├── hooks/
│   │   ├── MetamaskContext.tsx    # MetaMask context provider
│   │   ├── useMetaMask.ts         # MetaMask hook
│   │   ├── useInvokeSnap.ts       # Snap invocation hook
│   │   └── useRequestSnap.ts      # Snap request hook
│   ├── config/
│   │   ├── snap.ts                # Snap configuration
│   │   └── theme.ts               # Theme configuration
│   ├── utils/
│   │   ├── metamask.ts            # MetaMask utilities
│   │   ├── snap.ts                # Snap utilities
│   │   └── button.ts              # Button utilities
│   └── styles/
│       ├── global.css             # Global styles (Tailwind)
│       └── design-tokens.css      # Design tokens
├── public/
├── .env.development               # Development environment
├── .env.production                # Production environment
└── package.json
```

### Available Scripts

```bash
# Start development server
yarn workspace site start

# Build for production
yarn workspace site build

# Clean build artifacts
yarn workspace site clean

# Lint code
yarn workspace site lint
```

## Environment Variables

### SNAP_ORIGIN (Required)

The snap origin to connect to. Used in `src/config/snap.ts`.

| Environment | Value | Description |
|-------------|-------|-------------|
| Development | `local:http://localhost:8080` | Local hosted snap |
| Production | `npm:skillwallet-snap` | Published npm package |

### Setup

1. Copy `.env.production.dist` to `.env.production`:
   ```bash
   cp .env.production.dist .env.production
   ```

2. Update the values in `.env.production`:
   ```env
   SNAP_ORIGIN=npm:skillwallet-snap
   ```

### Gatsby Environment Loading

- **Development**: Loads from `.env.development`
- **Production**: Loads from `.env.production`

For more details, visit [Gatsby Environment Variables](https://www.gatsbyjs.com/docs/how-to/local-development/environment-variables/).

## Deployment

### Build for Production

```bash
# Set environment variables
export SNAP_ORIGIN=npm:skillwallet-snap

# Build the site
yarn workspace site build
```

The build output will be in the `public/` folder.

### Deploy Options

- **Netlify**: Connect your GitHub repo and set build command to `yarn workspace site build`
- **Vercel**: Import the project and set root directory to `packages/site`
- **GitHub Pages**: Use GitHub Actions to build and deploy
- **Manual**: Upload the `public/` folder to any static hosting service

## Tech Stack

- **Framework**: Gatsby 5
- **Styling**: Tailwind CSS 4 + Styled Components
- **Blockchain**: viem, @metamask/smart-accounts-kit
- **Snap SDK**: @metamask/snaps-sdk

## License

This project is licensed under the terms of the MIT-0 License (See [LICENSE](https://github.com/MetaMask/template-snap-monorepo/blob/main/LICENSE) file for details). This project also includes code from the MetaMask template monorepo which is licensed under the Apache-2.0 License.
