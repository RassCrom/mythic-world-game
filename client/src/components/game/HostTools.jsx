import React from 'react';
import { useI18n } from '../../i18n/index.jsx';

export function hostToolsNeeded(view) {
  return view.status === 'playing' && view.players.some((player) => !player.connected);
}

export function HostTools({ send }) {
  const { t } = useI18n();
  return (
    <details className="host-tools">
      <summary className="btn btn-ghost btn-sm">{t('Host tools')}</summary>
      <div className="host-tools-menu">
        <button className="btn btn-sm" onClick={() => send({ type: 'forceChoice' })}>{t('Auto-resolve stuck choice')}</button>
        <button className="btn btn-sm" onClick={() => send({ type: 'forcePass' })}>{t('Pass for disconnected')}</button>
        <button className="btn btn-sm" onClick={() => send({ type: 'forceEndTurn' })}>{t('Skip disconnected turn')}</button>
      </div>
    </details>
  );
}
