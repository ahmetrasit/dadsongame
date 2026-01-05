import { usePlayerStore } from '@/stores/playerStore';
import { useGameTime, useWeather, formatGameTime } from '@/stores/worldStore';
import { useConnectionState, useLatency } from '@/stores/multiplayerStore';
import { Hotbar } from './Hotbar';
import { PlacementPreview } from './PlacementPreview';
import { Inventory } from './Inventory';
import { ToolCrafting } from './ToolCrafting';
import { BuildingMenu } from './BuildingMenu';
import { ConstructionPanelTrigger } from './ConstructionPanel';

export function HUD() {
  const player = usePlayerStore((s) => s.player);
  const gameTime = useGameTime();
  const weather = useWeather();
  const connectionState = useConnectionState();
  const latency = useLatency();

  return (
    <div className="hud">
      {/* Top bar */}
      <div className="hud-top">
        <div className="hud-time">
          <span className="time-icon">☀</span>
          <span>{formatGameTime(gameTime)}</span>
          <span className="weather-icon">{getWeatherIcon(weather)}</span>
        </div>

        <div className="hud-connection">
          <span className={`connection-dot ${connectionState}`} />
          <span className="connection-text">
            {connectionState === 'connected' ? `${latency}ms` : connectionState}
          </span>
        </div>
      </div>

      {/* Player info (top left) */}
      <div className="hud-player">
        <div className="player-name">{player?.name || 'Player'}</div>
        <div className="player-coords">
          {player ? `(${Math.round(player.position.x)}, ${Math.round(player.position.y)})` : ''}
        </div>
      </div>

      {/* Hotbar (bottom) */}
      <Hotbar />

      {/* Placement preview */}
      <PlacementPreview />

      {/* Inventory panel */}
      <Inventory />

      {/* Tool crafting panel */}
      <ToolCrafting />

      {/* Building menu */}
      <BuildingMenu />

      {/* Construction panel (toggle with C key) */}
      <ConstructionPanelTrigger />

      {/* Controls hint */}
      <div className="hud-controls">
        <span>WASD: Move</span>
        <span>I: Inventory</span>
        <span>B: Build</span>
        <span>C: Construction</span>
        <span>1-0: Hotbar</span>
      </div>
    </div>
  );
}

function getWeatherIcon(weather: string): string {
  switch (weather) {
    case 'rain': return '🌧';
    case 'snow': return '❄';
    case 'storm': return '⛈';
    default: return '';
  }
}
