# Real Token Creator

A modern, user-friendly web application for creating and managing Solana tokens and liquidity pools.

## Features

- **Token Creation**
  - Create SPL tokens with custom parameters
  - Set token name, symbol, and supply
  - Configure decimals (0-9)
  - Optional mint authority revocation
  - Optional freeze authority
  - Automatic fee calculation

- **Liquidity Pool Creation**
  - Create Raydium liquidity pools
  - Custom token ratio support
  - Multiple fee tier options
  - Configurable min order size and tick size
  - Real-time fee preview

- **Wallet Integration**
  - Support for multiple Solana wallets
  - Automatic network switching
  - Token balance tracking
  - Transaction history

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Solana wallet (e.g., Phantom, Solflare)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Jinanalyst/real-token-creator.git
   cd real-token-creator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## Usage

1. Connect your Solana wallet
2. Select desired network (Devnet/Testnet/Mainnet)
3. Fill in token details:
   - Token Name
   - Token Symbol
   - Total Supply
   - Decimals (optional)
   - Additional options (Revoke Mint, Freeze Authority)
4. Review the fee preview
5. Click "Create Token"

For creating liquidity pools:
1. Select base and quote tokens
2. Set initial liquidity amount
3. Choose fee tier
4. Configure optional parameters
5. Click "Create Pool"

## Architecture

The application is built with modern web technologies:
- Pure JavaScript (ES6+)
- Tailwind CSS for styling
- Solana Web3.js for blockchain interactions
- Raydium SDK for liquidity pool creation

Key components:
- `wallet.js`: Wallet connection and management
- `tokenCreator.js`: Token creation logic
- `liquidityPoolCreator.js`: Liquidity pool creation
- `uiStateManager.js`: UI state management
- `main.js`: Application entry point

## Security Features

- Input validation and sanitization
- Secure wallet connection handling
- Transaction confirmation dialogs
- Error boundaries and recovery
- Network state management

## Development

### Project Structure
```
real-token-creator/
├── src/
│   ├── js/
│   │   ├── main.js
│   │   ├── wallet.js
│   │   ├── tokenCreator.js
│   │   ├── liquidityPoolCreator.js
│   │   └── uiStateManager.js
│   ├── css/
│   │   └── styles.css
│   └── html/
│       └── index.html
├── dist/
├── package.json
└── webpack.config.js
```

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments

- Solana Foundation
- Raydium Protocol
- All contributors and users

## Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk.