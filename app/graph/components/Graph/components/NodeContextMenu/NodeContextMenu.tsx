import React, { useEffect, useMemo } from 'react';
import { usePopper } from 'react-popper';
import { useDeepCompareMemo } from 'use-deep-compare';

import { useBoolean } from '@/hooks/useBoolean';
import { FocusLock } from '@/ui/focus-lock';
import { Menu } from '@/ui/menu';
import { Portal } from '@/ui/portal';

import { getPageIdFromBlockIdAndTitle } from '../../../../services/notion';
import { ContextMenuState } from '../../Graph.types';

export const useUpdateEffect: typeof React.useEffect = (effect, deps) => {
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (mounted.current) {
      return effect();
    }
    mounted.current = true;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return mounted.current;
};

interface NodeContextMenuProps extends ContextMenuState {
  toggleNodeCollapsed: (nodeId: string) => void;
  onClose: () => void;
}

export type UseFocusEffectOptions = {
  shouldFocus: boolean;
  preventScroll?: boolean;
};

const isActiveElement = (element: Element) => document.activeElement === element;

interface FocusProps extends FocusOptions {
  isActive?: typeof isActiveElement;
}

export function focus(element: HTMLElement, options: FocusProps = {}) {
  const { isActive = isActiveElement, preventScroll } = options;

  if (isActive(element)) return -1;

  return requestAnimationFrame(() => {
    element.focus({ preventScroll });
  });
}

export function hasFocusWithin(element: Element) {
  if (!document.activeElement) return false;
  return element.contains(document.activeElement);
}

/**
 * React hook to focus an element conditionally
 *
 * @param ref the ref of the element to focus
 * @param options focus management options
 */
export function useFocusEffect<T extends HTMLElement>(
  ref: React.RefObject<T>,
  options: UseFocusEffectOptions
) {
  const { shouldFocus, preventScroll } = options;

  useUpdateEffect(() => {
    const node = ref.current;

    if (!node || !shouldFocus) return;

    if (!hasFocusWithin(node)) {
      focus(node, { preventScroll });
    }
  }, [shouldFocus, ref, preventScroll]);
}

export function NodeContextMenu({
  node,
  toggleNodeCollapsed,
  onClose,
  ...rect
}: NodeContextMenuProps) {
  const [hasMounted, { on: setHasMounted }] = useBoolean();
  const virtualReference = useDeepCompareMemo(
    () => ({
      getBoundingClientRect() {
        return {
          bottom: 0,
          right: 0,
          ...rect
        };
      }
    }),
    [rect]
  );

  const [popperElement, setPopperElement] = React.useState<HTMLDivElement | null>(null);
  const { styles, attributes } = usePopper(virtualReference, popperElement);

  useEffect(() => {
    // Prevent flicker
    setHasMounted();
  }, [setHasMounted]);

  const notionUrl = `https://notion.so/${getPageIdFromBlockIdAndTitle({
    title: node.title,
    id: node.id
  })}`;

  const hasExpanded = false;
  const toggleExpanded = () => {
    toggleNodeCollapsed(node.id);
    onClose();
  };

  return (
    <Portal>
      <FocusLock autoFocus>
        <Menu>
          <Menu.Items
            static
            ref={setPopperElement}
            style={styles.popper}
            {...attributes.popper}
            className={`absolute opacity-${
              hasMounted ? 100 : 0
            } right-0 w-56 mt-2 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg outline-none`}
          >
            <div className="px-4 py-3">
              <p className="text-sm font-medium leading-5 text-gray-900 truncate">{node.title}</p>
            </div>

            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <a
                    href={notionUrl}
                    target="_blank"
                    onClick={onClose}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } flex justify-between w-full px-4 py-2 text-sm leading-5 text-left`}
                  >
                    Open in Notion
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    onClick={toggleExpanded}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } flex justify-between w-full px-4 py-2 text-sm leading-5 text-left cursor-pointer`}
                  >
                    {hasExpanded ? 'Hide' : 'Show'} connected pages
                  </a>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
      </FocusLock>
    </Portal>
  );
}
