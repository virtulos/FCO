require('dotenv').config()
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");

const timeout = 300000;
const gas = 15000000;

const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
    throw new Error('Please set your PRIVATE_KEY in a .env file');
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    defaultNetwork: "hardhat",
    solidity: {
        compilers: [
            {version: "0.8.18", settings: {optimizer: {enabled: true, runs: 200}}}
        ]
    },
    networks: {
        hardhat: {
            chainId: 1,
            gasPrice: 'auto',
            throwOnTransactionFailures: true,
            throwOnCallFailures: true,
            allowUnlimitedContractSize: true,
            loggingEnabled: false,
            accounts: {mnemonic: 'test test test test test test test test test test test junk'}
        },

        // mainnet networks
        BSCMainnet: {
            url: 'https://bsc-dataseed.binance.org',
            chainId: 56,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },
        ETHMainnet: {
            url: 'https://eth.llamarpc.com',
            chainId: 1,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },
        PolygonMainnet: {
            url: 'https://polygon.llamarpc.com',
            chainId: 137,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },


        // testnet networks
        sepolia: {
            url: 'https://rpc.sepolia.org',
            chainId: 2357,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },
        goerli: {
            url: 'https://rpc.ankr.com/eth_goerli',
            chainId: 5,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },
        optimismGoerli: {
            url: 'https://goerli.optimism.io',
            chainId: 420,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },
        avalancheFujiTestnet: {
            url: 'https://rpc.ankr.com/avalanche_fuji',
            chainId: 43113,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },
        arbitrumGoerli: {
            url: 'https://arbitrum-goerli.public.blastapi.io',
            chainId: 421613,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },
        BSCTestnet: {
            url: 'https://bsc-dataseed.binance.org/',
            chainId: 97,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },
        polygonMumbai: {
            url: 'https://matic-mumbai.chainstacklabs.com',
            chainId: 80001,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        },
        baseGoerli: {
            url: 'https://goerli.base.org',
            chainId: 84531,
            accounts: [privateKey],
            timeout: timeout,
            gas: gas
        }
    }
};
