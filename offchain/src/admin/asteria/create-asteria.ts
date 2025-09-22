import {
  Asset,
  conStr0,
  integer,
  MeshTxBuilder,
  PlutusScript,
  policyId,
} from "@meshsdk/core";
import {
  myWallet,
  blockchainProvider,
  readScripRefJson,
} from "../../../utils.js";
import { fromScriptRef, resolvePlutusScriptAddress } from "@meshsdk/core-cst";
import { admintoken } from "../../../config.js";

const utxos = await myWallet.getUtxos();
const changeAddress = await myWallet.getChangeAddress();

export async function createAsteria() {
  const asteriaDeployScript = await readScripRefJson("asteriaref");
  if (!asteriaDeployScript.txHash) {
    throw Error("asteria script-ref not found, deploy asteria first.");
  }

  const spacetimeDeployScript = await readScripRefJson("spacetimeref");
  if (!spacetimeDeployScript.txHash) {
    throw Error("spacetime script-ref not found, deploy spacetime first.");
  }

  const asteriaUtxo = await blockchainProvider.fetchUTxOs(
    asteriaDeployScript.txHash
  );
  const asteriaScriptRef = fromScriptRef(asteriaUtxo[0].output.scriptRef!);
  const asteriascriptPlutus = asteriaScriptRef as PlutusScript;
  const asteriaValidatorAddress = resolvePlutusScriptAddress(
    asteriascriptPlutus,
    0
  );

  const spacetimeUtxo = await blockchainProvider.fetchUTxOs(
    spacetimeDeployScript.txHash
  );
  const shipyardPolicyId = spacetimeUtxo[0].output.scriptHash;

  const asteriaDatum = conStr0([
    integer(0),
    policyId(shipyardPolicyId!), //policyId
  ]);
  const totalRewardsAsset: Asset[] = [
    {
      unit: "lovelace",
      quantity: "200000000",
    },
    {
      unit: admintoken.policyid + admintoken.name,
      quantity: "1",
    },
  ];

  const txBuilder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    verbose: true,
  });

  const unsignedTx = await txBuilder
    .txOut(asteriaValidatorAddress, totalRewardsAsset)
    .txOutInlineDatumValue(asteriaDatum, "JSON")
    .selectUtxosFrom(utxos)
    .changeAddress(changeAddress)
    .setNetwork("preview")
    .complete();

  const signedTx = await myWallet.signTx(unsignedTx);
  const asteriaTxhash = await myWallet.submitTx(signedTx);
  return asteriaTxhash;
}
