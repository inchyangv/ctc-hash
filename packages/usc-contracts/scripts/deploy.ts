import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying MiningCreditUSC with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'CTC');

  // Get from environment or use placeholder
  const sourceMiningEventEmitter =
    process.env.SEPOLIA_MINING_EVENT_ADDRESS || '0x0000000000000000000000000000000000000000';
  const sourceChainKey = BigInt(process.env.SOURCE_CHAIN_KEY_SEPOLIA || '0');

  console.log('Source Mining Event Emitter:', sourceMiningEventEmitter);
  console.log('Source Chain Key:', sourceChainKey.toString());

  if (sourceMiningEventEmitter === '0x0000000000000000000000000000000000000000') {
    console.warn('WARNING: Using placeholder for sourceMiningEventEmitter');
  }
  if (sourceChainKey === 0n) {
    console.warn('WARNING: Using 0 for sourceChainKey');
  }

  const MiningCreditUSC = await ethers.getContractFactory('MiningCreditUSC');
  const miningCreditUSC = await MiningCreditUSC.deploy(sourceMiningEventEmitter, sourceChainKey);
  await miningCreditUSC.waitForDeployment();

  const address = await miningCreditUSC.getAddress();
  console.log('MiningCreditUSC deployed to:', address);

  console.log('\n--- Copy to .env ---');
  console.log(`USC_MINING_CREDIT_USC_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_USC_MINING_CREDIT_USC_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
