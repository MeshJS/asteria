import Link from "next/link";

export default function HowToPlay() {
  return (
    <div className="min-h-screen game-container relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: "url('/starfield.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      
      <div className="relative z-10 min-h-screen flex flex-col items-center py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-orbitron font-black text-gray-200 mb-6">
            HOW TO PLAY
          </h1>
          <p className="text-xl font-share-tech text-gray-400 max-w-2xl">
            Master the art of space navigation and become the first to mine Asteria!
          </p>
        </div>

        <div className="max-w-4xl w-full space-y-8">
          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-400 rounded-xl p-8">
            <h2 className="text-3xl font-orbitron font-bold text-gray-200 mb-4 flex items-center">
            <span className="ml-3">Game Objective</span>
            </h2>
            <p className="text-lg font-share-tech text-gray-400 leading-relaxed">
              Navigate your fleet of ships through space, collect fuel pellets, and be the first to reach the center 
              to mine the precious <span className="text-gray-300 font-bold">Asteria crystal</span>. The player who 
              successfully mines Asteria wins the game!
            </p>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-400 rounded-xl p-8">
            <h2 className="text-3xl font-orbitron font-bold text-gray-200 mb-6 flex items-center">
            <span className="ml-3">Controls</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-orbitron font-bold text-gray-200 mb-3">Ship Movement</h3>
                <div className="space-y-2 font-share-tech text-gray-400">
                  <div className="flex items-center gap-3">
                    <kbd className="px-3 py-1 bg-gray-700 rounded border">↑</kbd>
                    <span>Move Up</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-3 py-1 bg-gray-700 rounded border">↓</kbd>
                    <span>Move Down</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-3 py-1 bg-gray-700 rounded border">←</kbd>
                    <span>Move Left</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-3 py-1 bg-gray-700 rounded border">→</kbd>
                    <span>Move Right</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-orbitron font-bold text-gray-200 mb-3">Ship Selection</h3>
                <div className="space-y-2 font-share-tech text-gray-400">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
                    <span>Click ship to select</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-300 rounded-full ring-2 ring-gray-300"></div>
                    <span>Selected ship (gray ring)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <kbd className="px-3 py-1 bg-gray-700 rounded border">ESC</kbd>
                    <span>Quit Game</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-400 rounded-xl p-8">
                <h2 className="text-3xl font-orbitron font-bold text-gray-200 mb-6 flex items-center">
               <span className="ml-3">Game Elements</span>
                </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">

                <h3 className="text-lg font-orbitron font-bold text-gray-200 mb-2">Ships</h3>
                <p className="font-share-tech text-sm text-gray-400">
                  Your fleet of 1-5 ships. Click to select, use arrow keys to move.
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-orbitron font-bold text-gray-200 mb-2">Fuel Pellets</h3>
                <p className="font-share-tech text-sm text-gray-400">
                  Collect these to power your ships. Hover to see fuel amount.
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-orbitron font-bold text-gray-200 mb-2">Asteria</h3>
                <p className="font-share-tech text-sm text-gray-400">
                  The center target. Reach it with any ship to win the game!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-400 rounded-xl p-8">
            <h2 className="text-3xl font-orbitron font-bold text-gray-200 mb-6 flex items-center">
               <span className="ml-3">Strategy Tips</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-orbitron font-bold text-gray-200 mb-3">Ship Management</h3>
                <ul className="space-y-2 font-share-tech text-gray-400">
                  <li>• Use multiple ships to cover more ground</li>
                  <li>• Keep one ship near the center for quick wins</li>
                  <li>• Spread ships out to collect more fuel</li>
                  <li>• Switch between ships frequently</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-orbitron font-bold text-gray-200 mb-3">Fuel Collection</h3>
                <ul className="space-y-2 font-share-tech text-gray-400">
                  <li>• Prioritize high-value fuel pellets</li>
                  <li>• Plan efficient routes between pellets</li>
                  <li>• Don't ignore distant fuel sources</li>
                  <li>• Balance fuel collection with center approach</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-400 rounded-xl p-8">
            <h2 className="text-3xl font-orbitron font-bold text-gray-200 mb-6 flex items-center">
              <span className="ml-3">Technical Details</span>
            </h2>
            <div className="space-y-4 font-share-tech text-gray-400">
              <div>
                <h3 className="text-lg font-orbitron font-bold text-gray-200 mb-2">Real-time Multiplayer</h3>
                <p>This game uses WebSocket connections for real-time communication between players. All movements and actions are synchronized instantly.</p>
              </div>
              <div>
                <h3 className="text-lg font-orbitron font-bold text-gray-200 mb-2">Hydra L2 Integration</h3>
                <p>Connect your Hydra API URL to experience Cardano's layer 2 scaling solution. The game showcases the eUTxO model's capabilities.</p>
              </div>
              <div>
                <h3 className="text-lg font-orbitron font-bold text-gray-200 mb-2">Grid System</h3>
                <p>The game uses a 100x100 coordinate system with the center at (0,0). Ships move in discrete steps within this grid.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center">
          <Link href="/start">
            <button className="game-button px-8 py-4 text-xl font-orbitron font-bold rounded-lg transform hover:scale-105 transition-all duration-300">
             START PLAYING
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

HowToPlay.showNavBar = true;
