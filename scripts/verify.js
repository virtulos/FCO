const { ethers} = require("hardhat");
require('dotenv').config()

// put same arguments as for deploy
const name = 'FANATICO8'
const symbol = 'FCO8'

const deploymentAddress = '0x0000000000'; // replace with the deployed address

async function main() {
    console.log("--------------------------------VERIFY----------------------------------")

    const contractFactory = await ethers.getContractFactory("FANATICO8");
    const token = contractFactory.attach(deploymentAddress);

    await hre.run("verify:verify", {
        address: token.address,
        constructorArguments: [name, symbol],
    });
}

main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});