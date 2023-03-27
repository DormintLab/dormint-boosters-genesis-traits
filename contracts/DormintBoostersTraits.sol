// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFV2WrapperInterface.sol";

contract DormintBoostersTraits is Initializable, OwnableUpgradeable {
    /** ENUMs & STRUCTs */
    enum BoosterCategory { EnergyDrink, Melatonin, SleepingPills }

    struct BoosterTraits {
        BoosterCategory category;
    }

    /** --- BEGIN: V1 Storage Layout --- */
    // Chainlink VRF
    LinkTokenInterface public LINK;
    VRFV2WrapperInterface public VRF_V2_WRAPPER;
    uint256 public randomnessRequestId;
    uint256 public randomWord;
    /** --- END: V1 Storage Layout --- */

    /** INITIALIZATION */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address link_, address vrfV2Wrapper_) public initializer {
        __Ownable_init();

        LINK = LinkTokenInterface(link_);
        VRF_V2_WRAPPER = VRFV2WrapperInterface(vrfV2Wrapper_);
    }

    /** PUBLIC SETTERS */
    function requestRandomness() external onlyOwner {
        require(randomWord == 0, "Randomness was already persisted");
        uint32 callbackGasLimit = 300000;
        uint16 requestConfirmations = 5;
        uint32 numWords = 1;
        LINK.transferAndCall(
            address(VRF_V2_WRAPPER),
            VRF_V2_WRAPPER.calculateRequestPrice(callbackGasLimit),
            abi.encode(callbackGasLimit, requestConfirmations, numWords)
        );
        randomnessRequestId = VRF_V2_WRAPPER.lastRequestId();
    }

    function rawFulfillRandomWords(uint256 requestId_, uint256[] memory randomWords_) external {
        require(_msgSender() == address(VRF_V2_WRAPPER), "Only VRF V2 wrapper can fulfill");
        require(requestId_ == randomnessRequestId, "Wrong requestId");
        randomWord = randomWords_[0];
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(_msgSender()).transfer(balance);
    }

    function rescueFunds(address token_) external onlyOwner {
        IERC20Upgradeable token = IERC20Upgradeable(token_);
        uint256 balance = token.balanceOf(address(this));
        token.transfer(_msgSender(), balance);
    }

    /** PUBLIC GETTERS */
    function getTraits(uint256 tokenId_) external view returns (bool available, BoosterTraits memory traits) {
        traits = BoosterTraits(
            BoosterCategory(0)
        );

        // If there is no provided randomness, return unavailable traits
        if (randomWord == 0) {
            return (false, traits);
        }

        available = true;

        uint256 probabilityBase = 100;

        /** CATEGORY */
        // Category probability: 40%, 40%, 20%
        uint8[3] memory categoryProbability = [0, 40, 80];

        uint256 randomWordByTokenId = uint256(keccak256(abi.encodePacked(randomWord, tokenId_)));

        uint256 categoryRandom = randomWordByTokenId % probabilityBase;
        {
            // Default category: SleepingPills
            uint256 categoryIndex = uint256(BoosterCategory.SleepingPills);
            // Check categoryRandom against probability and assign category index
            for (uint256 i = 0; i < categoryProbability.length - 1; i++) {
                if (categoryProbability[i] <= categoryRandom && categoryRandom < categoryProbability[i + 1]) {
                    categoryIndex = i;
                    break;
                }
            }

            traits.category = BoosterCategory(categoryIndex);
        }
    }
}
