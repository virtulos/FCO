require('dotenv').config({path:__dirname+'/.env'})
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-gas-reporter");
require('solidity-coverage')

module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      { version: "0.8.19", settings: { optimizer: { enabled: true, runs: 200 } } },     
    ],
  },
 
  networks: {
    hardhat: {
      //forking: { url: `https://polygon-rpc.com` },
      //chainId: 137,
      //forking: { url: `https://rpc.ankr.com/eth_goerli` },
      //chainId: 5,
      gasPrice: 'auto',
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      allowUnlimitedContractSize: true,      
      loggingEnabled: false, 
      //loggingEnabled: true,      
      accounts: { mnemonic: 'test test test test test test test test test test test junk' },
    },
    mainnet: {
      url: "https://rpc.ankr.com/eth",
      chainId: 1,
      gasPrice: 'auto',
      accounts:  [`${process.env.PRIVATE_KEY}`]
    },
    polygon: {
      url: "https://polygon-rpc.com",
      chainId: 137,
      gasPrice: 'auto',
      accounts: [`${process.env.PRIVATE_KEY}`]
    },
    polygonMumbai: {
      url: "https://rpc.ankr.com/polygon_mumbai",
      chainId: 80001,
      gasPrice: 'auto',
      accounts: [`${process.env.PRIVATE_KEY}`]
    },
    goerli: {
      url: "https://rpc.ankr.com/eth_goerli",
      chainId: 5,
      gasPrice: 'auto',
      accounts: [`${process.env.PRIVATE_KEY}`]
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 'auto',
      accounts:  [`${process.env.PRIVATE_KEY}`]
    }, 
    //sepolia: {
    //  url: "https://data-seed-prebsc-1-s1.binance.org:8545",
    //  chainId: 97,
    //  gasPrice: 'auto',
    //  accounts:  [`${process.env.PRIVATE_KEY}`]
    //},
  },
  
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSC_API_KEY,
      goerli: process.env.ETH_API_KEY,
      sepolia: process.env.ETH_API_KEY,
      polygonMumbai: process.env.PLY_API_KEY,      
    }
  },

  gasReporter: {
    enabled: false,
    enabled: true,
    //currency: 'USD',
    //token: 'MATIC',
    //gasPrice: 10,
    //coinmarketcap: '821bcd2b-52ef-4e37-99a0-2e88f2af6089',
    //gasPriceApi: 'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',
    //showTimeSpent: true
  },
};
