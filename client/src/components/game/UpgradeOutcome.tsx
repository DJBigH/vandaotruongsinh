import { createPortal } from 'react-dom';
import { usePresentationSettings } from '../../game/exploration/settings';

type Subject = 'equipment' | 'mount' | 'realm';

export default function UpgradeOutcome({ subject, success, title, message, avatar, onClose }: {
  subject: Subject; success: boolean; title: string; message: string; avatar?: string; onClose: () => void;
}) {
  const reduced = usePresentationSettings((state) => state.reducedEffects);
  return createPortal(<div className={`upgrade-outcome ${success ? 'is-success' : 'is-failure'} ${reduced ? 'reduced' : ''}`}
    role="dialog" aria-modal="true" aria-label={title}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className="upgrade-outcome-card">
      {avatar && <img className="upgrade-outcome-avatar" src={avatar} width="96" height="96" alt="" />}
      <div className="upgrade-outcome-sprite" aria-hidden="true" style={{
        backgroundImage: `url(/assets/v130/vfx_upgrade_${subject}_${success ? 'success' : 'failure'}.png)`,
      }} />
      <h2>{title}</h2><p>{message}</p>
      <button type="button" autoFocus onClick={onClose}>Tiếp tục</button>
    </div>
  </div>, document.body);
}
