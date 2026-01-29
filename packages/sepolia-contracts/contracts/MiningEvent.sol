// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MiningEvent
 * @notice Sepolia "mining" contract - emits verifiable work events
 * @dev Users find a nonce such that hash < target, proving work
 */
contract MiningEvent is Ownable {
    uint64 public epoch;
    bytes32 public challenge;
    uint256 public difficultyTarget;

    mapping(address => uint64) public lastSolvedEpoch;

    event MiningSolved(
        uint64 indexed epoch,
        address indexed miner,
        uint256 nonce,
        uint256 workUnits,
        bytes32 digest
    );

    event ChallengeRotated(uint64 indexed newEpoch, bytes32 newChallenge);
    event DifficultyUpdated(uint256 newTarget);

    constructor(
        bytes32 initialChallenge,
        uint256 initialTarget
    ) Ownable(msg.sender) {
        epoch = 1;
        challenge = initialChallenge;
        difficultyTarget = initialTarget;
    }

    /**
     * @notice Submit a valid mining solution
     * @param nonce The nonce that satisfies the difficulty target
     */
    function mine(uint256 nonce) external {
        require(lastSolvedEpoch[msg.sender] < epoch, "Already solved this epoch");

        bytes32 digest = keccak256(
            abi.encodePacked(challenge, epoch, msg.sender, nonce)
        );
        require(uint256(digest) < difficultyTarget, "Nonce does not meet target");

        lastSolvedEpoch[msg.sender] = epoch;

        // workUnits = 1 for hackathon simplicity
        emit MiningSolved(epoch, msg.sender, nonce, 1, digest);
    }

    /**
     * @notice Rotate the challenge and increment epoch (owner only)
     * @param newChallenge The new challenge bytes
     */
    function rotateChallenge(bytes32 newChallenge) external onlyOwner {
        epoch += 1;
        challenge = newChallenge;
        emit ChallengeRotated(epoch, newChallenge);
    }

    /**
     * @notice Set difficulty target (owner only)
     * @param newTarget The new target (smaller = harder)
     */
    function setDifficulty(uint256 newTarget) external onlyOwner {
        difficultyTarget = newTarget;
        emit DifficultyUpdated(newTarget);
    }

    /**
     * @notice Compute digest for a given nonce (view helper)
     */
    function computeDigest(
        address miner,
        uint256 nonce
    ) external view returns (bytes32) {
        return keccak256(abi.encodePacked(challenge, epoch, miner, nonce));
    }
}
