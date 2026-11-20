import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';

interface ChapterView {
  chapter: number;
  title: string;
  location: string;
  summary: string;
  openingEvent: string;
  climaxEvent: string | null;
  isCompleted: boolean;
  majorNPCs: { name: string; role: string; description: string }[];
}

interface EndingChoice {
  type: string;
  title: string;
  description: string;
  epilogue: string;
  preparationQuestId: string | null;
  preparationHint: string;
  canChoose: boolean;
  missing: string[];
}

export default function StoryJournalPanel() {
  const { setActivePanel, addNotification, loadCharacter, loadQuests } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<ChapterView[]>([]);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [endingChoices, setEndingChoices] = useState<EndingChoice[]>([]);
  const [currentEnding, setCurrentEnding] = useState<string | null>(null);
  const [seenEndings, setSeenEndings] = useState<string[]>([]);
  const [preparationAvailable, setPreparationAvailable] = useState(false);
  const [viewedEnding, setViewedEnding] = useState<EndingChoice | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);

  async function fetchStory(showLoading = true) {
    try {
      if (showLoading) setLoading(true);
      const res = await gameApi.getStoryChapters();
      if (res.success && res.data) {
        setChapters(res.data.chapters || []);
        setEndingChoices(res.data.endingChoices || []);
        setCurrentEnding(res.data.currentEnding || null);
        setSeenEndings(res.data.seenEndings || []);
        setPreparationAvailable(Boolean(res.data.preparationAvailable));
      }
    } catch {
      addNotification('Không thể tải nhật ký cốt truyện', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    void fetchStory();
    return () => previousFocus?.focus();
  }, []);

  async function handleChooseEnding(choice: EndingChoice) {
    if (!choice.canChoose || actionLoading) return;
    try {
      setActionLoading(true);
      const res = await gameApi.chooseStoryEnding(choice.type);
      if (res.success) {
        setViewedEnding(choice);
        addNotification(res.message || `Đã xem kết cục ${choice.title}`, 'success');
        await Promise.all([fetchStory(false), loadCharacter()]);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Chưa thể chọn kết cục', 'error');
      await fetchStory(false);
    } finally {
      setActionLoading(false);
    }
  }

  const currentChapter = chapters.find((chapter) => chapter.chapter === selectedChapter) || chapters[chapters.length - 1];
  const chosenEnding = endingChoices.find((choice) => choice.type === currentEnding);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') { setActivePanel(null); return; }
    if (event.key !== 'Tab' || !dialog.current) return;
    const controls = Array.from(dialog.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    if (controls.length === 0) return;
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
    else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0, 0, 0, 0.78)', display: 'grid', placeItems: 'center' }}>
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-title"
        onKeyDown={handleDialogKeyDown}
        style={{ width: 'min(940px, 94vw)', maxHeight: '88vh', background: '#0d131d', border: '2px solid #c5a059', borderRadius: 12, color: '#e0e0e0', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,.6)' }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '18px 20px', borderBottom: '1px solid #37474f' }}>
          <div>
            <h2 id="story-title" style={{ margin: 0, color: '#ffd700', fontSize: '1.3rem' }}>Thiên Thư Sử Ký</h2>
            <p style={{ margin: '4px 0 0', color: '#b0bec5', fontSize: '.85rem' }}>Tám chương Thiên Khế · Những ký ức đã mở có thể đọc lại</p>
            {chosenEnding && <p style={{ margin: '4px 0 0', color: '#a5d6a7', fontSize: '.78rem' }}>Kết cục đã lưu: {chosenEnding.title}</p>}
          </div>
          <button ref={closeButton} type="button" onClick={() => setActivePanel(null)} aria-label="Đóng Thiên Thư Sử Ký" style={{ background: 'transparent', color: '#fff', border: '1px solid #607d8b', borderRadius: 6, fontSize: '1.1rem', cursor: 'pointer', padding: '4px 10px' }}>✕</button>
        </header>

        {loading ? <p role="status" style={{ padding: 24 }}>Đang mở Thiên Thư...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 205px) minmax(0, 1fr)', gap: 14, padding: 16, minHeight: 0, overflowY: 'auto' }}>
            <nav aria-label="Chương truyện đã mở" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {chapters.map((chapter) => (
                <button
                  key={chapter.chapter}
                  type="button"
                  onClick={() => { setSelectedChapter(chapter.chapter); setViewedEnding(null); }}
                  aria-current={currentChapter?.chapter === chapter.chapter ? 'page' : undefined}
                  style={{ textAlign: 'left', cursor: 'pointer', background: currentChapter?.chapter === chapter.chapter ? '#334155' : '#17212e', color: '#e0e0e0', border: currentChapter?.chapter === chapter.chapter ? '2px solid #ffd700' : '1px solid #455a64', borderRadius: 6, padding: '9px 10px' }}
                >
                  <strong>Chương {chapter.chapter}</strong><br />
                  <span style={{ fontSize: '.77rem' }}>{chapter.location}</span><br />
                  <span style={{ color: chapter.isCompleted ? '#a5d6a7' : '#b0bec5', fontSize: '.72rem' }}>{chapter.isCompleted ? 'Đã hoàn thành' : 'Đang mở'}</span>
                </button>
              ))}
            </nav>

            {currentChapter && (
              <article style={{ background: '#131b26', border: '1px solid #37474f', borderRadius: 8, padding: '15px 18px', minWidth: 0 }}>
                <h3 style={{ margin: '0 0 4px', color: '#ffd700', fontSize: '1.1rem' }}>{currentChapter.title}</h3>
                <p style={{ margin: '0 0 12px', color: '#90caf9', fontSize: '.8rem' }}>{currentChapter.location}</p>
                <p style={{ lineHeight: 1.5, fontSize: '.86rem' }}>{currentChapter.summary}</p>
                <h4 style={{ margin: '16px 0 4px', color: '#ffcc80' }}>Khởi sự</h4>
                <p style={{ margin: 0, lineHeight: 1.5, fontSize: '.84rem' }}>{currentChapter.openingEvent}</p>
                <h4 style={{ margin: '16px 0 4px', color: '#ffab91' }}>Hồi kết chương</h4>
                <p style={{ margin: 0, lineHeight: 1.5, fontSize: '.84rem' }}>{currentChapter.climaxEvent || 'Hoàn thành nhiệm vụ cuối chương để ghi lại hồi kết.'}</p>
                <h4 style={{ margin: '16px 0 4px', color: '#b2dfdb' }}>Người trong truyện</h4>
                <ul style={{ margin: '0 0 14px', paddingLeft: 20, lineHeight: 1.5, fontSize: '.82rem' }}>
                  {currentChapter.majorNPCs.map((npc) => <li key={npc.name}><strong>{npc.name}</strong> ({npc.role}): {npc.description}</li>)}
                </ul>

                {currentChapter.chapter === 8 && (
                  <section aria-labelledby="endings-title" style={{ borderTop: '1px solid #455a64', paddingTop: 12 }}>
                    <h4 id="endings-title" style={{ margin: '0 0 6px', color: '#ffd700' }}>Ba kết cục Thiên Khế</h4>
                    <p style={{ color: '#b0bec5', fontSize: '.8rem', margin: '0 0 10px' }}>Kết cục chỉ mở sau khi giao nhiệm vụ cuối. Nhiệm vụ hồi tưởng có thể làm sau trận cuối nếu còn thiếu chuẩn bị.</p>
                    <div style={{ display: 'grid', gap: 9 }}>
                      {endingChoices.map((choice) => (
                        <div key={choice.type} style={{ background: '#1e293b', border: currentEnding === choice.type ? '2px solid #ffd700' : '1px solid #455a64', borderRadius: 7, padding: 11 }}>
                          <strong style={{ color: '#ffd700' }}>{choice.title}</strong>
                          {seenEndings.includes(choice.type) && <span style={{ color: '#a5d6a7', marginLeft: 8, fontSize: '.75rem' }}>Đã xem</span>}
                          <p style={{ lineHeight: 1.45, fontSize: '.81rem', margin: '5px 0' }}>{choice.description}</p>
                          {choice.missing.length > 0 && <ul style={{ margin: '7px 0', paddingLeft: 20, color: '#ffcc80', fontSize: '.77rem' }}>{choice.missing.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button type="button" disabled={!choice.canChoose || actionLoading} onClick={() => void handleChooseEnding(choice)} style={{ background: choice.canChoose ? '#c5a059' : '#455a64', color: choice.canChoose ? '#161616' : '#e0e0e0', border: 0, borderRadius: 5, padding: '7px 11px', fontWeight: 700, cursor: choice.canChoose ? 'pointer' : 'not-allowed' }}>
                              {seenEndings.includes(choice.type) ? 'Xem lại kết cục' : 'Chọn kết cục'}
                            </button>
                            {!choice.canChoose && choice.preparationQuestId && preparationAvailable && <button type="button" onClick={() => { void loadQuests(); setActivePanel('quest'); }} style={{ background: '#263238', color: '#fff', border: '1px solid #78909c', borderRadius: 5, padding: '7px 11px', cursor: 'pointer' }}>Mở nhiệm vụ hồi tưởng</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {viewedEnding && (
                      <div role="status" style={{ background: '#263238', border: '1px solid #81c784', borderRadius: 7, marginTop: 12, padding: 12 }}>
                        <h5 style={{ margin: '0 0 6px', color: '#a5d6a7', fontSize: '.95rem' }}>{viewedEnding.title}</h5>
                        <p style={{ lineHeight: 1.5, fontSize: '.84rem' }}>{viewedEnding.epilogue}</p>
                        <button type="button" onClick={() => setActivePanel(null)} style={{ background: '#81c784', border: 0, borderRadius: 5, padding: '7px 11px', cursor: 'pointer', fontWeight: 700 }}>Tiếp tục tu luyện</button>
                      </div>
                    )}
                    {!viewedEnding && chosenEnding && <p style={{ color: '#a5d6a7', fontSize: '.8rem' }}>Kết cục gần nhất: {chosenEnding.title}. Chọn “Xem lại kết cục” để đọc hoạt cảnh.</p>}
                  </section>
                )}
              </article>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
