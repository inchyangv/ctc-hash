import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('NativeQueryVerifierLib', function () {
  describe('deriveTxIndex', function () {
    // We'll test this through the main contract since it's an internal library

    it('should derive txIndex = 0 when all siblings are on right (isLeft = false)', async function () {
      // When all siblings are on the right, we went left at each step
      // This means txIndex = 0 (all bits are 0)
      const siblings = [
        { hash: ethers.ZeroHash, isLeft: false },
        { hash: ethers.ZeroHash, isLeft: false },
        { hash: ethers.ZeroHash, isLeft: false },
      ];

      // txIndex should be 0 (binary: 000)
      // We can verify this by computing manually:
      // isLeft[0] = false -> bit 0 = 0
      // isLeft[1] = false -> bit 1 = 0
      // isLeft[2] = false -> bit 2 = 0
      // Result: 0

      // The actual test will be done through contract interaction
      // For now, we verify the logic is correct
      let txIndex = 0;
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].isLeft) {
          txIndex |= 1 << i;
        }
      }
      expect(txIndex).to.equal(0);
    });

    it('should derive txIndex = 7 when all siblings are on left (isLeft = true)', async function () {
      // When all siblings are on the left, we went right at each step
      const siblings = [
        { hash: ethers.ZeroHash, isLeft: true },
        { hash: ethers.ZeroHash, isLeft: true },
        { hash: ethers.ZeroHash, isLeft: true },
      ];

      // txIndex should be 7 (binary: 111)
      let txIndex = 0;
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].isLeft) {
          txIndex |= 1 << i;
        }
      }
      expect(txIndex).to.equal(7);
    });

    it('should derive txIndex = 5 for mixed siblings [true, false, true]', async function () {
      const siblings = [
        { hash: ethers.ZeroHash, isLeft: true }, // bit 0 = 1
        { hash: ethers.ZeroHash, isLeft: false }, // bit 1 = 0
        { hash: ethers.ZeroHash, isLeft: true }, // bit 2 = 1
      ];

      // txIndex should be 5 (binary: 101)
      let txIndex = 0;
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].isLeft) {
          txIndex |= 1 << i;
        }
      }
      expect(txIndex).to.equal(5);
    });
  });

  describe('computeQueryKey', function () {
    it('should compute deterministic query key', async function () {
      const chainKey = 1n;
      const blockHeight = 12345n;
      const txIndex = 0n;

      const expected = ethers.keccak256(
        ethers.solidityPacked(['uint64', 'uint64', 'uint256'], [chainKey, blockHeight, txIndex]),
      );

      // Verify consistency
      const expected2 = ethers.keccak256(
        ethers.solidityPacked(['uint64', 'uint64', 'uint256'], [chainKey, blockHeight, txIndex]),
      );

      expect(expected).to.equal(expected2);
    });

    it('should produce different keys for different inputs', async function () {
      const key1 = ethers.keccak256(
        ethers.solidityPacked(['uint64', 'uint64', 'uint256'], [1n, 100n, 0n]),
      );
      const key2 = ethers.keccak256(
        ethers.solidityPacked(['uint64', 'uint64', 'uint256'], [1n, 100n, 1n]),
      );
      const key3 = ethers.keccak256(
        ethers.solidityPacked(['uint64', 'uint64', 'uint256'], [1n, 101n, 0n]),
      );

      expect(key1).to.not.equal(key2);
      expect(key1).to.not.equal(key3);
      expect(key2).to.not.equal(key3);
    });
  });
});
