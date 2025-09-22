import {
  admin_token,
  initial_fuel,
  max_asteria_mining,
  min_asteria_distance,
  ship_mint_lovelace_fee,
} from "../../../const.js";
import { Asset, conStr0, MeshTxBuilder, scriptHash } from "@meshsdk/core";
import {
  blockchainProvider,
  myWallet,
  readScripRefJson,
  writeScriptRefJson,
} from "../../../utils.js";
import { applyParamtoAsteria } from "../apply-param/Asteria.js";
import { applyParamtoDeploy } from "../apply-param/deploy.js";
import { resolvePlutusScriptAddress } from "@meshsdk/core-csl";

const utxos = await myWallet.getUtxos();
const changeAddress = await myWallet.getChangeAddress();

const pelletDeployScript = await readScripRefJson("pelletref");
if (!pelletDeployScript.txHash) {
  throw Error("pellet script-ref not found, deploy pellet first.");
}
const pelletScriptUtxo = await blockchainProvider.fetchUTxOs(
  pelletDeployScript.txHash,
  0
);
const pelletScriptHash = pelletScriptUtxo[0].output.scriptHash;

const asteria = applyParamtoAsteria(
  scriptHash(pelletScriptHash!),
  admin_token,
  ship_mint_lovelace_fee,
  max_asteria_mining,
  min_asteria_distance,
  initial_fuel
);
const deployScript = applyParamtoDeploy(admin_token);

const deployScriptAddressBech32 = resolvePlutusScriptAddress(
  deployScript.plutusScript,
  0
);

const asteriaAsset: Asset[] = [
  {
    unit: "lovelace",
    quantity: "30615530",
  },
];

async function deployAsteria() {
  const txBuiler = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    verbose: true,
  });

  const unsignedTx = await txBuiler
    .txOut(deployScriptAddressBech32, asteriaAsset)
    .txOutInlineDatumValue(conStr0([]), "JSON")
    .txOutReferenceScript(asteria.cborScript, "V3")
    .selectUtxosFrom(utxos)
    .changeAddress(changeAddress)
    .setNetwork("preprod")
    .complete();

  const signedTx = await myWallet.signTx(unsignedTx);
  const txHash = await myWallet.submitTx(signedTx);
  await writeScriptRefJson("asteriaref", txHash);
  return txHash;
}

export { deployAsteria };
