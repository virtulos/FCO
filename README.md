# FCO Smart Contracts

This repository contains the source code for Fanatico smart contracts (FCO) developed using the Hardhat framework. The contracts are written in Solidity, and they can be compiled, tested, and deployed using various Hardhat plugins.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
    - [Compile Contracts](#compile-contracts)
    - [Run Tests](#run-tests)
    - [Generate Coverage Report](#generate-coverage-report)
    - [Deploy Contracts](#deploy-contracts)
    - [Verify Contracts](#verify-contracts)
- [License](#license)

## Prerequisites

- [Node.js](https://nodejs.org) v12.x or later
- [NPM](https://www.npmjs.com/) v6.x or later or [Yarn](https://yarnpkg.com/) v1.22 or later
- [Hardhat](https://hardhat.org/) v2.14.0 or later

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/virtulos/FCO.git
    ```
   
2. Install the dependencies:
`yarn install` or `npm install`

## Usage

### Compile Contracts

To compile the Solidity contracts, run the following command:

`yarn compile` or `npm run compile`

### Run Tests

To run the tests, run the following command:

`yarn test` or `npm test`

![img.png](unitTests.png)


### Generate Coverage Report

To generate the code coverage report, run the following command:

`yarn coverage` or `npm run coverage`


### Deploy Contracts

To deploy the contracts to the Polygon mumbai testnet network (default), run the following command:

`yarn deploy` or `npm run deploy`

> Note: make sure to set the `PRIVATE_KEY` environment variable to the private key of the account that will deploy the contracts (see `.env.example` file).
> You also need to set ADMIN_MULTISIG_WALLET_ADDRESS to the Gnosis Safe address that will be used to manage the contracts.
> The deployer will have no permissions on the contracts, only the admin multisig wallet will be able to call the functions like mint or change roles.

#### Change network for deployment

In order to change network for deployment you can do this directly in package.json file in scripts section:

```
"scripts": {
    "deploy": "hardhat run --network YOUR_NETWORK scripts/deploy.js",
    "deploy:mainnet": "hardhat run --network YOUR_NETWORK scripts/deploy.js"
  },
```

Just replace YOUR_NETWORK with a desired one from hardhat.config.js file. Supported networks so far are:

Mainnet:
- BSCMainnet
- ETHMainnet
- polygonMainnet

Testnet:
- sepolia
- goerli
- optimismGoerli
- avalancheFujiTestnet
- arbitrumGoerli
- BSCTestnet
- polygonMumbai
- baseGoerli

### Verify Contracts

:bangbang: All the parameters in verify script must match the deploy parameters. Once deployment is done, please change `FCO_ADDRESS` variable in [scripts/verify.js](./scripts/verify.js) file to the address of the deployed contract.

To verify the contracts on Etherscan or similar platforms (depends on the chain to deploy), run the following command:

`yarn verify` or `npm run verify`

> Note: make sure to set the API keys variables in the `.env` file depending on a chosen chain (see `.env.example` file).


## License

This project is licensed under the [MIT License](LICENSE).
