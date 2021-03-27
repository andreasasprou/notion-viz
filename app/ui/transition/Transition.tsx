import React, {
  createContext,
  ElementType,
  Fragment,
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { useId } from '@/hooks/useId';
import { useIsInitialRender } from '@/hooks/useIsInitialRender';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsoMorphicEffect } from '@/hooks/useIsoMorphicEffect';
import { Features, match, PropsForFeatures, render, RenderStrategy } from '@/shared';
import { Props } from '@/types';

import { Reason, transition } from './Transition.utils';

type ID = ReturnType<typeof useId>;

function useSplitClasses(classes = '') {
  return useMemo(() => classes.split(' ').filter((className) => className.trim().length > 1), [
    classes
  ]);
}

interface TransitionContextValues {
  show: boolean;
  appear: boolean;
}
const TransitionContext = createContext<TransitionContextValues | null>(null);
TransitionContext.displayName = 'TransitionContext';

enum TreeStates {
  Visible = 'visible',
  Hidden = 'hidden'
}

export interface TransitionClasses {
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
}

export interface TransitionEvents {
  beforeEnter?: () => void;
  afterEnter?: () => void;
  beforeLeave?: () => void;
  afterLeave?: () => void;
}

type TransitionChildProps<TTag> = Props<TTag, TransitionChildRenderPropArg> &
  PropsForFeatures<typeof TransitionChildRenderFeatures> &
  TransitionClasses &
  TransitionEvents & { appear?: boolean };

function useTransitionContext() {
  const context = useContext(TransitionContext);

  if (context === null) {
    throw new Error('A <Transition.Child /> is used but it is missing a parent <Transition />.');
  }

  return context;
}

function useParentNesting() {
  const context = useContext(NestingContext);

  if (context === null) {
    throw new Error('A <Transition.Child /> is used but it is missing a parent <Transition />.');
  }

  return context;
}

interface NestingContextValues {
  children: MutableRefObject<{ id: ID; state: TreeStates }[]>;
  register: (id: ID) => () => void;
  unregister: (id: ID, strategy?: RenderStrategy) => void;
}

const NestingContext = createContext<NestingContextValues | null>(null);
NestingContext.displayName = 'NestingContext';

function hasChildren(
  bag: NestingContextValues['children'] | { children: NestingContextValues['children'] }
): boolean {
  if ('children' in bag) return hasChildren(bag.children);
  return bag.current.filter(({ state }) => state === TreeStates.Visible).length > 0;
}

function useNesting(done?: () => void) {
  const doneRef = useRef(done);
  const transitionableChildren = useRef<NestingContextValues['children']['current']>([]);
  const mounted = useIsMounted();

  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  const unregister = useCallback(
    (childId: ID, strategy = RenderStrategy.Hidden) => {
      const idx = transitionableChildren.current.findIndex(({ id }) => id === childId);
      if (idx === -1) return;

      match(strategy, {
        [RenderStrategy.Unmount]() {
          transitionableChildren.current.splice(idx, 1);
        },
        [RenderStrategy.Hidden]() {
          transitionableChildren.current[idx].state = TreeStates.Hidden;
        }
      });

      if (!hasChildren(transitionableChildren) && mounted.current) {
        doneRef.current?.();
      }
    },
    [doneRef, mounted, transitionableChildren]
  );

  const register = useCallback(
    (childId: ID) => {
      const child = transitionableChildren.current.find(({ id }) => id === childId);
      if (!child) {
        transitionableChildren.current.push({ id: childId, state: TreeStates.Visible });
      } else if (child.state !== TreeStates.Visible) {
        child.state = TreeStates.Visible;
      }

      return () => unregister(childId, RenderStrategy.Unmount);
    },
    [transitionableChildren, unregister]
  );

  return useMemo(
    () => ({
      children: transitionableChildren,
      register,
      unregister
    }),
    [register, unregister, transitionableChildren]
  );
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}
const eventNames: (keyof TransitionEvents)[] = [
  'beforeEnter',
  'afterEnter',
  'beforeLeave',
  'afterLeave'
];
function ensureEventHooksExist(events: TransitionEvents) {
  return eventNames.reduce((all, eventName) => {
    all[eventName] = events[eventName] || noop;
    return all;
  }, {} as Record<keyof TransitionEvents, () => void>);
}

function useEvents(events: TransitionEvents) {
  const eventsRef = useRef(ensureEventHooksExist(events));

  useEffect(() => {
    eventsRef.current = ensureEventHooksExist(events);
  }, [events]);

  return eventsRef;
}

// ---

const DEFAULT_TRANSITION_CHILD_TAG = 'div' as const;
type TransitionChildRenderPropArg = MutableRefObject<HTMLDivElement>;
const TransitionChildRenderFeatures = Features.RenderStrategy;

function TransitionChild<TTag extends ElementType = typeof DEFAULT_TRANSITION_CHILD_TAG>(
  props: TransitionChildProps<TTag>
) {
  const {
    // Event "handlers"
    beforeEnter,
    afterEnter,
    beforeLeave,
    afterLeave,

    // Class names
    enter,
    enterFrom,
    enterTo,
    leave,
    leaveFrom,
    leaveTo,

    ...rest
  } = props as typeof props;
  const container = useRef<HTMLElement | null>(null);
  const [state, setState] = useState(TreeStates.Visible);
  const strategy = rest.unmount ? RenderStrategy.Unmount : RenderStrategy.Hidden;

  const { show, appear } = useTransitionContext();
  const { register, unregister } = useParentNesting();

  const initial = useIsInitialRender();
  const id = useId();

  const isTransitioning = useRef(false);

  const nesting = useNesting(() => {
    // When all children have been unmounted we can only hide ourselves if and only if we are not
    // transitioning ourserlves. Otherwise we would unmount before the transitions are finished.
    if (!isTransitioning.current) {
      setState(TreeStates.Hidden);
      unregister(id);
      events.current.afterLeave();
    }
  });

  useIsoMorphicEffect(() => {
    if (!id) return;
    return register(id);
  }, [register, id]);

  useIsoMorphicEffect(() => {
    // If we are in another mode than the Hidden mode then ignore
    if (strategy !== RenderStrategy.Hidden) return;
    if (!id) return;

    // Make sure that we are visible
    if (show && state !== TreeStates.Visible) {
      setState(TreeStates.Visible);
      return;
    }

    match(state, {
      [TreeStates.Hidden]: () => unregister(id),
      [TreeStates.Visible]: () => register(id)
    });
  }, [state, id, register, unregister, show, strategy]);

  const enterClasses = useSplitClasses(enter);
  const enterFromClasses = useSplitClasses(enterFrom);
  const enterToClasses = useSplitClasses(enterTo);

  const leaveClasses = useSplitClasses(leave);
  const leaveFromClasses = useSplitClasses(leaveFrom);
  const leaveToClasses = useSplitClasses(leaveTo);

  const events = useEvents({ beforeEnter, afterEnter, beforeLeave, afterLeave });

  useEffect(() => {
    if (state === TreeStates.Visible && container.current === null) {
      throw new Error('Did you forget to passthrough the `ref` to the actual DOM node?');
    }
  }, [container, state]);

  // Skipping initial transition
  const skip = initial && !appear;

  useIsoMorphicEffect(() => {
    const node = container.current;
    if (!node) return;
    if (skip) return;

    isTransitioning.current = true;

    if (show) events.current.beforeEnter();
    if (!show) events.current.beforeLeave();

    return show
      ? transition(node, enterClasses, enterFromClasses, enterToClasses, (reason) => {
          isTransitioning.current = false;
          if (reason === Reason.Finished) events.current.afterEnter();
        })
      : transition(node, leaveClasses, leaveFromClasses, leaveToClasses, (reason) => {
          isTransitioning.current = false;

          if (reason !== Reason.Finished) return;

          // When we don't have children anymore we can safely unregister from the parent and hide
          // ourselves.
          if (!hasChildren(nesting)) {
            setState(TreeStates.Hidden);
            unregister(id);
            events.current.afterLeave();
          }
        });
  }, [
    events,
    id,
    isTransitioning,
    unregister,
    nesting,
    container,
    skip,
    show,
    enterClasses,
    enterFromClasses,
    enterToClasses,
    leaveClasses,
    leaveFromClasses,
    leaveToClasses
  ]);

  const propsBag = {};
  const propsWeControl = { ref: container };
  const passthroughProps = rest;

  return (
    <NestingContext.Provider value={nesting}>
      {render(
        { ...passthroughProps, ...propsWeControl },
        propsBag,
        DEFAULT_TRANSITION_CHILD_TAG,
        TransitionChildRenderFeatures,
        state === TreeStates.Visible
      )}
    </NestingContext.Provider>
  );
}

export function Transition<TTag extends ElementType = typeof DEFAULT_TRANSITION_CHILD_TAG>(
  props: TransitionChildProps<TTag> & { show: boolean; appear?: boolean }
) {
  const { show, appear = false, unmount, ...passthroughProps } = props as typeof props;

  if (![true, false].includes(show)) {
    throw new Error('A Transition is used but it is missing a `show={true | false}` prop.');
  }

  const [state, setState] = useState(show ? TreeStates.Visible : TreeStates.Hidden);

  const nestingBag = useNesting(() => {
    setState(TreeStates.Hidden);
  });

  const initial = useIsInitialRender();
  const transitionBag = useMemo<TransitionContextValues>(
    () => ({ show, appear: appear || !initial }),
    [show, appear, initial]
  );

  useEffect(() => {
    if (show) {
      setState(TreeStates.Visible);
    } else if (!hasChildren(nestingBag)) {
      setState(TreeStates.Hidden);
    }
  }, [show, nestingBag]);

  const sharedProps = { unmount };
  const propsBag = {};

  return (
    <NestingContext.Provider value={nestingBag}>
      <TransitionContext.Provider value={transitionBag}>
        {render(
          {
            ...sharedProps,
            as: Fragment,
            children: <TransitionChild {...(sharedProps as any)} {...passthroughProps} />
          },
          propsBag,
          Fragment,
          TransitionChildRenderFeatures,
          state === TreeStates.Visible
        )}
      </TransitionContext.Provider>
    </NestingContext.Provider>
  );
}

Transition.Child = TransitionChild;
