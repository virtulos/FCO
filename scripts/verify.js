require('dotenv').config({path: __dirname + '/.env'})

// npx hardhat run --network goerli scripts/verify.js
// npx hardhat run --network polygonMumbai scripts/verify.js

const bcConfig = require('../bcConfig_prod.json');

async function main() {
    console.log("--------------------------------VERIFY----------------------------------")
    const chainId = Number(await network.provider.send('eth_chainId'));

    console.log("Authority")
    await hre.run("verify:verify", {
        address: bcConfig[chainId].authority.implementation,
    });

    console.log("eventEmitterHub")
    await hre.run("verify:verify", {
        address: bcConfig[chainId].eventEmitterHub.implementation,
        constructorArguments: bcConfig[chainId].eventEmitterHub.deployArgs,
    });

    console.log("FCO")
    await hre.run("verify:verify", {
        address: bcConfig[chainId].fco.implementation,
        constructorArguments: bcConfig[chainId].fco.deployArgs,
    });

    console.log("publicationHub")
    await hre.run("verify:verify", {
        address: bcConfig[chainId].publicationHub.implementation,
        constructorArguments: bcConfig[chainId].publicationHub.deployArgs,
    });

    console.log("publicationHub")
    await hre.run("verify:verify", {
        address: bcConfig[chainId].dataAggregator.address,
        constructorArguments: bcConfig[chainId].dataAggregator.deployArgs,
    });    
}

main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});