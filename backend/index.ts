import { Server, Socket } from "socket.io";
import { createServer } from "http";
import express from "express";
import {
  createShip,
  gatherFuel,
  mineAsteria,
  moveShip,
  quit,
} from "../offchain";
import { readPelletsCsvFile } from "../offchain/src/admin/pellet/utils.js";
import { HydraProvider } from "@meshsdk/hydra";
import { blockchainProvider } from "../offchain/utils";

interface Ship {
  id: number;
  x: number;
  y: number;
}

interface Pellet {
  id: number;
  x: number;
  y: number;
  fuel: number;
}

interface GameState {
  ships: { [username: string]: Ship[] };
  pellets: Pellet[];
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const hydraProvider = new HydraProvider({
  url: process.env.HYDRA_URL ?? "http://localhost:4001",
});

const gameState: GameState = { ships: {}, pellets: [] };
const userShipTxHashes: Record<string, Record<number, string>> = {};

const pelletFromCsv = await readPelletsCsvFile();
gameState.pellets = pelletFromCsv.map((p, i) => ({
  id: i,
  x: p.posX,
  y: p.posY,
  fuel: parseInt(p.fuel, 10),
}));

function getShipOwner(
  id: number
): { username: string; ship: Ship; index: number } | null {
  for (const username in gameState.ships) {
    const index = gameState.ships[username].findIndex((s) => s.id === id);
    if (index !== -1)
      return { username, ship: { ...gameState.ships[username][index] }, index };
  }
  return null;
}

function isValidTxHash(txHash: string | undefined): txHash is string {
  return typeof txHash === "string" && txHash.length >= 10;
}

io.on("connection", (socket: Socket) => {
  console.log("Client connected:", socket.id);

  socket.on("request-pellets", () => {
    console.log(`Sending ${gameState.pellets.length} pellets`);
    socket.emit("pellets-coordinates", {
      pelletsCoordinates: gameState.pellets,
    });
  });

  socket.on("hydra-url", (data: { hydraUrl: string }) => {
    socket.data.hydraUrl = data.hydraUrl;
    console.log(`Hydra URL set: ${data.hydraUrl}`);
  });

  socket.on("initial-shipCoordinates", async ({ shipProperty }) => {
    const { username, ships } = shipProperty;

    if (!Array.isArray(ships)) {
      return socket.emit("error", { message: "Ship data must be an array" });
    }

    try {
      userShipTxHashes[username] = userShipTxHashes[username] || {};

      for (const ship of ships) {
        console.log(`Creating ship for ${username} at (${ship.x},${ship.y})`);
        const txHash = await createShip(ship.x, ship.y);
        if (!isValidTxHash(txHash)) throw new Error("Invalid txHash returned");

        userShipTxHashes[username][ship.id] = txHash;
      }

      gameState.ships[username] = ships;
      io.emit("createship-coordinates", { coordinatesArray: ships });
    } catch (err: any) {
      console.error(`Ship creation failed for ${username}:`, err);
      socket.emit("error", { message: `Ship creation failed: ${err.message}` });
    }
  });

  socket.on("ship-moved", async ({ id, dx, dy }) => {
    try {
      console.log(`Ship ${id} moving dx=${dx}, dy=${dy}`);

      const owner = getShipOwner(id);
      if (!owner)
        return socket.emit("error", { message: `Ship ${id} not found` });

      const { username, ship, index } = owner;
      const prevTx = userShipTxHashes[username]?.[id];
      if (!isValidTxHash(prevTx)) {
        return socket.emit("error", {
          message: `Invalid txHash for ship ${id}`,
        });
      }

      if (
        !Number.isFinite(dx) ||
        !Number.isFinite(dy) ||
        Math.abs(dx) > 1 ||
        Math.abs(dy) > 1
      ) {
        return socket.emit("error", {
          message: `Invalid move values dx=${dx}, dy=${dy}`,
        });
      }

      const newX = Math.max(-50, Math.min(50, ship.x + dx));
      const newY = Math.max(-50, Math.min(50, ship.y + dy));
      if (newX === ship.x && newY === ship.y) return;

      ship.x = newX;
      ship.y = newY;
      gameState.ships[username][index] = ship;

      const moveTx = await moveShip(dx, dy, prevTx);
      if (!isValidTxHash(moveTx))
        throw new Error("moveShip returned invalid txHash");

      userShipTxHashes[username][id] = moveTx;
      io.emit("ship-moved", { ship });

      const pelletIdx = gameState.pellets.findIndex(
        (p) => p.x === ship.x && p.y === ship.y
      );
      if (pelletIdx !== -1) {
        const pellet = gameState.pellets.splice(pelletIdx, 1)[0];
        const fuelTx = await gatherFuel(
          pellet.fuel.toString(),
          moveTx,
          20,
          pellet.id
        );

        if (isValidTxHash(fuelTx)) {
          userShipTxHashes[username][id] = fuelTx;
          io.emit("pellet-collected", { pelletId: pellet.id });
        } else {
          socket.emit("error", {
            message: `Failed to gather fuel for pellet ${pellet.id}`,
          });
        }
      }

      if (ship.x === 0 && ship.y === 0) {
        const mineTx = await mineAsteria(moveTx);
        if (isValidTxHash(mineTx)) {
          userShipTxHashes[username][id] = mineTx;
          io.emit("asteria-mined", { username });

          gameState.ships = {};
          gameState.pellets = [];
          io.emit("game-cleared", { message: "Game reset: Asteria mined" });
        } else {
          socket.emit("error", { message: "Failed to mine Asteria" });
        }
      }
    } catch (err: any) {
      console.error(`Error moving ship ${id}:`, err);
      socket.emit("error", { message: `Ship move failed: ${err.message}` });
    }
  });

  socket.on("quit", async ({ username }) => {
    if (!gameState.ships[username]) {
      return socket.emit("error", { message: "No active game for this user" });
    }

    try {
      for (const shipId in userShipTxHashes[username]) {
        const txHash = userShipTxHashes[username][shipId];
        const quitTx = await quit(txHash);
        if (!isValidTxHash(quitTx)) {
          socket.emit("error", { message: `Quit failed for ship ${shipId}` });
        }
      }

      delete userShipTxHashes[username];
      delete gameState.ships[username];
      io.emit("game-cleared", {
        username,
        message: `${username} quit the game`,
      });
    } catch (err: any) {
      console.error(`Quit error for ${username}:`, err);
      socket.emit("error", { message: `Quit failed: ${err.message}` });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = Number(process.env.PORT ?? 3002);
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
