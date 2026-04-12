# Halal Compliance Review

## Current system state

The platform now uses a P&L-based profit distribution engine:
- profit is derived from actual project revenue minus direct expense and allocated company expense
- investor payouts are split by share ratio
- company share is deducted from distributable profit
- blank-page failure on the profit distribution screen was fixed by adding error handling and schema-safe fallbacks

## What is acceptable now

- No guaranteed return is advertised in the working UI copy
- The distribution engine no longer depends on a hardcoded monthly profit rate model
- User-facing copy has been aligned to a profit-sharing model instead of a fixed-rate return claim

## Remaining compliance gaps

1. There is no formal Shariah board / scholar approval recorded in the repo.
2. The platform does not yet have an explicit project screening workflow for prohibited activities.
3. Loss treatment is not fully formalized in the ledger model; the current implementation distributes profits only.
4. The product should not be marketed as "fully halal" unless an approved governance process exists.

## Recommended next work

- Add a documented Shariah screening checklist for every project
- Add a governance approval step before a project is marked investable
- Make loss and capital-risk wording explicit in the product terms
- Replace any remaining "fully halal" claims with verified compliance language
