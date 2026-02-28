/**
 * StopList.jsx — Ordered stop list with drag-to-reorder.
 *
 * Uses react-beautiful-dnd for reordering. Each item renders
 * a StopItem component with drag handle and delete button.
 */
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import StopItem from './StopItem';

export default function StopList({ stops, onReorder, onDelete }) {
    const handleDragEnd = (result) => {
        if (!result.destination) return;
        if (result.source.index === result.destination.index) return;

        const reordered = Array.from(stops);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);

        // Update positions
        const updated = reordered.map((stop, i) => ({ ...stop, position: i }));
        onReorder(updated);
    };

    if (!stops || stops.length === 0) {
        return (
            <div className="text-center py-8 text-text-muted">
                <p className="text-lg">No stops yet</p>
                <p className="text-sm mt-1 text-text-muted">Chat with the AI to plan your route</p>
            </div>
        );
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stop-list">
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex flex-col gap-2"
                    >
                        {stops.map((stop, index) => (
                            <Draggable
                                key={stop.id || `stop-${index}`}
                                draggableId={String(stop.id || `stop-${index}`)}
                                index={index}
                            >
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                    >
                                        <StopItem
                                            stop={stop}
                                            index={index}
                                            onDelete={onDelete}
                                            dragHandleProps={provided.dragHandleProps}
                                        />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}
