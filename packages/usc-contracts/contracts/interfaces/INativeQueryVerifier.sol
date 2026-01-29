// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title INativeQueryVerifier
 * @notice Interface for the USC Native Query Verifier precompile
 * @dev Address: 0x0000000000000000000000000000000000000FD2
 */
interface INativeQueryVerifier {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }

    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    /**
     * @notice Verify and emit a query proof
     * @param chainKey The source chain identifier
     * @param height The block height on the source chain
     * @param encodedTransaction The encoded transaction data
     * @param merkleProof The Merkle proof for inclusion
     * @param continuityProof The continuity proof
     * @return success Whether the verification succeeded
     */
    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool success);
}
