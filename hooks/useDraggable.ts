import React, { useState, useEffect, useCallback, useRef, RefObject } from 'react';

export interface Position {
  x: number;
  y: number;
}

export interface DraggableOptions {
  /** Initial position if no saved position exists */
  initialPosition?: Position;
  /** localStorage key for persisting position */
  storageKey?: string;
  /** Fixed dimensions for boundary calculation */
  dimensions: { width: number; height: number };
  /** Minimum margin from screen edges */
  edgeMargin?: number;
}

interface DraggableState {
  position: Position;
  isDragging: boolean;
}

interface DraggableReturn {
  /** Current position */
  position: Position;
  /** Whether currently being dragged */
  isDragging: boolean;
  /** Ref to attach to the draggable element */
  elementRef: RefObject<HTMLDivElement | null>;
  /** Event handler for drag handle's onMouseDown */
  handleMouseDown: (e: React.MouseEvent) => void;
  /** CSS style object for the draggable element */
  style: React.CSSProperties;
}

/**
 * Constrains a position to keep the element within viewport bounds.
 */
function constrainToViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  margin: number
): Position {
  const maxX = window.innerWidth - width - margin;
  const maxY = window.innerHeight - height - margin;
  return {
    x: Math.max(margin, Math.min(x, maxX)),
    y: Math.max(margin, Math.min(y, maxY)),
  };
}

/**
 * Loads position from localStorage.
 */
function loadPosition(key: string): Position | null {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const pos = JSON.parse(saved) as Position;
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        return pos;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Saves position to localStorage.
 */
function savePosition(key: string, pos: Position): void {
  try {
    localStorage.setItem(key, JSON.stringify(pos));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Custom hook for making elements draggable with:
 * - Smooth DOM-based dragging (no React re-renders during drag)
 * - Position persistence to localStorage
 * - Viewport boundary constraints
 * - Proper cursor feedback
 */
export function useDraggable(options: DraggableOptions): DraggableReturn {
  const {
    initialPosition = { x: 16, y: 16 },
    storageKey,
    dimensions,
    edgeMargin = 0,
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);

  // Initialize position from storage or default
  const [state, setState] = useState<DraggableState>(() => {
    let startPos = initialPosition;
    if (storageKey) {
      const saved = loadPosition(storageKey);
      if (saved) {
        startPos = saved;
      }
    }
    // Ensure initial position is within bounds
    const constrained = constrainToViewport(
      startPos.x,
      startPos.y,
      dimensions.width,
      dimensions.height,
      edgeMargin
    );
    return { position: constrained, isDragging: false };
  });

  // Handle window resize - re-constrain position
  useEffect(() => {
    const handleResize = () => {
      setState(prev => ({
        ...prev,
        position: constrainToViewport(
          prev.position.x,
          prev.position.y,
          dimensions.width,
          dimensions.height,
          edgeMargin
        ),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dimensions.width, dimensions.height, edgeMargin]);

  // Mouse down handler for drag initiation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    e.preventDefault();

    const element = elementRef.current;
    if (!element) return;

    // Capture starting positions
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    // Use getBoundingClientRect() for accurate position with position:fixed elements
    // offsetLeft/offsetTop are relative to offsetParent and unreliable for fixed positioning
    const rect = element.getBoundingClientRect();
    const startElementX = rect.left;
    const startElementY = rect.top;

    // Mark as dragging
    setState(prev => ({ ...prev, isDragging: true }));

    // Add dragging class to body for global cursor
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;

      const newPos = constrainToViewport(
        startElementX + deltaX,
        startElementY + deltaY,
        dimensions.width,
        dimensions.height,
        edgeMargin
      );

      // Direct DOM manipulation for smooth dragging
      element.style.left = `${newPos.x}px`;
      element.style.top = `${newPos.y}px`;
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      // Clean up event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Reset cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Calculate final position
      const deltaX = upEvent.clientX - startMouseX;
      const deltaY = upEvent.clientY - startMouseY;
      const finalPos = constrainToViewport(
        startElementX + deltaX,
        startElementY + deltaY,
        dimensions.width,
        dimensions.height,
        edgeMargin
      );

      // Sync to React state and persist
      setState({ position: finalPos, isDragging: false });
      if (storageKey) {
        savePosition(storageKey, finalPos);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dimensions.width, dimensions.height, edgeMargin, storageKey]);

  // Style object for the draggable element
  const style: React.CSSProperties = {
    position: 'fixed',
    left: state.position.x,
    top: state.position.y,
    willChange: state.isDragging ? 'left, top' : 'auto',
  };

  return {
    position: state.position,
    isDragging: state.isDragging,
    elementRef,
    handleMouseDown,
    style,
  };
}
