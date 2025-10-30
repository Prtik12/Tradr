// AMM Anchor Program IDL
// This will be replaced with the generated IDL after running `anchor build`
// For now, this is a type-safe mock based on the program structure

export type AmmAnchor = {
  "version": "0.1.0",
  "name": "amm_anchor",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "admin", "isMut": true, "isSigner": true },
        { "name": "mintX", "isMut": false, "isSigner": false },
        { "name": "mintY", "isMut": false, "isSigner": false },
        { "name": "config", "isMut": true, "isSigner": false },
        { "name": "mintLp", "isMut": true, "isSigner": false },
        { "name": "vaultX", "isMut": true, "isSigner": false },
        { "name": "vaultY", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "seed", "type": "u64" },
        { "name": "fee", "type": "u16" },
        { "name": "authority", "type": { "option": "publicKey" } }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "mintX", "isMut": false, "isSigner": false },
        { "name": "mintY", "isMut": false, "isSigner": false },
        { "name": "config", "isMut": false, "isSigner": false },
        { "name": "mintLp", "isMut": true, "isSigner": false },
        { "name": "vaultX", "isMut": true, "isSigner": false },
        { "name": "vaultY", "isMut": true, "isSigner": false },
        { "name": "userX", "isMut": true, "isSigner": false },
        { "name": "userY", "isMut": true, "isSigner": false },
        { "name": "userLp", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" },
        { "name": "maxX", "type": "u64" },
        { "name": "maxY", "type": "u64" }
      ]
    },
    {
      "name": "swap",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "mintX", "isMut": false, "isSigner": false },
        { "name": "mintY", "isMut": false, "isSigner": false },
        { "name": "config", "isMut": false, "isSigner": false },
        { "name": "mintLp", "isMut": true, "isSigner": false },
        { "name": "vaultX", "isMut": true, "isSigner": false },
        { "name": "vaultY", "isMut": true, "isSigner": false },
        { "name": "userX", "isMut": true, "isSigner": false },
        { "name": "userY", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "isX", "type": "bool" },
        { "name": "amount", "type": "u64" },
        { "name": "min", "type": "u64" }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "mintX", "isMut": false, "isSigner": false },
        { "name": "mintY", "isMut": false, "isSigner": false },
        { "name": "config", "isMut": false, "isSigner": false },
        { "name": "mintLp", "isMut": true, "isSigner": false },
        { "name": "vaultX", "isMut": true, "isSigner": false },
        { "name": "vaultY", "isMut": true, "isSigner": false },
        { "name": "userX", "isMut": true, "isSigner": false },
        { "name": "userY", "isMut": true, "isSigner": false },
        { "name": "userLp", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" },
        { "name": "minX", "type": "u64" },
        { "name": "minY", "type": "u64" }
      ]
    },
    {
      "name": "lock",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "config", "isMut": true, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "unlock",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "config", "isMut": true, "isSigner": false }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Config",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "seed", "type": "u64" },
          { "name": "authority", "type": { "option": "publicKey" } },
          { "name": "mintX", "type": "publicKey" },
          { "name": "mintY", "type": "publicKey" },
          { "name": "fee", "type": "u16" },
          { "name": "locked", "type": "bool" },
          { "name": "configBump", "type": "u8" },
          { "name": "lpBump", "type": "u8" },
          { "name": "reserved", "type": { "array": ["u8", 32] } }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "PoolLocked", "msg": "This pool is locked" },
    { "code": 6001, "name": "InvalidAmount", "msg": "Invalid Amount" },
    { "code": 6002, "name": "SlippageExceeded", "msg": "Slippage Exceeded" },
    { "code": 6003, "name": "Overflow", "msg": "Overflow Detected" },
    { "code": 6004, "name": "Underflow", "msg": "Underflow Detected" },
    { "code": 6005, "name": "InvalidAuthority", "msg": "Invalid Authority" },
    { "code": 6006, "name": "InvalidPrecision", "msg": "Invalid Precision - All tokens must have 9 decimals" },
    { "code": 6007, "name": "InsufficientBalance", "msg": "Insufficient Balance" },
    { "code": 6008, "name": "ZeroBalance", "msg": "Zero Balance" }
  ]
};

export const IDL: AmmAnchor = {
  "version": "0.1.0",
  "name": "amm_anchor",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "admin", "isMut": true, "isSigner": true },
        { "name": "mintX", "isMut": false, "isSigner": false },
        { "name": "mintY", "isMut": false, "isSigner": false },
        { "name": "config", "isMut": true, "isSigner": false },
        { "name": "mintLp", "isMut": true, "isSigner": false },
        { "name": "vaultX", "isMut": true, "isSigner": false },
        { "name": "vaultY", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "seed", "type": "u64" },
        { "name": "fee", "type": "u16" },
        { "name": "authority", "type": { "option": "publicKey" } }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "mintX", "isMut": false, "isSigner": false },
        { "name": "mintY", "isMut": false, "isSigner": false },
        { "name": "config", "isMut": false, "isSigner": false },
        { "name": "mintLp", "isMut": true, "isSigner": false },
        { "name": "vaultX", "isMut": true, "isSigner": false },
        { "name": "vaultY", "isMut": true, "isSigner": false },
        { "name": "userX", "isMut": true, "isSigner": false },
        { "name": "userY", "isMut": true, "isSigner": false },
        { "name": "userLp", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" },
        { "name": "maxX", "type": "u64" },
        { "name": "maxY", "type": "u64" }
      ]
    },
    {
      "name": "swap",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "mintX", "isMut": false, "isSigner": false },
        { "name": "mintY", "isMut": false, "isSigner": false },
        { "name": "config", "isMut": false, "isSigner": false },
        { "name": "mintLp", "isMut": true, "isSigner": false },
        { "name": "vaultX", "isMut": true, "isSigner": false },
        { "name": "vaultY", "isMut": true, "isSigner": false },
        { "name": "userX", "isMut": true, "isSigner": false },
        { "name": "userY", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "isX", "type": "bool" },
        { "name": "amount", "type": "u64" },
        { "name": "min", "type": "u64" }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "mintX", "isMut": false, "isSigner": false },
        { "name": "mintY", "isMut": false, "isSigner": false },
        { "name": "config", "isMut": false, "isSigner": false },
        { "name": "mintLp", "isMut": true, "isSigner": false },
        { "name": "vaultX", "isMut": true, "isSigner": false },
        { "name": "vaultY", "isMut": true, "isSigner": false },
        { "name": "userX", "isMut": true, "isSigner": false },
        { "name": "userY", "isMut": true, "isSigner": false },
        { "name": "userLp", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amount", "type": "u64" },
        { "name": "minX", "type": "u64" },
        { "name": "minY", "type": "u64" }
      ]
    },
    {
      "name": "lock",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "config", "isMut": true, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "unlock",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "config", "isMut": true, "isSigner": false }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Config",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "seed", "type": "u64" },
          { "name": "authority", "type": { "option": "publicKey" } },
          { "name": "mintX", "type": "publicKey" },
          { "name": "mintY", "type": "publicKey" },
          { "name": "fee", "type": "u16" },
          { "name": "locked", "type": "bool" },
          { "name": "configBump", "type": "u8" },
          { "name": "lpBump", "type": "u8" },
          { "name": "reserved", "type": { "array": ["u8", 32] } }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "PoolLocked", "msg": "This pool is locked" },
    { "code": 6001, "name": "InvalidAmount", "msg": "Invalid Amount" },
    { "code": 6002, "name": "SlippageExceeded", "msg": "Slippage Exceeded" },
    { "code": 6003, "name": "Overflow", "msg": "Overflow Detected" },
    { "code": 6004, "name": "Underflow", "msg": "Underflow Detected" },
    { "code": 6005, "name": "InvalidAuthority", "msg": "Invalid Authority" },
    { "code": 6006, "name": "InvalidPrecision", "msg": "Invalid Precision - All tokens must have 9 decimals" },
    { "code": 6007, "name": "InsufficientBalance", "msg": "Insufficient Balance" },
    { "code": 6008, "name": "ZeroBalance", "msg": "Zero Balance" }
  ]
};
