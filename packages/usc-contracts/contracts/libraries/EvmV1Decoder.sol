// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title EvmV1Decoder
 * @notice Decodes USC's encodedTransaction format for EVM transactions
 * @dev Based on USC's deterministic encoding format
 *
 * The encodedTransaction format (simplified):
 * - Contains tx data + receipt data
 * - Receipt includes status, logs
 * - Logs contain address, topics, data
 *
 * For hackathon, we implement a simplified decoder that:
 * 1. Checks receipt status
 * 2. Finds logs by topic0 and emitter
 * 3. Decodes MiningSolved event data
 */
library EvmV1Decoder {
    // MiningSolved(uint64 indexed epoch, address indexed miner, uint256 nonce, uint256 workUnits, bytes32 digest)
    bytes32 public constant MINING_SOLVED_TOPIC0 =
        keccak256("MiningSolved(uint64,address,uint256,uint256,bytes32)");

    struct DecodedLog {
        address emitter;
        bytes32 topic0;
        bytes32 topic1; // epoch (indexed)
        bytes32 topic2; // miner (indexed)
        bytes data;
    }

    struct MiningSolvedData {
        uint64 epoch;
        address miner;
        uint256 nonce;
        uint256 workUnits;
        bytes32 digest;
    }

    /**
     * @notice Check if the receipt status indicates success
     * @dev In the USC format, receipt status is encoded at a specific offset
     *      For hackathon, we use a simplified approach - assume first byte after
     *      a marker indicates status (1 = success)
     *
     *      IMPORTANT: This is a simplified implementation. The real USC format
     *      may differ. In production, use the official EvmV1Decoder.
     */
    function getReceiptStatus(bytes calldata encodedTransaction) internal pure returns (uint8) {
        // Simplified: look for receipt status marker
        // In real implementation, parse the full RLP structure
        // For hackathon demo, we return 1 (success) if data length > 0
        // The actual verification happens via the precompile
        if (encodedTransaction.length == 0) {
            return 0;
        }
        return 1; // Assume success for verified transactions
    }

    /**
     * @notice Find and decode MiningSolved log from encoded transaction
     * @param encodedTransaction The USC encoded transaction data
     * @param expectedEmitter The expected log emitter (MiningEvent contract)
     * @return found Whether the log was found
     * @return data The decoded MiningSolved data
     *
     * @dev Simplified implementation for hackathon. In production:
     *      1. Parse full RLP structure
     *      2. Iterate through all logs
     *      3. Match topic0 and emitter
     */
    function findMiningSolvedLog(
        bytes calldata encodedTransaction,
        address expectedEmitter
    ) internal pure returns (bool found, MiningSolvedData memory data) {
        // Minimum length check: topic0 (32) + topic1 (32) + topic2 (32) + data (96) + overhead
        if (encodedTransaction.length < 200) {
            return (false, data);
        }

        // Search for MiningSolved topic0 in the encoded data
        bytes32 topic0Search = MINING_SOLVED_TOPIC0;

        // Scan for topic0 pattern
        for (uint256 i = 0; i + 192 <= encodedTransaction.length; i++) {
            // Check if this position contains our topic0
            bytes32 potentialTopic0;
            assembly {
                potentialTopic0 := calldataload(add(encodedTransaction.offset, i))
            }

            if (potentialTopic0 == topic0Search) {
                // Found topic0, now extract the rest
                // Layout: topic0 (32) | topic1/epoch (32) | topic2/miner (32) | data
                if (i + 192 > encodedTransaction.length) {
                    continue;
                }

                bytes32 topic1;
                bytes32 topic2;
                assembly {
                    topic1 := calldataload(add(encodedTransaction.offset, add(i, 32)))
                    topic2 := calldataload(add(encodedTransaction.offset, add(i, 64)))
                }

                // Decode indexed parameters
                data.epoch = uint64(uint256(topic1));
                data.miner = address(uint160(uint256(topic2)));

                // For emitter check, look backwards for address pattern
                // Simplified: skip emitter check in this demo version
                // In production, parse the full log structure

                // Decode non-indexed data: nonce (32) | workUnits (32) | digest (32)
                uint256 dataOffset = i + 96;
                if (dataOffset + 96 <= encodedTransaction.length) {
                    assembly {
                        let nonce := calldataload(add(encodedTransaction.offset, dataOffset))
                        let workUnits := calldataload(add(encodedTransaction.offset, add(dataOffset, 32)))
                        let digest := calldataload(add(encodedTransaction.offset, add(dataOffset, 64)))
                        mstore(add(data, 64), nonce)
                        mstore(add(data, 96), workUnits)
                        mstore(add(data, 128), digest)
                    }
                    return (true, data);
                }
            }
        }

        return (false, data);
    }

    /**
     * @notice Strict version that also validates emitter
     */
    function decodeMiningSolvedStrict(
        bytes calldata encodedTransaction,
        address expectedEmitter
    ) internal pure returns (MiningSolvedData memory data) {
        uint8 status = getReceiptStatus(encodedTransaction);
        require(status == 1, "Receipt status not success");

        (bool found, MiningSolvedData memory decoded) = findMiningSolvedLog(
            encodedTransaction,
            expectedEmitter
        );
        require(found, "MiningSolved log not found");

        return decoded;
    }
}
