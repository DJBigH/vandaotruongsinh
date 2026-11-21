import { useEffect } from 'react';
import { eventBridge } from '../../game/EventBridge';
import { useGameStore } from '../../stores/gameStore';
import { MENU_ENTRIES, MENU_GROUPS, QUICK_PANELS } from './menuShortcuts';

export default function GameMenu() {
  const expanded = useGameStore((state) => state.menuOpen);
  const setExpanded = useGameStore((state) => state.setMenuOpen);
  const activePanel = useGameStore((state) => state.activePanel);
  const dialogueOpen = useGameStore((state) => Boolean(state.dialogueState?.isOpen));
  const setActivePanel = useGameStore((state) => state.setActivePanel);

  useEffect(() => {
    const toggle = () => { const state = useGameStore.getState(); state.setMenuOpen(!state.menuOpen); };
    const close = () => setExpanded(false);
    eventBridge.on('menuToggle', toggle);
    eventBridge.on('menuClose', close);
    return () => {
      eventBridge.off('menuToggle', toggle);
      eventBridge.off('menuClose', close);
      setExpanded(false);
    };
  }, [setExpanded]);

  if (dialogueOpen) return null;

  const openPanel = (panel: NonNullable<typeof activePanel>) => {
    setActivePanel(panel);
    setExpanded(false);
  };

  return (
    <nav className="game-menu" aria-label="Điều hướng trong game">
      {expanded && (
        <div className="game-menu-sheet" id="game-system-menu">
          <header className="game-menu-header">
            <div><small>VẠN ĐẠO TRƯỜNG SINH</small><strong>Hành trang tu đạo</strong></div>
            <button type="button" onClick={() => setExpanded(false)} aria-label="Đóng menu">×</button>
          </header>
          <div className="game-menu-groups">
            {MENU_GROUPS.map((group) => (
              <section key={group.title} aria-label={group.title}>
                <h3>{group.title}</h3>
                {group.entries.map((entry) => (
                  <button
                    id={entry.panel === 'disciple' ? 'disciple-menu-button' : undefined}
                    key={entry.panel}
                    type="button"
                    className={activePanel === entry.panel ? 'active' : ''}
                    aria-current={activePanel === entry.panel ? 'page' : undefined}
                    onClick={() => openPanel(entry.panel)}
                  >
                    <span className="game-menu-entry-label"><img src={`/assets/v120/icon_menu_${entry.panel}.png`}
                      width="32" height="32" alt="" loading="lazy" />{entry.label}</span><kbd>{entry.key}</kbd>
                  </button>
                ))}
              </section>
            ))}
          </div>
          <p className="game-menu-hint">Nhấn phím hiển thị bên cạnh để mở nhanh · Esc để đóng</p>
        </div>
      )}
      <div className="game-menu-dock">
        {QUICK_PANELS.map((panel) => {
          const entry = MENU_ENTRIES.find((item) => item.panel === panel)!;
          return <button key={panel} type="button" aria-label={`${entry.label} (${entry.key})`}
            title={`${entry.label} · ${entry.key}`} aria-pressed={activePanel === panel}
            onClick={() => openPanel(panel)}><img src={`/assets/v120/icon_menu_${panel}.png`} width="28" height="28" alt="" />
              <span>{entry.label}</span><kbd>{entry.key}</kbd></button>;
        })}
        <button id="game-menu-toggle" className="game-menu-toggle" type="button" aria-expanded={expanded}
          aria-controls="game-system-menu" aria-label={expanded ? 'Đóng menu' : 'Mở menu'}
          title="Menu · Q" onClick={() => setExpanded(!expanded)}>
          <span>{expanded ? 'Đóng' : 'Menu'}</span><kbd>Q</kbd>
        </button>
      </div>
    </nav>
  );
}
