import { applyParamtoPellet } from "../apply-param/pellet";
import {
  admin_token,
  fuel_per_step,
  initial_fuel,
  max_asteria_mining,
  max_ship_fuel,
  min_asteria_distance,
  ship_mint_lovelace_fee,
} from "../../../const";
import {
  resolveScriptHash,
  scriptHash,
  serializePlutusScript,
} from "@meshsdk/core";
import { applyParamtoAsteria } from "../apply-param/Asteria";
import { applyParamtoSpacetime } from "../apply-param/spacetime";

const pellet = applyParamtoPellet(admin_token);
export const pelletScriptAddress = serializePlutusScript(
  pellet.PlutusScript,
  "",
  0,
  false
).address;
export const pelletCbor = pellet.cborScript;
export const pelletScripthash = resolveScriptHash(pellet.cborScript, "V3");

const asteria = applyParamtoAsteria(
  scriptHash(pelletScripthash),
  admin_token,
  ship_mint_lovelace_fee,
  max_asteria_mining,
  min_asteria_distance,
  initial_fuel
);
export const asteriaScriptAddress = serializePlutusScript(
  asteria.PlutusScript,
  "",
  0,
  false
).address;

export const asteriaCbor = asteria.cborScript;
export const asteriaScriptHash = resolveScriptHash(asteria.cborScript, "V3");

const spacetime = applyParamtoSpacetime(
  scriptHash(pelletScripthash),
  scriptHash(asteriaScriptHash),
  admin_token,
  max_ship_fuel,
  fuel_per_step
);
export const spacetimeScriptAddress = serializePlutusScript(
  spacetime.plutusScript,
  "",
  0,
  false
).address;
export const spacetimeCbor = spacetime.cborScript;
export const spacetimeScriptHash = resolveScriptHash(
  spacetime.cborScript,
  "V3"
);
