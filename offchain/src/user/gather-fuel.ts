import { 
    Asset, 
    byteString, 
    conStr, 
    conStr0, 
    deserializeDatum, 
    integer,   
    MeshTxBuilder, 
    PlutusScript, 
    policyId, 
    posixTime, 
    serializePlutusScript, 
    SLOT_CONFIG_NETWORK, 
    stringToHex, 
    unixTimeToEnclosingSlot, 
    UTxO
} from "@meshsdk/core";
import { 
    blockchainProvider, 
    myWallet, 
    readScripRefJson
} from "../../utils.js";
import { fromScriptRef} from "@meshsdk/core-cst";
import { admintoken} from "../../config.js";

const changeAddress = await myWallet.getChangeAddress();
const collateral: UTxO = (await myWallet.getCollateral())[0]!;
const utxos = await myWallet.getUtxos();

async function gatherFuel(
    ship_tx_hash: string,
    pellet_tx_Hash: string,
    pellet_tx_index: number,
    gather_amount: number
){
const spacetimeDeployScript = await readScripRefJson('spacetimeref');
if(!spacetimeDeployScript.txHash){
    throw Error ("spacetime script-ref not found, deploy spacetime first.");
}; 
const pelletDeployScript = await readScripRefJson('pelletref');
if(!pelletDeployScript.txHash){
throw Error ("pellet script-ref not found, deploy pellet first.");
};

const spacetimeUtxos   =  await blockchainProvider.fetchUTxOs(spacetimeDeployScript.txHash);
const spacetimeScriptRef = fromScriptRef(spacetimeUtxos[0].output.scriptRef!);
const spacetimePlutusScript = spacetimeScriptRef as  PlutusScript;
const spacetimeAddress = serializePlutusScript(spacetimePlutusScript).address;
const shipYardPolicyId = spacetimeUtxos[0].output.scriptHash;

const pelletUtxos = await blockchainProvider.fetchUTxOs(pelletDeployScript.txHash)
const pelletScriptRef = fromScriptRef(pelletUtxos[0].output.scriptRef!);
const pelletPlutusScript = pelletScriptRef as PlutusScript
const pelletAddress = serializePlutusScript(pelletPlutusScript).address;
const fuelPolicyId = pelletUtxos[0].output.scriptHash;

const shipUtxo  = await blockchainProvider.fetchUTxOs(ship_tx_hash,1);
const pelletUtxo = await blockchainProvider.fetchUTxOs(pellet_tx_Hash, pellet_tx_index);

const ship = shipUtxo[0];
    if(!ship.output.plutusData){
        throw Error("Ship datum is empty");
    };
const pellet = pelletUtxo[0];
     if (!pellet.output.plutusData){
        throw Error("Pellet Datum is Empty")
    };

const shipInputAda = ship.output.amount.find((asset) =>
    asset.unit === "lovelace"
);
console.log('ship input ada',shipInputAda)
const fueltokenUnit = fuelPolicyId + stringToHex("FUEL");

const shipInputFuel = ship.output.amount.find((asset) => 
    asset.unit === fueltokenUnit);

const pelletInputAda = pellet.output.amount.find((Asset =>
    Asset.unit === "lovelace"
));
console.log('pellet input ada',pelletInputAda)
const pelletInputFuel = pellet.output.amount.find((asset) => 
    asset.unit === fueltokenUnit);

console.log("Ship : ", ship.output.amount)
console.log("Pellet : ", pellet.output.amount)


const pellet_fuel = Number(pelletInputFuel?.quantity)
console.log('gather amount', gather_amount)
const shipInputData = ship.output.plutusData;
const shipInputDatum = deserializeDatum(shipInputData).fields;

const ShipPosX:number = shipInputDatum[0].int;
const shipPoxY: number = shipInputDatum[1].int;
const shipTokenName: string = shipInputDatum[2].bytes;
const pilotTokenName: string= shipInputDatum[3].bytes;

const shipOutDatum = conStr0([
    integer(ShipPosX),
    integer(shipPoxY),
    byteString(shipTokenName),
    byteString(pilotTokenName)
]);

//get pelletInput Datum
const pelletInputData = pellet.output.plutusData;
const pelletInputDatum = deserializeDatum(pelletInputData).fields;

//get pelletDatum properties
const pelletPosX: number = pelletInputDatum[0].int;
const pelletPosY: number = pelletInputDatum[1].int;
const pelletInputShipyardPolicy: string = pelletInputDatum[2].bytes;

//pellet output Datum
const pelletOuputDatum = conStr0([
    integer(pelletPosX),
    integer(pelletPosY),
    policyId(pelletInputShipyardPolicy)
]);

const shipFuel = shipInputFuel?.quantity;
console.log('ship input ada',shipInputAda);
const spacetimeOutputAssets : Asset[] = [{
    unit: shipInputAda?.unit!,
    quantity: shipInputAda?.quantity!
},{
    unit: shipYardPolicyId + shipTokenName,
    quantity: "1"
},{
    unit: pelletInputFuel?.unit!,
    quantity:(Number(shipFuel!) + gather_amount).toString()
}];

const pelletOutputAssets : Asset[] = [{
    unit: admintoken.policyid + admintoken.name,
    quantity: "1"
},{
    unit: pelletInputFuel?.unit!,
    quantity: (Number(pellet_fuel) - gather_amount).toString()
}];

const pilot_token_asset: Asset[] = [{
    unit: shipYardPolicyId + pilotTokenName,
    quantity: "1"
}];

const shipRedeemer = conStr(1, [integer(gather_amount)]);
const pelletRedemer = conStr0([integer(gather_amount)]);

const txBuilder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    evaluator: blockchainProvider,
    verbose: true
});

const unsignedTx = await txBuilder
.spendingPlutusScriptV3()
.txIn(
    ship.input.txHash,
    ship.input.outputIndex
)
.txInRedeemerValue(shipRedeemer,"JSON")
.spendingTxInReference(spacetimeDeployScript.txHash,0)
.txInInlineDatumPresent()
.txOut(pelletAddress,pelletOutputAssets)
.txOutInlineDatumValue(pelletOuputDatum,"JSON")

.spendingPlutusScriptV3()
.txIn(
    pellet.input.txHash,
    pellet.input.outputIndex
)
.txInRedeemerValue(pelletRedemer, "JSON")
.spendingTxInReference(pelletDeployScript.txHash,0)
.txInInlineDatumPresent()
.txOut(spacetimeAddress,spacetimeOutputAssets)
.txOutInlineDatumValue(shipOutDatum,"JSON")


.txOut(myWallet.addresses.baseAddressBech32!, pilot_token_asset) 
.txInCollateral(
    collateral.input.txHash,
    collateral.input.outputIndex
)
.selectUtxosFrom(utxos)
.changeAddress(changeAddress)
.setNetwork("preprod")
.complete();

const signedTx = await myWallet.signTx(unsignedTx);
const txHash = await myWallet.submitTx(signedTx);
return txHash;
};
export {gatherFuel};