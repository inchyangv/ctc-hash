// MiningEvent.sol ABI (Sepolia)
export const MINING_EVENT_ABI = [
  {
    inputs: [
      { name: "initialChallenge", type: "bytes32" },
      { name: "initialTarget", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "newEpoch", type: "uint64" },
      { indexed: false, name: "newChallenge", type: "bytes32" },
    ],
    name: "ChallengeRotated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "newTarget", type: "uint256" }],
    name: "DifficultyUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "epoch", type: "uint64" },
      { indexed: true, name: "miner", type: "address" },
      { indexed: false, name: "nonce", type: "uint256" },
      { indexed: false, name: "workUnits", type: "uint256" },
      { indexed: false, name: "digest", type: "bytes32" },
    ],
    name: "MiningSolved",
    type: "event",
  },
  {
    inputs: [],
    name: "challenge",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "miner", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
    name: "computeDigest",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "difficultyTarget",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "epoch",
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "lastSolvedEpoch",
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "nonce", type: "uint256" }],
    name: "mine",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newChallenge", type: "bytes32" }],
    name: "rotateChallenge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newTarget", type: "uint256" }],
    name: "setDifficulty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// MiningCreditUSC.sol ABI (Creditcoin USC)
export const MINING_CREDIT_USC_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "miner", type: "address" },
      { indexed: true, name: "epoch", type: "uint64" },
      { indexed: false, name: "workUnits", type: "uint256" },
      { indexed: false, name: "newTotalWorkUnits", type: "uint256" },
      { indexed: true, name: "queryKey", type: "bytes32" },
    ],
    name: "MiningCredited",
    type: "event",
  },
  {
    inputs: [{ name: "miner", type: "address" }],
    name: "getMinerStats",
    outputs: [
      { name: "totalWorkUnits", type: "uint256" },
      { name: "totalSolves", type: "uint64" },
      { name: "lastEpochCredited", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "minerStats",
    outputs: [
      { name: "totalWorkUnits", type: "uint256" },
      { name: "totalSolves", type: "uint64" },
      { name: "lastEpochCredited", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
