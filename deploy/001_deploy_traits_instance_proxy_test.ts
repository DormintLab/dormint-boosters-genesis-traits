
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  if (network.name !== 'polygon') {
    return
  }

  const LINK_ADDRESS = "0xb0897686c545045aFc77CF20eC7A532E3120E0F1";
  const VRF_WRAPPER_ADDRESS = "0x4e42f0adEB69203ef7AaA4B7c414e5b1331c14dc";

  const deployResult = await deploy("DormintBoostersTraits", {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [LINK_ADDRESS, VRF_WRAPPER_ADDRESS],
        },
      },
    },
    log: true,
  });

  console.log(`✓ DormintBoostersTraits Deployed at ${deployResult.address}`);

  return true;
};
export default func;
func.id = "001";
func.tags = ["DormintBoostersTraits"];
