import React, { useEffect, useState } from "react";
import getSocket from "../../apis/connection";
import { useRouter } from "next/router";

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

const GameSetup: React.FC = () => {
  const router = useRouter();
  const socket = getSocket();
  const [username, setUsername] = useState("");
  const [shipsCount, setShipsCount] = useState<number | undefined>();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingShips, setPendingShips] = useState<Ship[]>([]);
  const [pendingPellets, setPendingPellets] = useState<Pellet[]>([]);
  const [hydraUrl, setHydraUrl] = useState<string>("");

  useEffect(() => {
    socket.emit("request-pellets");

    socket.on("pellets-coordinates", (data: { pelletsCoordinates: Pellet[] }) => {
      setPendingPellets(data.pelletsCoordinates || []);
    });

    socket.on("createship-coordinates", (data: { coordinatesArray: Ship[] }) => {
      setPendingShips(data.coordinatesArray);
    });

    return () => {
      socket.off("pellets-coordinates");
      socket.off("createship-coordinates");
    };
  }, [socket]);

  useEffect(() => {
    if (pendingShips.length > 0 && isLoading) {
      localStorage.setItem(
        "initialGameState",
        JSON.stringify({
          ships: pendingShips,
          pellets: pendingPellets,
          username,
          hydraUrl,
        })
      );
      setIsLoading(false);
      router.push("/start");
    }
  }, [pendingShips, isLoading, router, username, pendingPellets, hydraUrl]);

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!hydraUrl.trim()) {
      setError("Enter your Hydra API URL");
      setIsLoading(false);
      return;
    }

    if (!username.trim()) {
      setError("Enter a username");
      setIsLoading(false);
      return;
    }

    if (!shipsCount || shipsCount < 1 || shipsCount > 5) {
      setError("Enter a number of ships between 1 and 5");
      setIsLoading(false);
      return;
    }

    const shipProps: Ship[] = Array.from({ length: shipsCount }, (_, index) => {
      const x =
        Math.random() < 0.5
          ? Math.floor(Math.random() * 41) + 10
          : Math.floor(Math.random() * 41) - 50;
      const y =
        Math.random() < 0.5
          ? Math.floor(Math.random() * 41) + 10
          : Math.floor(Math.random() * 41) - 50;
      return { id: index, x, y };
    });

    socket.emit("hydra-url", { hydraUrl });
    socket.emit("initial-shipCoordinates", {
      shipProperty: { username, ships: shipProps },
    });
  };

  const inputPlaceholderStyle = {
    fontFamily: "'monocraft', 'monospace', 'DM Sans', 'sans-serif'",
    letterSpacing: "0.03em",
  };

  const pelletToPercent = (val: number) => {
    return `${((val + 50) / 100) * 100}%`;
  };

  return (
    <>
      {/* Show pellets immediately */}
      {pendingPellets.map((node) => (
        <div
          key={node.id}
          className="absolute group z-20"
          style={{
            left: pelletToPercent(node.x),
            top: pelletToPercent(node.y),
            transform: "translate(-50%, -50%)",
          }}
        >
          <img src="/fuel.svg" alt="pellet" className="w-6 h-6" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-black bg-opacity-70 text-white text-xs rounded-md border border-gray-300 px-2 py-1 whitespace-nowrap z-50">
            ID: {node.id}, Fuel: {node.fuel}
            <br />
            ({node.x}, {node.y})
          </div>
        </div>
      ))}
      
      {/* Show Asteria */}
      <img
        src="/asteria-light.png"
        alt="asteria"
        className="absolute w-20 h-20 z-10"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="fixed bottom-5 left-0 w-full flex items-center justify-center bg-transparent z-30">
        <div className="relative z-20 flex items-center rounded-lg justify-between w-full max-w-5xl px-6 py-4 bg-[#e9ebee] border-t-4 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-grey-700 rounded-full flex items-center justify-center text-black font-monocraft-regular text-base border-2 border-black">
            0
          </div>
          <div className="text-sm font-monocraft-regular text-[#000000] px-2 py-1 bg-[#9999a7] rounded border border-[#000000] shadow">
            {username || "Player"}
          </div>
        </div>
        <form onSubmit={handleCreateGame} className="flex items-center gap-4">
          <input
            type="url"
            placeholder="Hydra API URL"
            value={hydraUrl}
            onChange={(e) => setHydraUrl(e.target.value)}
            className="font-monocraft-regular placeholder:font-monocraft-regular placeholder:text-[#000000] bg-[#e9ebee] border-2 border-[#0a0b0c] rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all w-64"
            style={inputPlaceholderStyle}
            disabled={isLoading}
            autoComplete="off"
            spellCheck={false}
            name="hydraUrl"
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="font-monocraft-regular placeholder:font-monocraft-regular placeholder:text-[#000000] bg-[#e9ebee] border-2 border-[#0a0b0c] rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            style={inputPlaceholderStyle}
            disabled={isLoading}
            autoComplete="off"
            spellCheck={false}
            name="username"
          />
          <input
            type="number"
            placeholder="Ships (1-5)"
            value={shipsCount === undefined ? "" : shipsCount}
            onChange={(e) =>
              setShipsCount(
                e.target.value ? parseInt(e.target.value) : undefined
              )
            }
            min={1}
            max={5}
            className="font-monocraft-regular placeholder:font-monocraft-regular placeholder:text-[#000000] bg-[#e9ebee] border-2 border-[#0a0b0c] rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all w-60"
            style={{
              ...inputPlaceholderStyle,
              fontFamily: "'monocraft', 'monospace'",
            }}
            disabled={isLoading}
            autoComplete="off"
            spellCheck={false}
            name="shipsCount"
          />
          <button
            type="submit"
            className="font-monocraft-regular text-sm bg-[#23233a] text-white border-2 border-grey-400 rounded-lg px-4 py-2 shadow-lg hover:from-blue-200 hover:to-grey-400 hover:scale-105 transition-all disabled:opacity-50"
            disabled={isLoading}
          >
            Start
          </button>
        </form>
        <div className="flex items-center gap-3">
          {error && (
            <p className="text-red-300 font-monocraft-regular text-sm bg-[#2a1a1a80] rounded py-1 px-2 border border-black-400">
              {error}
            </p>
          )}
          {isLoading && (
            <p className="text-blue-200 font-monocraft-regular text-sm bg-[#1a2a3a80] rounded py-1 px-2 border border-blue-400 animate-pulse">
              Creating...
            </p>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default GameSetup;