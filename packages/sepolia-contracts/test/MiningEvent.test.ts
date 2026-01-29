import { expect } from 'chai';
import { ethers } from 'hardhat';
import { MiningEvent } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('MiningEvent', function () {
  let miningEvent: MiningEvent;
  let owner: SignerWithAddress;
  let miner1: SignerWithAddress;
  let miner2: SignerWithAddress;

  // Easy target for testing (high value = easy difficulty)
  const EASY_TARGET = ethers.MaxUint256;
  const INITIAL_CHALLENGE = ethers.keccak256(ethers.toUtf8Bytes('genesis'));

  beforeEach(async function () {
    [owner, miner1, miner2] = await ethers.getSigners();

    const MiningEventFactory = await ethers.getContractFactory('MiningEvent');
    miningEvent = await MiningEventFactory.deploy(INITIAL_CHALLENGE, EASY_TARGET);
    await miningEvent.waitForDeployment();
  });

  describe('Deployment', function () {
    it('should set initial epoch to 1', async function () {
      expect(await miningEvent.epoch()).to.equal(1n);
    });

    it('should set initial challenge', async function () {
      expect(await miningEvent.challenge()).to.equal(INITIAL_CHALLENGE);
    });

    it('should set initial target', async function () {
      expect(await miningEvent.difficultyTarget()).to.equal(EASY_TARGET);
    });

    it('should set owner', async function () {
      expect(await miningEvent.owner()).to.equal(owner.address);
    });
  });

  describe('mine()', function () {
    it('should succeed when nonce satisfies target', async function () {
      // With EASY_TARGET = MaxUint256, any nonce should work
      const nonce = 12345n;
      const tx = await miningEvent.connect(miner1).mine(nonce);
      const receipt = await tx.wait();

      // Check event
      const event = receipt?.logs.find((log) => {
        try {
          const parsed = miningEvent.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          return parsed?.name === 'MiningSolved';
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
    });

    it('should emit MiningSolved with correct parameters', async function () {
      const nonce = 42n;
      const expectedDigest = await miningEvent.computeDigest(miner1.address, nonce);

      await expect(miningEvent.connect(miner1).mine(nonce))
        .to.emit(miningEvent, 'MiningSolved')
        .withArgs(1n, miner1.address, nonce, 1n, expectedDigest);
    });

    it('should revert when nonce fails target', async function () {
      // Set impossibly hard target (0 = nothing will pass)
      await miningEvent.setDifficulty(0);

      await expect(miningEvent.connect(miner1).mine(12345))
        .to.be.revertedWith('Nonce does not meet target');
    });

    it('should enforce one solve per epoch per address', async function () {
      await miningEvent.connect(miner1).mine(1);

      await expect(miningEvent.connect(miner1).mine(2))
        .to.be.revertedWith('Already solved this epoch');
    });

    it('should allow different miners in same epoch', async function () {
      await miningEvent.connect(miner1).mine(1);
      await expect(miningEvent.connect(miner2).mine(2)).to.not.be.reverted;
    });

    it('should allow same miner in different epochs', async function () {
      await miningEvent.connect(miner1).mine(1);
      await miningEvent.rotateChallenge(ethers.randomBytes(32));
      await expect(miningEvent.connect(miner1).mine(2)).to.not.be.reverted;
    });
  });

  describe('rotateChallenge()', function () {
    it('should increment epoch', async function () {
      expect(await miningEvent.epoch()).to.equal(1n);
      await miningEvent.rotateChallenge(ethers.randomBytes(32));
      expect(await miningEvent.epoch()).to.equal(2n);
    });

    it('should update challenge', async function () {
      const newChallenge = ethers.keccak256(ethers.toUtf8Bytes('new'));
      await miningEvent.rotateChallenge(newChallenge);
      expect(await miningEvent.challenge()).to.equal(newChallenge);
    });

    it('should emit ChallengeRotated event', async function () {
      const newChallenge = ethers.keccak256(ethers.toUtf8Bytes('new'));
      await expect(miningEvent.rotateChallenge(newChallenge))
        .to.emit(miningEvent, 'ChallengeRotated')
        .withArgs(2n, newChallenge);
    });

    it('should only allow owner', async function () {
      await expect(miningEvent.connect(miner1).rotateChallenge(ethers.randomBytes(32)))
        .to.be.revertedWithCustomError(miningEvent, 'OwnableUnauthorizedAccount');
    });
  });

  describe('setDifficulty()', function () {
    it('should update target', async function () {
      const newTarget = 1000n;
      await miningEvent.setDifficulty(newTarget);
      expect(await miningEvent.difficultyTarget()).to.equal(newTarget);
    });

    it('should emit DifficultyUpdated event', async function () {
      const newTarget = 1000n;
      await expect(miningEvent.setDifficulty(newTarget))
        .to.emit(miningEvent, 'DifficultyUpdated')
        .withArgs(newTarget);
    });

    it('should only allow owner', async function () {
      await expect(miningEvent.connect(miner1).setDifficulty(1000))
        .to.be.revertedWithCustomError(miningEvent, 'OwnableUnauthorizedAccount');
    });
  });

  describe('computeDigest()', function () {
    it('should return consistent digest', async function () {
      const nonce = 123n;
      const digest1 = await miningEvent.computeDigest(miner1.address, nonce);
      const digest2 = await miningEvent.computeDigest(miner1.address, nonce);
      expect(digest1).to.equal(digest2);
    });

    it('should produce different digests for different miners', async function () {
      const nonce = 123n;
      const digest1 = await miningEvent.computeDigest(miner1.address, nonce);
      const digest2 = await miningEvent.computeDigest(miner2.address, nonce);
      expect(digest1).to.not.equal(digest2);
    });
  });
});
