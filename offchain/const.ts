import { 
  assetName, 
  conStr0, 
  integer, 
  policyId, 
  stringToHex 
} from "@meshsdk/core";

let admin_token = conStr0([
  policyId("b1c4161244ba39de0bdbec6131b931252cc0369b84fa345a99576a02"), 
  assetName(stringToHex("hydra-asteria"))                              
]);
const ship_mint_lovelace_fee = integer(3000000);
const max_asteria_mining = integer(50);
const max_speed = conStr0([
  integer(1), 
  integer(30000)   
]);
const max_ship_fuel = integer(300);
const fuel_per_step = integer(10);
const initial_fuel = integer(100);
const min_asteria_distance = integer(10);

export {
  admin_token,
  ship_mint_lovelace_fee,
  max_asteria_mining,
  max_speed,
  max_ship_fuel,
  fuel_per_step,
  initial_fuel,
  min_asteria_distance,
};