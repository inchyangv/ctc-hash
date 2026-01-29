import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.23',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'london',
    },
  },
  networks: {
    usc: {
      url: process.env.USC_RPC_WS || 'wss://rpc.usc-testnet2.creditcoin.network/ws',
      chainId: 102035,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};

export default config;
