// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INativeQueryVerifier.sol";
import "./libraries/NativeQueryVerifierLib.sol";

/**
 * @title MiningCreditUSC
 * @notice Creditcoin USC contract that verifies Sepolia mining events
 * @dev Uses Native Query Verifier precompile for trustless verification
 */
contract MiningCreditUSC is Ownable {
    using NativeQueryVerifierLib for INativeQueryVerifier.MerkleProofEntry[];

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

    event QueryVerified(bytes32 indexed queryKey);

    event ConfigUpdated(address sourceMiningEventEmitter, uint64 sourceChainKey);

    constructor(
        address _sourceMiningEventEmitter,
        uint64 _sourceChainKey
    ) Ownable(msg.sender) {
        sourceMiningEventEmitter = _sourceMiningEventEmitter;
        sourceChainKey = _sourceChainKey;
    }

    /**
     * @notice Record a mining event from a verified USC query
     * @param chainKey The source chain identifier
     * @param blockHeight The block height on the source chain
     * @param encodedTransaction The encoded transaction data
     * @param merkleRoot The Merkle root
     * @param siblings The Merkle proof siblings
     * @param lowerEndpointDigest The lower endpoint digest for continuity
     * @param continuityRoots The continuity roots
     * @return success Whether the operation succeeded
     */
    function recordMiningFromQuery(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        bytes32 merkleRoot,
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings,
        bytes32 lowerEndpointDigest,
        bytes32[] calldata continuityRoots
    ) external returns (bool success) {
        // Derive txIndex from siblings
        uint256 txIndex = siblings.deriveTxIndex();

        // Compute queryKey for replay protection
        bytes32 queryKey = NativeQueryVerifierLib.computeQueryKey(chainKey, blockHeight, txIndex);

        // Check not already processed
        require(!processedQueries[queryKey], "Query already processed");

        // Build proof structs
        INativeQueryVerifier.MerkleProof memory merkleProof = INativeQueryVerifier.MerkleProof({
            root: merkleRoot,
            siblings: siblings
        });

        INativeQueryVerifier.ContinuityProof memory continuityProof = INativeQueryVerifier.ContinuityProof({
            lowerEndpointDigest: lowerEndpointDigest,
            roots: continuityRoots
        });

        // Call precompile to verify
        INativeQueryVerifier verifier = NativeQueryVerifierLib.getVerifier();
        bool verified = verifier.verifyAndEmit(
            chainKey,
            blockHeight,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        require(verified, "Proof verification failed");

        // Mark as processed
        processedQueries[queryKey] = true;

        emit QueryVerified(queryKey);

        // TODO: T22 will add transaction decoding and scoring
        // For now, just return success
        return true;
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
