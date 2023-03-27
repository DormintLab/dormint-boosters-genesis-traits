import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import { DormintBoostersTraits } from "../typechain-types";

import { getTokensRangeTraitsMap } from "./mixins";

describe("DormintBoostersTraits", function () {
  async function prepare() {
    // Define signers
    const [owner] = await ethers.getSigners();

    // Deploy Mocks
    const MockLinkToken = await ethers.getContractFactory("MockLinkToken");
    const mockToken = await MockLinkToken.deploy();
    await mockToken.deployed();

    const MockVRFV2Wrapper = await ethers.getContractFactory(
      "MockVRFV2Wrapper"
    );
    const mockVRFWrapper = await MockVRFV2Wrapper.deploy();
    await mockVRFWrapper.deployed();

    // Deploy Traits
    const DormintBoostersTraits = await ethers.getContractFactory(
      "DormintBoostersTraits"
    );
    const traitsContract = <DormintBoostersTraits>(
      await upgrades.deployProxy(DormintBoostersTraits, [
        mockToken.address,
        mockVRFWrapper.address,
      ])
    );
    await traitsContract.deployed();

    return {
      owner,
      mockToken,
      mockVRFWrapper,
      traitsContract
    };
  }

  describe("Deployment", function () {
    it("Should be correctly initialized", async function () {
      const { owner, mockToken, mockVRFWrapper, traitsContract } = await loadFixture(
        prepare
      );

      expect(await traitsContract.owner()).to.equal(owner.address);
      expect(await traitsContract.LINK()).to.equal(mockToken.address);
      expect(await traitsContract.VRF_V2_WRAPPER()).to.equal(mockVRFWrapper.address);
      expect(await traitsContract.randomnessRequestId()).to.equal(0);
      expect(await traitsContract.randomWord()).to.equal(0);
    });
  });
  describe("Reveal", function () {
    it("Should correctly request and receive randomness", async function () {
      const {
        owner,
        mockToken, mockVRFWrapper,
        traitsContract
      } = await loadFixture(prepare);

      // Fund account with LINK token
      const ONE_LINK = ethers.utils.parseEther("1");
      await mockToken.mint(owner.address, ONE_LINK);
      await mockToken.transfer(traitsContract.address, ONE_LINK);

      // Request randomness
      await traitsContract.requestRandomness();
      expect(await mockToken.balanceOf(traitsContract.address)).to.equal(0);

      expect(await mockVRFWrapper.lastRequestId()).to.equal(1);
      expect(await traitsContract.randomnessRequestId()).to.equal(1);

      // Provide randomness: Simulate Chainlink
      await mockVRFWrapper.provide(traitsContract.address, 1, [1337]);

      expect(await traitsContract.randomWord()).to.equal(1337);
    });

    it("Should correctly assign traits probability", async function () {
      const {
        owner,
        mockToken, mockVRFWrapper,
        traitsContract
      } = await loadFixture(prepare);

      // Fund account with LINK token
      const ONE_LINK = ethers.utils.parseEther("1");
      await mockToken.mint(owner.address, ONE_LINK);
      await mockToken.transfer(traitsContract.address, ONE_LINK);
      // Request randomness
      await traitsContract.requestRandomness();

      // Provide randomness: Simulate Chainlink
      const randomness = ethers.utils.randomBytes(32);
      await mockVRFWrapper.provide(traitsContract.address, 1, [randomness]);

      const totalQuantity = 1000

      const traitsMap = await getTokensRangeTraitsMap(traitsContract, 0, 1999);

      const categoryCount: { [key: number]: number } = {}

      for (const trait of traitsMap) {
        if (!categoryCount[trait.data.category]) {
          categoryCount[trait.data.category] = 1
        } else {
          categoryCount[trait.data.category] += 1
        }
      }

      console.log(categoryCount)

      /** Category */
      const category_energy = categoryCount[0];
      const category_melatonin = categoryCount[1];
      const category_pills = categoryCount[2];
      console.log(`Category -> Energy Drink: ${category_energy} Melatonin: ${category_melatonin} Sleeping Pills: ${category_pills}`)
      console.log(`Total: ${category_energy + category_melatonin + category_pills}`)
      console.log()
    });
  });
});
