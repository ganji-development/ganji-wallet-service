import { Idl } from "@coral-xyz/anchor";

export const IDL: Idl = {
  address: "BTQyLHZd6PPTu5jY2wWUxxYAmWKRVyadSMZwhLmX4gvn",
  metadata: {
    name: "license_checker",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor",
  },
  instructions: [
    {
      name: "issue_license",
      docs: [
        "1. Issue a new license.",
        "Must be signed by the authority (Ganji Service) to prevent unauthorized issuance.",
      ],
      discriminator: [5, 103, 183, 220, 230, 209, 57, 154],
      accounts: [
        {
          name: "license_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [108, 105, 99, 101, 110, 115, 101],
              },
              {
                kind: "account",
                path: "user",
              },
              {
                kind: "arg",
                path: "software_id",
              },
            ],
          },
        },
        {
          name: "user",
          docs: ["The user wallet getting the license"],
          writable: true,
        },
        {
          name: "authority",
          docs: [
            "The authorized wallet (Your Service) that must sign to approve the license",
          ],
          writable: true,
          signer: true,
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "software_id",
          type: "u64",
        },
        {
          name: "duration_seconds",
          type: "i64",
        },
      ],
    },
    {
      name: "renew_license",
      docs: [
        "2. Renew existing license.",
        "Only the authority can renew (after verifying payment in GNJ).",
      ],
      discriminator: [104, 243, 122, 253, 203, 203, 199, 64],
      accounts: [
        {
          name: "license_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [108, 105, 99, 101, 110, 115, 101],
              },
              {
                kind: "account",
                path: "license_account.owner",
                account: "LicenseAccount",
              },
              {
                kind: "account",
                path: "license_account.software_id",
                account: "LicenseAccount",
              },
            ],
          },
        },
        {
          name: "authority",
          signer: true,
        },
      ],
      args: [
        {
          name: "duration_seconds",
          type: "i64",
        },
      ],
    },
    {
      name: "set_active_status",
      docs: [
        "3. Revoke/Deactivate license manual (e.g., chargeback or terms violation)",
      ],
      discriminator: [123, 145, 253, 77, 113, 221, 22, 61],
      accounts: [
        {
          name: "license_account",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [108, 105, 99, 101, 110, 115, 101],
              },
              {
                kind: "account",
                path: "license_account.owner",
                account: "LicenseAccount",
              },
              {
                kind: "account",
                path: "license_account.software_id",
                account: "LicenseAccount",
              },
            ],
          },
        },
        {
          name: "authority",
          signer: true,
        },
      ],
      args: [
        {
          name: "status",
          type: "bool",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "LicenseAccount",
      discriminator: [120, 20, 28, 217, 130, 168, 223, 118],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "UnauthorizedAuthority",
      msg: "Only the authorized service wallet can perform this action.",
    },
    {
      code: 6001,
      name: "LicenseNotActive",
      msg: "The license is not marked as active.",
    },
    {
      code: 6002,
      name: "LicenseExpired",
      msg: "The license has expired.",
    },
  ],
  types: [
    {
      name: "LicenseAccount",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "authority",
            type: "pubkey",
          },
          {
            name: "software_id",
            type: "u64",
          },
          {
            name: "purchase_timestamp",
            type: "i64",
          },
          {
            name: "expiration_timestamp",
            type: "i64",
          },
          {
            name: "is_active",
            type: "bool",
          },
          {
            name: "bump",
            type: "u8",
          },
        ],
      },
    },
  ],
};
