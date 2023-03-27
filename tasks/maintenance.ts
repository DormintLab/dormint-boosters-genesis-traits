import { task, types } from "hardhat/config";
import fs from "fs";

import { DormintBoostersTraits, MockLinkToken } from "../typechain-types";

import { getTokensRangeTraitsMap } from "../test/mixins";

const LINK_ADDRESS = "0xb0897686c545045aFc77CF20eC7A532E3120E0F1";

// Link maintenance
task("maintenance:addLink")
  .addParam("address", "Address of the instance")
  .addParam("amount", "Amount of LINK to add", 0.01, types.float)
  .setAction(async function (_taskArgs, _hre) {
    const { ethers, network } = _hre;

    if (network.name !== 'polygon') {
      return
    }

    const { deployer } = await ethers.getNamedSigners();
    const { address, amount } = _taskArgs;

    const LINK = await ethers.getContractAt<MockLinkToken>("MockLinkToken", LINK_ADDRESS);

    const amountBN = ethers.utils.parseEther(amount.toString());

    console.log(`Transferring ${amount} (${amountBN.toString()}) LINK to ${address} in 3 seconds...`);

    await new Promise(resolve => setTimeout(resolve, 3000))

    await (await LINK.connect(deployer).transfer(address, amountBN)).wait();

    console.log("Transfer complete");
  });

task("maintenance:removeLink")
  .addParam("address", "Address of the instance")
  .setAction(async function (_taskArgs, _hre) {
    const { ethers, network } = _hre;

    if (network.name !== 'polygon') {
      return
    }

    const { deployer } = await ethers.getNamedSigners();
    const { address } = _taskArgs;

    const instance = await ethers.getContractAt<DormintBoostersTraits>("DormintBoostersTraits", address);
    const LINK = await ethers.getContractAt<MockLinkToken>("MockLinkToken", LINK_ADDRESS);

    const amountBN = await LINK.balanceOf(address);
    const amount = ethers.utils.formatEther(amountBN);

    console.log(`Withdrawing ${amount} (${amountBN.toString()}) LINK from ${address} in 3 seconds...`);

    await new Promise(resolve => setTimeout(resolve, 3000))

    await (await instance.connect(deployer).rescueFunds(LINK_ADDRESS)).wait();

    console.log("Withdrawal complete");
  });

// Traits maintenance
task("maintenance:requestRandomness")
  .addParam("address", "Address of the instance")
  .setAction(async function (_taskArgs, _hre) {
    const { ethers, network } = _hre;

    if (network.name !== 'polygon') {
      return
    }

    const { deployer } = await ethers.getNamedSigners();
    const { address } = _taskArgs;

    const instance = await ethers.getContractAt<DormintBoostersTraits>("DormintBoostersTraits", address);

    console.log(`Requesting randomness on ${address} in 3 seconds...`);

    await new Promise(resolve => setTimeout(resolve, 3000))

    await (await instance.connect(deployer).requestRandomness({ gasLimit: 300000 })).wait();

    console.log("Randomness requested");
  });

task("maintenance:check")
  .addParam("address", "Address of the instance")
  .setAction(async function (_taskArgs, _hre) {
    const { ethers, network } = _hre;

    if (network.name !== 'polygon') {
      return
    }

    const { address } = _taskArgs;

    const instance = await ethers.getContractAt<DormintBoostersTraits>("DormintBoostersTraits", address);

    console.log(`Checking randomness completeness on ${address}...`);

    const randomWord = (await instance.randomWord()).toString()
    const randomnessRequestId = (await instance.randomnessRequestId()).toString()
    const traits = await instance.getTraits(0)

    console.log({
      randomnessRequestId,
      randomWord,
      traits,
    })
  });

task("maintenance:generate")
  .addParam("address", "Address of the instance")
  .setAction(async function (_taskArgs, _hre) {
    const { ethers, network } = _hre;

    if (network.name !== 'polygon') {
      return
    }

    const { address } = _taskArgs;

    const instance = await ethers.getContractAt<DormintBoostersTraits>("DormintBoostersTraits", address);

    const fromTokenId = 0
    const toTokenId = 1999
    const filename = 'traits.json'

    console.log(`Fetching traits map from ${address} on tokens <${fromTokenId},${toTokenId}> and saving to file ${filename}...`);

    const traitsMap = await getTokensRangeTraitsMap(instance, fromTokenId, toTokenId);

    fs.writeFileSync(filename, JSON.stringify(traitsMap, null, 2));

    console.log('Traits map fetching complete')
  });

// TODO: Add traits back test task
