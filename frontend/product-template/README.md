# Product Frontend Template (AMETIS)

This template bootstraps a standalone product frontend that reuses AMETIS Hub visual language.

## Usage
1. Copy this folder to `frontend/<product>-app`.
2. Update `package.json` name.
3. Update `NEXT_PUBLIC_<PRODUCT>_API_BASE_URL`.
4. Add compose entry in `infra/compose/frontends.compose.yml`.

## Ports
Default expects you to run the product on port 31xx (e.g. 3100, 3200, ...).
