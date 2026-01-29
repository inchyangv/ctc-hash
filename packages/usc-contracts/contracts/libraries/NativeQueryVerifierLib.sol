// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../interfaces/INativeQueryVerifier.sol";

/**
 * @title NativeQueryVerifierLib
 * @notice Library for interacting with the Native Query Verifier precompile
 */
library NativeQueryVerifierLib {
    address public constant PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000FD2;

    /**
     * @notice Get the verifier precompile instance
     */
    function getVerifier() internal pure returns (INativeQueryVerifier) {
        return INativeQueryVerifier(PRECOMPILE_ADDRESS);
    }

    /**
     * @notice Derive transaction index from Merkle proof siblings
     * @dev The path through the tree encodes the index in binary
     * @param siblings The Merkle proof siblings
     * @return txIndex The derived transaction index
     */
    function deriveTxIndex(
        INativeQueryVerifier.MerkleProofEntry[] calldata siblings
    ) internal pure returns (uint256 txIndex) {
        // Each sibling's isLeft flag tells us which direction we went
        // If sibling is on left, we went right (bit = 1)
        // If sibling is on right, we went left (bit = 0)
        for (uint256 i = 0; i < siblings.length; i++) {
            if (siblings[i].isLeft) {
                // Sibling is on left, so we're on the right branch
                txIndex |= (1 << i);
            }
        }
    }

    /**
     * @notice Compute the query key for replay protection
     * @param chainKey The source chain identifier
     * @param blockHeight The block height
     * @param txIndex The transaction index
     * @return queryKey The unique query identifier
     */
    function computeQueryKey(
        uint64 chainKey,
        uint64 blockHeight,
        uint256 txIndex
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(chainKey, blockHeight, txIndex));
    }
}
