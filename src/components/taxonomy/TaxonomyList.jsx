import React from 'react';
import {
    DndContext,
    closestCenter,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TaxonomyItem } from './TaxonomyItem';

export function TaxonomyList({ items, sensors, onDragEnd, onDelete, onColorChange }) {
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
        >
            <SortableContext
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
            >
                {items.map((item) => (
                    <TaxonomyItem
                        key={item.id}
                        id={item.id}
                        item={item}
                        onDelete={onDelete}
                        onColorChange={onColorChange}
                    />
                ))}
            </SortableContext>
        </DndContext>
    );
}
