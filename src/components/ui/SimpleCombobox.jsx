import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Input } from './input';

export function SimpleCombobox({
    value,
    onChange,
    options = [],
    placeholder = "Select...",
    allowCreate = false,
    className
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Sync internal query with value when value changes externally
    useEffect(() => {
        // If we are open, we assume the user is typing, so don't override.
        // If we are closed and the value changed, sync the query.
        if (!isOpen) {
            setQuery(value || '');
        }
    }, [value, isOpen]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                // On close, revert query to selected value if nothing was selected/created
                if (value && query !== value) {
                    setQuery(value);
                } else if (!value) {
                    setQuery('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, query]);

    const isGrouped = options.length > 0 && typeof options[0] === 'object' && options[0].label;

    const filteredOptions = useMemo(() => {
        if (!query) return options;
        const lowerQuery = query.toLowerCase();

        if (isGrouped) {
            return options.map(group => ({
                ...group,
                options: group.options.filter(opt => opt.toLowerCase().includes(lowerQuery))
            })).filter(group => group.options.length > 0);
        }

        return options.filter(opt => opt.toLowerCase().includes(lowerQuery));
    }, [options, query, isGrouped]);

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        setIsOpen(true);
    };

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setQuery(optionValue);
        setIsOpen(false);
    };

    const handleCreate = () => {
        if (allowCreate && query.trim()) {
            handleSelect(query.trim());
        }
    };

    const allOptions = isGrouped ? options.flatMap(g => g.options) : options;
    const exactMatch = allOptions.some(opt => opt.toLowerCase() === query.trim().toLowerCase());
    const showCreate = allowCreate && query.trim() && !exactMatch;

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div className="relative">
                <Input
                    ref={inputRef}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="pr-8"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-8 text-muted-foreground hover:bg-transparent"
                    onClick={() => {
                        if (value) {
                            onChange('');
                            setQuery('');
                            setIsOpen(false);
                        } else {
                            if (isOpen) {
                                setIsOpen(false);
                            } else {
                                setIsOpen(true);
                                inputRef.current?.focus();
                            }
                        }
                    }}
                >
                    {value ? <X className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
                </Button>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md animate-in fade-in-0 zoom-in-95 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length === 0 && !showCreate && (
                            <p className="p-2 text-sm text-muted-foreground text-center">No options found.</p>
                        )}

                        {isGrouped ? (
                            filteredOptions.map((group) => (
                                <div key={group.label}>
                                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                                        {group.label}
                                    </div>
                                    {group.options.map((option) => (
                                        <div
                                            key={option}
                                            className={cn(
                                                "flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                                value === option && "bg-accent text-accent-foreground font-medium"
                                            )}
                                            onClick={() => handleSelect(option)}
                                        >
                                            <span>{option}</span>
                                            {value === option && <Check className="h-4 w-4" />}
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option}
                                    className={cn(
                                        "flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                        value === option && "bg-accent text-accent-foreground font-medium"
                                    )}
                                    onClick={() => handleSelect(option)}
                                >
                                    <span>{option}</span>
                                    {value === option && <Check className="h-4 w-4" />}
                                </div>
                            ))
                        )}

                        {showCreate && (
                            <div
                                className="flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-primary font-medium border-t mt-1"
                                onClick={handleCreate}
                            >
                                <Plus className="h-3 w-3 mr-2" />
                                Create "{query}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
