import { RoomStatus as RoomState } from '../lib/statuses.generated';
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { APIRoom } from '../lib/api';
import { RoomOperationDialog } from './RoomOperationDialog';
import { RoomStateEditor } from './RoomStateEditor';

export function RoomCleaning({ room, onClose, onSaved }: {room: APIRoom; onClose: () => void; onSaved: () => Promise<void>}) {
  const [busy,setBusy]=useState(false);
  return <RoomOperationDialog title="Temizlik kaydı" subtitle={`Oda ${room.code}`} icon={Sparkles} busy={busy} onClose={onClose}>
    <RoomStateEditor room={room} allowedStatuses={[RoomState.Clean]} initialStatus="Temiz" onClose={onClose} onSaved={onSaved} onBusyChange={setBusy}/>
  </RoomOperationDialog>;
}
