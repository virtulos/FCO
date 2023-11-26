# FCO Smart Contracts

## Table of Contents
* [Prerequisites](#Prerequisites)
* [Installation](#installation)
* [Code Adaptations for Tron Network](#code-adaptations-for-tron-network)
* [Usage](#usage)
  * [Compile Contracts](#compile-contracts)
  * [Deploy Contracts](#deploy-contracts)
* [Sample Deployment on Nile Testnet](#sample-deployment-on-nile-testnet)


## Prerequisites
* [Node.js](https://nodejs.org/) v12.x or later
* [NPM](https://www.npmjs.com/) v6.x or later or [Yarn](https://yarnpkg.com/) v1.22 or later
* [Tronbox](https://www.npmjs.com/package/tronbox0) v3.4.1 or later

## Installation
1. Clone the repository:
```bash
git clone https://github.com/virtulos/FCO-TRON.git
```
2. Install the dependencies:
`yarn install` or `npm install`

3. Use npm to install the TronBox tool globally
```bash
npm install -g tronbox
```
After installing TronBox, execute the following script to ensure TronBox supports Solidity version 0.8.20.
```bash
sh ./scripts/tronbox_postinstall.sh
```

## Code Adaptations for Tron Network

#### 1. Update the function `isContract(address account)` within `@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol` to `isContract(address account)`.
Tron VM already has Address.isContract (ISCONTRACT) instruction, it's necessary to rename `isContract` function to a different name.

## Usage

### Compile Contracts
To compile the Solidity contracts, run the following command:

`tronbox compile`

### Deploy Contracts

To deploy the contracts to the Tron network, run the following command:

```bash
export $(xargs < .env) && tronbox migrate --network mainnet 
```

> Note: set the environment variable corresponding to your network choice (`PRIVATE_KEY_MAINNET` for the mainnet, `PRIVATE_KEY_NILE` for Nile testnet, or `PRIVATE_KEY_SHASTA` for Shasta testnet) with the private key associated with the deploying account (see `.env.example` file).


> Note: ensure the address value follows the **EVM** format and not the **TRON** format. Example : ``` TRON_ADDRESS=TEmWF1ETL3yWt8P5tLnnLM7tPhrTV9fq5z``` <br> ```ETH_ADDRESS=0x34A2076AFCAEE35CB065A6D9B1CD4417D2B3FA9F``` <br> You can convert beetween TRON Address and EVM Address here: https://tronscan.org/#/tools/code-converter/tron-ethereum-address

### Sample Deployment on Nile Testnet

#### 1. Prepare TRX
Before deploying a smart contract to the Tron Nile network, ensure you have enough TRX (Tron's native cryptocurrency) in your wallet to cover transaction fees. You can claim TRX on Nile testnet here: https://nileex.io/join/getJoinPage.

#### 2. Update environment variable and deploy to the Nile network
Set up the deploy environment
```bash
PRIVATE_KEY_NILE=                                   # wallet private key
SIGNER=0x0000000000000000000000000000000000001000   # example signer address in EVM format
FEES=0x0000000000000000000000000000000000002000     # example signer address in EVM format
```
Execute below command to deploy the contracts to the Nile network
``` bash
export $(xargs < .env) && tronbox migrate --network nile 
```

#### 3. Sample smart contracts deployed on the Nile network

| Contract | Address|
|----------|--------|
|Authority| [TWxsRAKtFKen6NYeKZCpLQrifrf6cY2zbo](https://nile.tronscan.org/#/contract/TWxsRAKtFKen6NYeKZCpLQrifrf6cY2zbo)|
|TransparentUpgradeableProxy (Authority)| [TRvD8CM8iBzvfyZnU9WG8SZbzqA9uEiQxj](https://nile.tronscan.org/#/contract/TRvD8CM8iBzvfyZnU9WG8SZbzqA9uEiQxj)|
|EventEmitterHub| [TRwQPUQaoARyycLwobsprbJQKJpZHuAgPF](https://nile.tronscan.org/#/contract/TRwQPUQaoARyycLwobsprbJQKJpZHuAgPF)|
|TransparentUpgradeableProxy (EventEmitterHub)| [TKb7LuXGf9NMcyWejxbS29rgyN85iQ3JWe](https://nile.tronscan.org/#/contract/TKb7LuXGf9NMcyWejxbS29rgyN85iQ3JWe)|
|FCOToken| [TLi5fbizsvuHZcYkj7PyTs8t7JTS2Gh4YN](https://nile.tronscan.org/#/contract/TLi5fbizsvuHZcYkj7PyTs8t7JTS2Gh4YN)|
|TransparentUpgradeableProxy (FCOToken)| [TND6zMoxEepKh6dDc3sRaugEBDhx4D2wPe](https://nile.tronscan.org/#/contract/TND6zMoxEepKh6dDc3sRaugEBDhx4D2wPe)|
|PublicationHub| [TKuLwFusdzCybnDfycs5qcyGjHNAhnd378](https://nile.tronscan.org/#/contract/TKuLwFusdzCybnDfycs5qcyGjHNAhnd378)|
|TransparentUpgradeableProxy (PublicationHub)| [TBpUApnMAv2mG6QfWMb96CauQdybyuRWMy](https://nile.tronscan.org/#/contract/TBpUApnMAv2mG6QfWMb96CauQdybyuRWMy)|
|DataAggregator| [TTSZrNiBEjFMYznmTNiWv2aafRqs7wRe2G](https://nile.tronscan.org/#/contract/TTSZrNiBEjFMYznmTNiWv2aafRqs7wRe2G)|

The deployment of above smart contracts consume more than 5300 TRX on the Nile network.