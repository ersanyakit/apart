import React, { useState } from 'react';
import { RoomCard } from './RoomCard';
import { Room } from '../types';

interface RoomGridProps {
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  selectedRoom: string | null;
  handleContextMenu: (e: React.MouseEvent, roomId: string) => void;
  onSwap?: (sourceRoom: Room, targetRoom: Room) => void;
}

export const RoomGrid: React.FC<RoomGridProps> = ({ rooms, setRooms, selectedRoom, handleContextMenu, onSwap }) => {
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);

  const handleDragStart = (roomId: string) => {
    setDraggedRoomId(roomId);
  };

  const handleDrop = (targetRoomId: string) => {
    if (!draggedRoomId || draggedRoomId === targetRoomId) return;

    const updatedRooms = [...rooms];
    const sourceIdx = updatedRooms.findIndex(r => r.id === draggedRoomId);
    const targetIdx = updatedRooms.findIndex(r => r.id === targetRoomId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const sourceRoom = updatedRooms[sourceIdx];
      const targetRoom = updatedRooms[targetIdx];

      // Swap content while keeping physical properties (id, number, type)
      const newSource = {
        ...sourceRoom,
        name: targetRoom.name,
        status: targetRoom.status,
        checkIn: targetRoom.checkIn,
        checkOut: targetRoom.checkOut
      };

      const newTarget = {
        ...targetRoom,
        name: sourceRoom.name,
        status: sourceRoom.status,
        checkIn: sourceRoom.checkIn,
        checkOut: sourceRoom.checkOut
      };

      updatedRooms[sourceIdx] = newSource;
      updatedRooms[targetIdx] = newTarget;

      setRooms(updatedRooms);
      onSwap?.(sourceRoom, targetRoom);
    }

    setDraggedRoomId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-6">
        {rooms.map((room, idx) => (
          <RoomCard
            key={room.id}
            room={room}
            index={idx}
            isSelected={selectedRoom === room.id}
            onContextMenu={(e) => handleContextMenu(e, room.id)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
};
