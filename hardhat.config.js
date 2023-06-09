require('dotenv').config({path: __dirname + '/.env'})
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");

const timeout = 300000;
const gas = 15000000;

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
            accounts: {mnemonic: 'test test test test test test test test test test test junk'},
        },

        // mainnet networks
        BSCMainnet: {
            url: 'https://bsc-dataseed.binance.org',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },
        ETHMainnet: {
            url: 'https://eth.llamarpc.com',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },
        PolygonMainnet: {
            url: 'https://polygon.llamarpc.com',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },


        // testnet networks
        sepolia: {
            url: 'https://rpc.sepolia.org',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },
        goerli: {
            url: 'https://rpc.ankr.com/eth_goerli',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },
        optimismGoerli: {
            url: 'https://goerli.optimism.io',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },
        avalancheFujiTestnet: {
            url: 'https://rpc.ankr.com/avalanche_fuji',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },
        arbitrumGoerli: {
            url: 'https://arbitrum-goerli.public.blastapi.io',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },
        BSCTestnet: {
            url: 'https://bsc-dataseed.binance.org/',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },
        polygonMumbai: {
            url: 'https://matic-mumbai.chainstacklabs.com',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        },
        baseGoerli: {
            url: 'https://goerli.base.org',
            accounts: process.env.PRIVATE_KEY,
            timeout: timeout,
            gas: gas
        }
    }
};
