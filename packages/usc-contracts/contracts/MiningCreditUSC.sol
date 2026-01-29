// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MiningCreditUSC
 * @notice Creditcoin USC contract that verifies Sepolia mining events
 * @dev Uses Native Query Verifier precompile for trustless verification
 */
contract MiningCreditUSC is Ownable {
    struct MinerStats {
        uint256 totalWorkUnits;
        uint64 totalSolves;
        uint64 lastEpochCredited;
    }

    // Miner address => stats
    mapping(address => MinerStats) public minerStats;

    // queryKey (keccak256(chainKey, blockHeight, txIndex)) => processed
    mapping(bytes32 => bool) public processedQueries;

    // Optional redundant check: miner => epoch => credited
    mapping(address => mapping(uint64 => bool)) public creditedEpoch;

    // Configuration
    address public sourceMiningEventEmitter;
    uint64 public sourceChainKey;

    // Events
    event MiningCredited(
        address indexed miner,
        uint64 indexed epoch,
        uint256 workUnits,
        uint256 newTotalWorkUnits,
        bytes32 indexed queryKey
    );

    event ConfigUpdated(address sourceMiningEventEmitter, uint64 sourceChainKey);

    constructor(
        address _sourceMiningEventEmitter,
        uint64 _sourceChainKey
    ) Ownable(msg.sender) {
        sourceMiningEventEmitter = _sourceMiningEventEmitter;
        sourceChainKey = _sourceChainKey;
    }

    /**
     * @notice Update source chain configuration
     */
    function setConfig(
        address _sourceMiningEventEmitter,
        uint64 _sourceChainKey
    ) external onlyOwner {
        sourceMiningEventEmitter = _sourceMiningEventEmitter;
        sourceChainKey = _sourceChainKey;
        emit ConfigUpdated(_sourceMiningEventEmitter, _sourceChainKey);
    }

    /**
     * @notice Get miner stats
     */
    function getMinerStats(
        address miner
    ) external view returns (uint256 totalWorkUnits, uint64 totalSolves, uint64 lastEpochCredited) {
        MinerStats storage stats = minerStats[miner];
        return (stats.totalWorkUnits, stats.totalSolves, stats.lastEpochCredited);
    }
}
