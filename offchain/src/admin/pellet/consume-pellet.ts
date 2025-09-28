import { conStr1, MeshTxBuilder, stringToHex, UTxO } from "@meshsdk/core";
import { hydraProvider, hydraWallet } from "../../../utils.js";
import { admintoken } from "../../../config.js";
import { pelletCbor, pelletScripthash } from "../deploy/hydra-deploy.js";

const changeAddress = await hydraWallet.getChangeAddress();
const collateral: UTxO = (await hydraWallet.getCollateral())[0]!;
const utxos = await hydraWallet.getUtxos();

const consumePellets = async (pelletTxhash: string) => {
  await hydraProvider.connect();
  const fuelTokenName = stringToHex("FUEL");

  const pelletsUtxo = await hydraProvider.fetchUTxOs(pelletTxhash);
  console.log("pelletsUtxo", pelletsUtxo[0]?.output.amount);

  const pellets = pelletsUtxo.slice(0, -1).map((utxo, index) => ({
    input: {
      txHash: pelletTxhash,
      outputIndex: index,
    },
    output: utxo.output,
  }));

  const totalFuel = pellets.reduce((sum, pellet) => {
    const asset = pellet.output.amount.find(
      (asset) => asset.unit === pelletScripthash + fuelTokenName
    );
    return sum + (Number(asset?.quantity) || 0);
  }, 0);

  const addressUtxos = await hydraWallet
    .getUtxos()
    .then((us) =>
      us.filter((u) =>
        u.output.amount.find(
          (asset) => asset.unit === admintoken.policyid + admintoken.name
        )
      )
    )
    .then((us) => us[0]);

  const consumePelletRedeemer = conStr1([]);
  const burnfuelRedeemer = conStr1([]);

  const txbuilder = new MeshTxBuilder({
    submitter: hydraProvider,
    fetcher: hydraProvider,
    verbose: true,
  });

  txbuilder
    .spendingPlutusScriptV3()
    .txIn(pelletTxhash, 0)
    .txInInlineDatumPresent()
    .txInScript(pelletCbor)
    .txInRedeemerValue(consumePelletRedeemer, "JSON");
  txbuilder
    .txIn(addressUtxos!.input.txHash, addressUtxos!.input.outputIndex)
    .mintPlutusScriptV3()
    .mint("-" + totalFuel.toString(), pelletScripthash, fuelTokenName)
    .mintingScript(pelletCbor)
    .mintRedeemerValue(burnfuelRedeemer, "JSON")

    .txInCollateral(collateral.input.txHash, collateral.input.outputIndex)
    .setNetwork("preprod")
    .changeAddress(changeAddress)
    .selectUtxosFrom(utxos);
  const unsignedTx = await txbuilder.complete();
  const signedTx = await hydraWallet.signTx(unsignedTx);
  const txhash = await hydraWallet.submitTx(signedTx);
  return txhash;
};

export { consumePellets };
