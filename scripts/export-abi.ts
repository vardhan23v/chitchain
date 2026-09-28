import { artifacts } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";

/** Copies the ChitChain ABI to backend/src/abi and frontend/lib so both apps share one source of truth. */
async function main() {
  const art = await artifacts.readArtifact("ChitChain");
  const json = JSON.stringify(art.abi, null, 2);
  for (const dir of ["backend/src/abi", "frontend/lib/abi"]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/ChitChain.json`, json);
    console.log(`wrote ${dir}/ChitChain.json (${art.abi.length} entries)`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
