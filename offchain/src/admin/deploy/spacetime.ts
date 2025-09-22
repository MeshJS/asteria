import {
  admin_token,
  fuel_per_step,
  max_ship_fuel,
  max_speed,
} from "../../../const.js";
import {
  blockchainProvider,
  myWallet,
  readScripRefJson,
  writeScriptRefJson,
} from "../../../utils.js";
import { Asset, conStr0, MeshTxBuilder, scriptHash } from "@meshsdk/core";
import { applyParamtoDeploy } from "../apply-param/deploy.js";
import { resolvePlutusScriptAddress } from "@meshsdk/core-csl";
import { applyParamtoSpacetime } from "../apply-param/spacetime.js";

const utxos = await myWallet.getUtxos();
const changeAddress = await myWallet.getChangeAddress();

const asteriaDeployScript = await readScripRefJson("asteriaref");
if (!asteriaDeployScript.txHash) {
  throw Error("asteria script-ref not found, deploy asteria first.");
}
const pelletDeployScript = await readScripRefJson("pelletref");
if (!pelletDeployScript.txHash) {
  throw Error("pellet script-ref not found, deploy pellet first.");
}

const asteriaScriptUtxo = await blockchainProvider.fetchUTxOs(
  asteriaDeployScript.txHash,
  0
);
const pelletScriptUtxo = await blockchainProvider.fetchUTxOs(
  pelletDeployScript.txHash,
  0
);

//parameterize hash instead of address
const asteriaScriptHash = asteriaScriptUtxo[0].output.scriptHash;
const pelletScriptHash = pelletScriptUtxo[0].output.scriptHash;

const deployScript = applyParamtoDeploy(admin_token);
const deployScriptAddressBech32 = resolvePlutusScriptAddress(
  deployScript.plutusScript,
  0
);
const spacetimeScript = applyParamtoSpacetime(
  scriptHash(pelletScriptHash!),
  scriptHash(asteriaScriptHash!),
  admin_token,
  max_ship_fuel,
  fuel_per_step
);

const spacetimeAsset: Asset[] = [
  {
    unit: "lovelace",
    quantity: "35088510",
  },
];
async function deploySpacetime() {
  const txBuiler = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    verbose: true,
  });

  const unsignedTx = await txBuiler
    .txOut(deployScriptAddressBech32, spacetimeAsset)
    .txOutInlineDatumValue(conStr0([]), "JSON")
    .txOutReferenceScript(spacetimeScript.cborScript, "V3")
    .selectUtxosFrom(utxos)
    .changeAddress(changeAddress)
    .setNetwork("preprod")
    .complete();

  const signedTx = await myWallet.signTx(unsignedTx);
  const txHash = await myWallet.submitTx(signedTx);
  await writeScriptRefJson("spacetimeref", txHash);
  return txHash;
}
export { deploySpacetime };
