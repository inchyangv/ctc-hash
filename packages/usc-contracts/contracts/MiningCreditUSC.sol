// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INativeQueryVerifier.sol";
import "./libraries/NativeQueryVerifierLib.sol";
import "./libraries/EvmV1Decoder.sol";

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
    bool public strictDecode;

    // Events
    event MiningCredited(
        address indexed miner,
        uint64 indexed epoch,
        uint256 workUnits,
        uint256 newTotalWorkUnits,
        bytes32 indexed queryKey
    );

    event QueryVerified(bytes32 indexed queryKey);
    event DecodeSkipped(bytes32 indexed queryKey, string reason);
    event ConfigUpdated(address sourceMiningEventEmitter, uint64 sourceChainKey, bool strictDecode);

    constructor(
        address _sourceMiningEventEmitter,
        uint64 _sourceChainKey
    ) Ownable(msg.sender) {
        sourceMiningEventEmitter = _sourceMiningEventEmitter;
        sourceChainKey = _sourceChainKey;
        strictDecode = true;
    }

    /**
     * @notice Record a mining event from a verified USC query
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

        // Decode and credit
        if (strictDecode) {
            EvmV1Decoder.MiningSolvedData memory data = EvmV1Decoder.decodeMiningSolvedStrict(
                encodedTransaction,
                sourceMiningEventEmitter
            );
            _creditMining(data.miner, data.epoch, data.workUnits, queryKey);
        } else {
            emit DecodeSkipped(queryKey, "strictDecode disabled");
        }

        return true;
    }

    /**
     * @notice Demo mode: record mining with explicit parameters (fallback if decode fails)
     * @dev Only use when strictDecode is false
     */
    function recordMiningDemoMode(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        bytes32 merkleRoot,
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings,
        bytes32 lowerEndpointDigest,
        bytes32[] calldata continuityRoots,
        // Demo mode explicit params
        address miner,
        uint64 epoch,
        uint256 workUnits
    ) external returns (bool success) {
        require(!strictDecode, "Demo mode not allowed in strict mode");

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

        // Call precompile to verify (still requires valid proof!)
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
        emit DecodeSkipped(queryKey, "using demo mode params");

        // Credit with explicit params
        _creditMining(miner, epoch, workUnits, queryKey);

        return true;
    }

    /**
     * @notice Internal function to credit mining
     */
    function _creditMining(
        address miner,
        uint64 epoch,
        uint256 workUnits,
        bytes32 queryKey
    ) internal {
        // Check epoch not already credited for this miner
        require(!creditedEpoch[miner][epoch], "Epoch already credited for miner");

        // Update stats
        MinerStats storage stats = minerStats[miner];
        stats.totalWorkUnits += workUnits;
        stats.totalSolves += 1;
        stats.lastEpochCredited = epoch;

        // Mark epoch as credited
        creditedEpoch[miner][epoch] = true;

        emit MiningCredited(miner, epoch, workUnits, stats.totalWorkUnits, queryKey);
    }

    /**
     * @notice Update source chain configuration
     */
    function setConfig(
        address _sourceMiningEventEmitter,
        uint64 _sourceChainKey,
        bool _strictDecode
    ) external onlyOwner {
        sourceMiningEventEmitter = _sourceMiningEventEmitter;
        sourceChainKey = _sourceChainKey;
        strictDecode = _strictDecode;
        emit ConfigUpdated(_sourceMiningEventEmitter, _sourceChainKey, _strictDecode);
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
