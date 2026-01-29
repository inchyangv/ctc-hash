import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying MiningEvent with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');

  // Initial challenge: hash of "genesis"
  const initialChallenge = ethers.keccak256(ethers.toUtf8Bytes('genesis'));

  // Easy difficulty for demo: ~50% of hashes will pass
  // max_uint256 / 2
  const initialTarget = ethers.MaxUint256 / 2n;

  console.log('Initial challenge:', initialChallenge);
  console.log('Initial target:', initialTarget.toString());

  const MiningEvent = await ethers.getContractFactory('MiningEvent');
  const miningEvent = await MiningEvent.deploy(initialChallenge, initialTarget);
  await miningEvent.waitForDeployment();

  const address = await miningEvent.getAddress();
  console.log('MiningEvent deployed to:', address);

  console.log('\n--- Copy to .env ---');
  console.log(`SEPOLIA_MINING_EVENT_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_SEPOLIA_MINING_EVENT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
