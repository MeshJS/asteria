import { Server, Socket } from "socket.io";
import { createServer } from "http";
import express from "express";
import { createShip } from "../offchain";
import { gatherFuel } from "../offchain";
import { mineAsteria } from "../offchain";
import { moveShip } from "../offchain";
import { quit } from "../offchain";
import { readPelletsCsvFile } from "../offchain/src/admin/pellet/utils.js";
import { HydraProvider } from "@meshsdk/hydra";

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

const gameState: GameState = {
  ships: {},
  pellets: [],
};

const userShipTxHashes: Record<string, Record<number, string>> = {};

const pelletFromCsv = await readPelletsCsvFile();
gameState.pellets = pelletFromCsv.map((pellet, index) => ({
  id: index,
  x: pellet.posX,
  y: pellet.posY,
  fuel: parseInt(pellet.fuel, 10),
}));

io.on("connection", (socket: Socket) => {
  socket.on("request-pellets", () => {
    socket.emit("pellets-coordinates", {
      pelletsCoordinates: gameState.pellets,
    });
  });

  socket.on("hydra-url", (data: { hydraUrl: string }) => {
    socket.data.hydraUrl = data.hydraUrl;
  });

  socket.on(
    "initial-shipCoordinates",
    async (data: { shipProperty: { username: string; ships: Ship[] } }) => {
      const { username, ships } = data.shipProperty;

      if (!Array.isArray(ships)) {
        socket.emit("error", { message: "Ship data is not an array" });
        return;
      }

      try {
        userShipTxHashes[username] = userShipTxHashes[username] || {};
        for (const ship of ships) {
          const txHash = await createShip(ship.x, ship.y);
          if (!txHash) {
            throw new Error(`Failed to create ship at (${ship.x}, ${ship.y})`);
          }
          userShipTxHashes[username][ship.id] = txHash;
        }

        gameState.ships[username] = ships;
        io.emit("createship-coordinates", { coordinatesArray: ships });
      } catch (err) {
        socket.emit("error", { message: "Failed to initialize ships" });
      }
    }
  );

  socket.on(
    "ship-moved",
    async (data: { id: number; dx: number; dy: number }) => {
      const { id, dx, dy } = data;

      try {
        let username: string | undefined;
        let ship: Ship | undefined;
        let shipIndex: number = -1;

        // Find the ship and its owner
        for (const user in gameState.ships) {
          const userShips = gameState.ships[user];
          shipIndex = userShips.findIndex((s) => s.id === id);
          if (shipIndex !== -1) {
            username = user;
            ship = { ...userShips[shipIndex] };
            break;
          }
        }

        if (!username || !ship) {
          socket.emit("error", { message: `Ship not found for ID ${id}` });
          return;
        }

        const shipTxHash = userShipTxHashes[username]?.[id];
        if (!shipTxHash) {
          socket.emit("error", {
            message: `No transaction hash for ship ${id}`,
          });
          return;
        }

        // Calculate new position within grid bounds
        const newX = Math.max(-50, Math.min(50, ship.x + dx));
        const newY = Math.max(-50, Math.min(50, ship.y + dy));

        if (newX === ship.x && newY === ship.y) {
          return; // No movement needed
        }

        // Update ship position
        ship.x = newX;
        ship.y = newY;
        gameState.ships[username][shipIndex] = ship;

        // Move ship on blockchain
        console.log(
          `Moving ship ${id} for ${username}: dx=${dx}, dy=${dy}, txHash=${shipTxHash}`
        );
        const moveTxHash = await moveShip(dx, dy, shipTxHash);
        if (!moveTxHash) {
          socket.emit("error", { message: `Failed to move ship ${id}` });
          return;
        }
        userShipTxHashes[username][id] = moveTxHash;
        io.emit("ship-moved", { ship });

        // Check for pellet collection
        const pelletIndex = gameState.pellets.findIndex(
          (p) => p.x === ship.x && p.y === ship.y
        );
        if (pelletIndex !== -1) {
          const collectedPellet = gameState.pellets.splice(pelletIndex, 1)[0];
          const gatherAmount = collectedPellet.fuel - 30;
          console.log(
            `Collecting pellet ${collectedPellet.id}: fuel=${collectedPellet.fuel}`
          );
          const fuelTxHash = await gatherFuel(
            moveTxHash,
            "f38b3c7b510b3f13a2c035809b212061759e7c1ccbb1f4556d3b456044773a93",
            collectedPellet.id,
            gatherAmount
          );
          if (fuelTxHash) {
            userShipTxHashes[username][id] = fuelTxHash;
            io.emit("pellet-collected", { pelletId: collectedPellet.id });
          } else {
            socket.emit("error", {
              message: `Failed to gather fuel for pellet ${collectedPellet.id}`,
            });
          }
        }

        // Check for Asteria mining
        if (ship.x === 0 && ship.y === 0) {
          console.log(`Mining Asteria for ship ${id}`);
          const mineTxHash = await mineAsteria(moveTxHash);
          if (mineTxHash) {
            userShipTxHashes[username][id] = mineTxHash;
            io.emit("asteria-mined", { username });
            gameState.ships = {};
            gameState.pellets = [];
            io.emit("game-cleared", {
              message: "Game reset due to Asteria mined",
            });
          } else {
            socket.emit("error", { message: "Failed to mine Asteria" });
          }
        }
      } catch (err) {
        console.error(`Error processing ship movement for ID ${id}:`, err);
        socket.emit("error", {
          message: `Failed to process ship movement: ${err.message}`,
        });
      }
    }
  );

  socket.on("quit", async (data: { username: string }) => {
    const { username } = data;

    if (!gameState.ships[username] || !userShipTxHashes[username]) {
      socket.emit("error", { message: "No active game for user" });
      return;
    }

    try {
      for (const shipId in userShipTxHashes[username]) {
        const shipTxHash = userShipTxHashes[username][shipId];
        const quitTxHash = await quit(shipTxHash);
        if (!quitTxHash) {
          socket.emit("error", { message: `Failed to quit ship ${shipId}` });
        }
      }

      delete userShipTxHashes[username];
      delete gameState.ships[username];
      io.emit("game-cleared", {
        username,
        message: `${username} has quit the game`,
      });
    } catch (err) {
      socket.emit("error", {
        message: `Failed to process quit for ${username}`,
      });
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
