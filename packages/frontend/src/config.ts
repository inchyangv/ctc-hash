type PublicConfig = {
  sepoliaMiningEventAddress: string | undefined;
  uscMiningCreditAddress: string | undefined;
  sepoliaChainId: number;
  uscChainId: number;
};

export const config: PublicConfig = {
  sepoliaMiningEventAddress: process.env.NEXT_PUBLIC_SEPOLIA_MINING_EVENT_ADDRESS,
  uscMiningCreditAddress: process.env.NEXT_PUBLIC_USC_MINING_CREDIT_USC_ADDRESS,
  sepoliaChainId: 11155111,
  uscChainId: 102035,
};

if (typeof window !== 'undefined') {
  if (!config.sepoliaMiningEventAddress) {
    console.warn('[config] NEXT_PUBLIC_SEPOLIA_MINING_EVENT_ADDRESS is not set');
  }
  if (!config.uscMiningCreditAddress) {
    console.warn('[config] NEXT_PUBLIC_USC_MINING_CREDIT_USC_ADDRESS is not set');
  }
}
