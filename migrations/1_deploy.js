const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const TronWeb = require('tronweb');
const {ethers} = require('ethers')
require('dotenv').config()
const tronboxConfig = require("../tronbox")

const Authority = artifacts.require("Authority");
const EventEmitterHub = artifacts.require("EventEmitterHub");
const FCO = artifacts.require("FCO");
const PublicationHub = artifacts.require("PublicationHub");
const DataAggregator = artifacts.require("DataAggregator");

module.exports = async function(deployer, network, accounts) {
  const networkConfig = tronboxConfig.networks[network]
  const tronWeb = new TronWeb({fullHost:networkConfig.fullHost}); 

  const deployerEthAddress = '0x' + tronWeb.address.toHex(accounts).slice(2)
  const adminWallet = deployerEthAddress // controls all
  const publicationSignerWallet = process.env.SIGNER || deployerEthAddress // sing promises for buy/collect on server side
  const publicationServiceWallet = process.env.FEES || deployerEthAddress // receive fees from publications sells

  // Authority
  const authority = await deployProxy(Authority, [networkConfig.network_id], { deployer, redeployImplementation: 'always'});
  console.log("Authority address", authority.address)
  const authorityEthAddress = '0x' + authority.address.slice(2)

  // EventEmitterHub
  const eventEmitterHubArgs = [
    authorityEthAddress
  ]
  const eventEmitterHub = await deployProxy(EventEmitterHub, eventEmitterHubArgs, { deployer, redeployImplementation: 'always'});
  console.log("EventEmitterHub address", eventEmitterHub.address)
  const eventEmitterHubEthAddress ='0x' + eventEmitterHub.address.slice(2)

  // FCO
  const signUpReward = ethers.utils.parseUnits('3', 18)
  const epochReward = ethers.utils.parseUnits('1', 18)
  const epochDuration = 60 * 60 * 24; 
  const lockDuration = epochDuration * 7;
  const fcoArgs = [
    authorityEthAddress,
    eventEmitterHubEthAddress,
    'Fanatico', 
    'FCO', 
    signUpReward.toString(),
    epochReward.toString(),
    epochDuration.toString(),
    lockDuration.toString(),
  ]
  const fco = await deployProxy(FCO, fcoArgs, { deployer, redeployImplementation: 'always'});
  console.log("fco address", fco.address)
  const fcoEthAddress ='0x' + fco.address.slice(2)

  // PublicationHub
  const publicationHubArgs = [
    authorityEthAddress,
    eventEmitterHubEthAddress,
    publicationServiceWallet, 
    publicationSignerWallet,		
    'https://secret.fanatico.com/api/metadata/{id}',
    fcoEthAddress,
  ]
  const publicationHub = await deployProxy(PublicationHub, publicationHubArgs, { deployer, redeployImplementation: 'always'});
  console.log("PublicationHub address", publicationHub.address)
  const publicationHubEthAddress ='0x' + publicationHub.address.slice(2)

  // DataAggregator
  const dataAggregatorArgs = [
    fcoEthAddress,
    publicationHubEthAddress
  ]
  const dataAggregator = await deployer.deploy(DataAggregator, ...dataAggregatorArgs);
  console.log("DataAggregator address", dataAggregator.address)
  const dataAggregatorEthAddress ='0x' + dataAggregator.address.slice(2)

  const emitterHubInstance = await EventEmitterHub.at(eventEmitterHub.address)
  let res = await emitterHubInstance.setEmitter(fcoEthAddress, true)
  console.log('eventEmitterHub.setEmitter fco', res)
  res = await emitterHubInstance.setEmitter(publicationHubEthAddress, true)
  console.log('eventEmitterHub.setEmitter publicationHub', res)

  const fcoInstance = await FCO.at(fco.address)
  res = await fcoInstance.setApproveWithSign(publicationHubEthAddress, true)
  console.log('fco.setApproveWithSign', res)

  const authorityInstance = await Authority.at(authority.address)
  res = await authorityInstance.setAdmin(adminWallet)
  console.log('authority.setAdmin', res)
};