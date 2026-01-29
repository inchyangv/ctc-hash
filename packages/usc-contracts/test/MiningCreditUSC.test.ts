import { expect } from 'chai';
import { ethers } from 'hardhat';
import { MiningCreditUSC } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('MiningCreditUSC', function () {
  let miningCredit: MiningCreditUSC;
  let owner: SignerWithAddress;
  let miner1: SignerWithAddress;

  const DUMMY_EMITTER = '0x1234567890123456789012345678901234567890';
  const SOURCE_CHAIN_KEY = 1n;

  beforeEach(async function () {
    [owner, miner1] = await ethers.getSigners();

    const MiningCreditUSCFactory = await ethers.getContractFactory('MiningCreditUSC');
    miningCredit = await MiningCreditUSCFactory.deploy(DUMMY_EMITTER, SOURCE_CHAIN_KEY);
    await miningCredit.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should set initial config', async function () {
      expect(await miningCredit.sourceMiningEventEmitter()).to.equal(DUMMY_EMITTER);
      expect(await miningCredit.sourceChainKey()).to.equal(SOURCE_CHAIN_KEY);
      expect(await miningCredit.strictDecode()).to.equal(true);
    });

    it('should set owner', async function () {
      expect(await miningCredit.owner()).to.equal(owner.address);
    });
  });

  describe('getMinerStats', function () {
    it('should return zero stats for new miner', async function () {
      const [totalWorkUnits, totalSolves, lastEpochCredited] =
        await miningCredit.getMinerStats(miner1.address);
      expect(totalWorkUnits).to.equal(0n);
      expect(totalSolves).to.equal(0n);
      expect(lastEpochCredited).to.equal(0n);
    });
  });

  describe('setConfig', function () {
    it('should update config', async function () {
      const newEmitter = '0xabcdef0123456789abcdef0123456789abcdef01';
      const newChainKey = 2n;

      await miningCredit.setConfig(newEmitter, newChainKey, false);

      expect(await miningCredit.sourceMiningEventEmitter()).to.equal(
        ethers.getAddress(newEmitter),
      );
      expect(await miningCredit.sourceChainKey()).to.equal(newChainKey);
      expect(await miningCredit.strictDecode()).to.equal(false);
    });

    it('should emit ConfigUpdated event', async function () {
      const newEmitter = '0xabcdef0123456789abcdef0123456789abcdef01';
      await expect(miningCredit.setConfig(newEmitter, 2n, false))
        .to.emit(miningCredit, 'ConfigUpdated')
        .withArgs(ethers.getAddress(newEmitter), 2n, false);
    });

    it('should only allow owner', async function () {
      await expect(miningCredit.connect(miner1).setConfig(DUMMY_EMITTER, 1n, true))
        .to.be.revertedWithCustomError(miningCredit, 'OwnableUnauthorizedAccount');
    });
  });

  describe('processedQueries', function () {
    it('should return false for unprocessed queries', async function () {
      const queryKey = ethers.keccak256(ethers.toUtf8Bytes('test'));
      expect(await miningCredit.processedQueries(queryKey)).to.equal(false);
    });
  });

  describe('creditedEpoch', function () {
    it('should return false for uncredited epochs', async function () {
      expect(await miningCredit.creditedEpoch(miner1.address, 1n)).to.equal(false);
    });
  });

  // Note: Full recordMiningFromQuery tests require mocking the precompile
  // which is not possible in local hardhat. These would be integration tests.
  describe('recordMiningFromQuery (structure only)', function () {
    it('should have correct function signature', async function () {
      // Verify the function exists with expected parameters
      const fragment = miningCredit.interface.getFunction('recordMiningFromQuery');
      expect(fragment).to.not.be.null;
      expect(fragment?.inputs.length).to.equal(7);
    });
  });

  describe('recordMiningDemoMode (structure only)', function () {
    it('should have correct function signature', async function () {
      const fragment = miningCredit.interface.getFunction('recordMiningDemoMode');
      expect(fragment).to.not.be.null;
      expect(fragment?.inputs.length).to.equal(10);
    });

    it('should revert in strict mode', async function () {
      // strictDecode is true by default
      await expect(
        miningCredit.recordMiningDemoMode(
          1n, // chainKey
          100n, // blockHeight
          '0x', // encodedTransaction
          ethers.ZeroHash, // merkleRoot
          [], // siblings
          ethers.ZeroHash, // lowerEndpointDigest
          [], // continuityRoots
          miner1.address, // miner
          1n, // epoch
          1n, // workUnits
        ),
      ).to.be.revertedWith('Demo mode not allowed in strict mode');
    });
  });
});
