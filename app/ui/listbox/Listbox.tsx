import React, {
  createContext,
  createRef,
  // Types
  Dispatch,
  ElementType,
  Fragment,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  Ref,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef
} from 'react';

import { useComputed } from '@/hooks/useComputed';
import { useDisposables } from '@/hooks/useDisposables';
import { useId } from '@/hooks/useId';
import { useIsoMorphicEffect } from '@/hooks/useIsoMorphicEffect';
import { useSyncRefs } from '@/hooks/useSyncRefs';
import {
  calculateActiveIndex,
  disposables,
  Features,
  Focus,
  forwardRefWithAs,
  isDisabledReactIssue7711,
  Keys,
  match,
  PropsForFeatures,
  render,
  resolvePropValue
} from '@/shared';
import { Props } from '@/types';

enum ListboxStates {
  Open,
  Closed
}

type ListboxOptionDataRef = MutableRefObject<{
  textValue?: string;
  disabled: boolean;
  value: unknown;
}>;

interface StateDefinition {
  listboxState: ListboxStates;
  propsRef: MutableRefObject<{ value: unknown; onChange(value: unknown): void }>;
  labelRef: MutableRefObject<HTMLLabelElement | null>;
  buttonRef: MutableRefObject<HTMLButtonElement | null>;
  optionsRef: MutableRefObject<HTMLUListElement | null>;
  disabled: boolean;
  options: { id: string; dataRef: ListboxOptionDataRef }[];
  searchQuery: string;
  activeOptionIndex: number | null;
}

enum ActionTypes {
  OpenListbox,
  CloseListbox,

  SetDisabled,

  GoToOption,
  Search,
  ClearSearch,

  RegisterOption,
  UnregisterOption
}

type Actions =
  | { type: ActionTypes.CloseListbox }
  | { type: ActionTypes.OpenListbox }
  | { type: ActionTypes.SetDisabled; disabled: boolean }
  | { type: ActionTypes.GoToOption; focus: Focus.Specific; id: string }
  | { type: ActionTypes.GoToOption; focus: Exclude<Focus, Focus.Specific> }
  | { type: ActionTypes.Search; value: string }
  | { type: ActionTypes.ClearSearch }
  | { type: ActionTypes.RegisterOption; id: string; dataRef: ListboxOptionDataRef }
  | { type: ActionTypes.UnregisterOption; id: string };

const reducers: {
  [P in ActionTypes]: (
    state: StateDefinition,
    action: Extract<Actions, { type: P }>
  ) => StateDefinition;
} = {
  [ActionTypes.CloseListbox](state) {
    if (state.disabled) return state;
    if (state.listboxState === ListboxStates.Closed) return state;
    return { ...state, activeOptionIndex: null, listboxState: ListboxStates.Closed };
  },
  [ActionTypes.OpenListbox](state) {
    if (state.disabled) return state;
    if (state.listboxState === ListboxStates.Open) return state;
    return { ...state, listboxState: ListboxStates.Open };
  },
  [ActionTypes.SetDisabled](state, action) {
    if (state.disabled === action.disabled) return state;
    return { ...state, disabled: action.disabled };
  },
  [ActionTypes.GoToOption](state, action) {
    if (state.disabled) return state;
    if (state.listboxState === ListboxStates.Closed) return state;

    const activeOptionIndex = calculateActiveIndex(action, {
      resolveItems: () => state.options,
      resolveActiveIndex: () => state.activeOptionIndex,
      resolveId: (item) => item.id,
      resolveDisabled: (item) => item.dataRef.current.disabled
    });

    if (state.searchQuery === '' && state.activeOptionIndex === activeOptionIndex) return state;
    return { ...state, searchQuery: '', activeOptionIndex };
  },
  [ActionTypes.Search]: (state, action) => {
    if (state.disabled) return state;
    if (state.listboxState === ListboxStates.Closed) return state;

    const searchQuery = state.searchQuery + action.value;
    const match = state.options.findIndex(
      (option) =>
        !option.dataRef.current.disabled &&
        option.dataRef.current.textValue?.startsWith(searchQuery)
    );

    if (match === -1 || match === state.activeOptionIndex) return { ...state, searchQuery };
    return { ...state, searchQuery, activeOptionIndex: match };
  },
  [ActionTypes.ClearSearch](state) {
    if (state.disabled) return state;
    if (state.listboxState === ListboxStates.Closed) return state;
    if (state.searchQuery === '') return state;
    return { ...state, searchQuery: '' };
  },
  [ActionTypes.RegisterOption]: (state, action) => ({
    ...state,
    options: [...state.options, { id: action.id, dataRef: action.dataRef }]
  }),
  [ActionTypes.UnregisterOption]: (state, action) => {
    const nextOptions = state.options.slice();
    const currentActiveOption =
      state.activeOptionIndex !== null ? nextOptions[state.activeOptionIndex] : null;

    const idx = nextOptions.findIndex((a) => a.id === action.id);

    if (idx !== -1) nextOptions.splice(idx, 1);

    return {
      ...state,
      options: nextOptions,
      activeOptionIndex: (() => {
        if (idx === state.activeOptionIndex) return null;
        if (currentActiveOption === null) return null;

        // If we removed the option before the actual active index, then it would be out of sync. To
        // fix this, we will find the correct (new) index position.
        return nextOptions.indexOf(currentActiveOption);
      })()
    };
  }
};

const ListboxContext = createContext<[StateDefinition, Dispatch<Actions>] | null>(null);
ListboxContext.displayName = 'ListboxContext';

function useListboxContext(component: string) {
  const context = useContext(ListboxContext);
  if (context === null) {
    const err = new Error(`<${component} /> is missing a parent <${Listbox.name} /> component.`);
    if (Error.captureStackTrace) Error.captureStackTrace(err, useListboxContext);
    throw err;
  }
  return context;
}

function stateReducer(state: StateDefinition, action: Actions) {
  return match(action.type, reducers, state, action);
}

// ---

const DEFAULT_LISTBOX_TAG = Fragment;
interface ListboxRenderPropArg {
  open: boolean;
  disabled: boolean;
}

export function Listbox<TTag extends ElementType = typeof DEFAULT_LISTBOX_TAG, TType = string>(
  props: Props<TTag, ListboxRenderPropArg, 'value' | 'onChange'> & {
    value: TType;
    onChange(value: TType): void;
    disabled?: boolean;
  }
) {
  const { value, onChange, disabled = false, ...passThroughProps } = props;
  const d = useDisposables();
  const reducerBag = useReducer(stateReducer, {
    listboxState: ListboxStates.Closed,
    propsRef: { current: { value, onChange } },
    labelRef: createRef(),
    buttonRef: createRef(),
    optionsRef: createRef(),
    disabled,
    options: [],
    searchQuery: '',
    activeOptionIndex: null
  } as StateDefinition);
  const [{ listboxState, propsRef, optionsRef, buttonRef }, dispatch] = reducerBag;

  useIsoMorphicEffect(() => {
    propsRef.current.value = value;
  }, [value, propsRef]);
  useIsoMorphicEffect(() => {
    propsRef.current.onChange = onChange;
  }, [onChange, propsRef]);
  useIsoMorphicEffect(() => dispatch({ type: ActionTypes.SetDisabled, disabled }), [disabled]);

  useEffect(() => {
    function handler(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const active = document.activeElement;

      if (listboxState !== ListboxStates.Open) return;
      if (buttonRef.current?.contains(target)) return;

      if (!optionsRef.current?.contains(target)) dispatch({ type: ActionTypes.CloseListbox });
      if (active !== document.body && active?.contains(target)) return; // Keep focus on newly clicked/focused element
      if (!event.defaultPrevented) buttonRef.current?.focus({ preventScroll: true });
    }

    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [listboxState, optionsRef, buttonRef, d, dispatch]);

  const propsBag = useMemo<ListboxRenderPropArg>(
    () => ({ open: listboxState === ListboxStates.Open, disabled }),
    [listboxState, disabled]
  );

  return (
    <ListboxContext.Provider value={reducerBag}>
      {render(passThroughProps, propsBag, DEFAULT_LISTBOX_TAG)}
    </ListboxContext.Provider>
  );
}

// ---

const DEFAULT_BUTTON_TAG = 'button' as const;
interface ButtonRenderPropArg {
  open: boolean;
  disabled: boolean;
}
type ButtonPropsWeControl =
  | 'id'
  | 'type'
  | 'aria-haspopup'
  | 'aria-controls'
  | 'aria-expanded'
  | 'aria-labelledby'
  | 'disabled'
  | 'onKeyDown'
  | 'onClick';

const Button = forwardRefWithAs(function Button<
  TTag extends ElementType = typeof DEFAULT_BUTTON_TAG
>(props: Props<TTag, ButtonRenderPropArg, ButtonPropsWeControl>, ref: Ref<HTMLButtonElement>) {
  const [state, dispatch] = useListboxContext([Listbox.name, Button.name].join('.'));
  const buttonRef = useSyncRefs(state.buttonRef, ref);

  const id = `headlessui-listbox-button-${useId()}`;
  const d = useDisposables();

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      switch (event.key) {
        // Ref: https://www.w3.org/TR/wai-aria-practices-1.2/#keyboard-interaction-13

        case Keys.Space:
        case Keys.Enter:
        case Keys.ArrowDown:
          event.preventDefault();
          dispatch({ type: ActionTypes.OpenListbox });
          d.nextFrame(() => {
            state.optionsRef.current?.focus({ preventScroll: true });
            if (!state.propsRef.current.value)
              dispatch({ type: ActionTypes.GoToOption, focus: Focus.First });
          });
          break;

        case Keys.ArrowUp:
          event.preventDefault();
          dispatch({ type: ActionTypes.OpenListbox });
          d.nextFrame(() => {
            state.optionsRef.current?.focus({ preventScroll: true });
            if (!state.propsRef.current.value)
              dispatch({ type: ActionTypes.GoToOption, focus: Focus.Last });
          });
          break;
      }
    },
    [dispatch, state, d]
  );

  const handleClick = useCallback(
    (event: ReactMouseEvent) => {
      if (isDisabledReactIssue7711(event.currentTarget)) return event.preventDefault();
      if (state.listboxState === ListboxStates.Open) {
        dispatch({ type: ActionTypes.CloseListbox });
        d.nextFrame(() => state.buttonRef.current?.focus({ preventScroll: true }));
      } else {
        event.preventDefault();
        dispatch({ type: ActionTypes.OpenListbox });
        d.nextFrame(() => state.optionsRef.current?.focus({ preventScroll: true }));
      }
    },
    [dispatch, d, state]
  );

  const labelledby = useComputed(() => {
    if (!state.labelRef.current) return undefined;
    return [state.labelRef.current.id, id].join(' ');
  }, [state.labelRef.current, id]);

  const propsBag = useMemo<ButtonRenderPropArg>(
    () => ({ open: state.listboxState === ListboxStates.Open, disabled: state.disabled }),
    [state]
  );
  const passthroughProps = props;
  const propsWeControl = {
    ref: buttonRef,
    id,
    type: 'button',
    'aria-haspopup': true,
    'aria-controls': state.optionsRef.current?.id,
    'aria-expanded': state.listboxState === ListboxStates.Open ? true : undefined,
    'aria-labelledby': labelledby,
    disabled: state.disabled,
    onKeyDown: handleKeyDown,
    onClick: handleClick
  };

  return render({ ...passthroughProps, ...propsWeControl }, propsBag, DEFAULT_BUTTON_TAG);
});

// ---

const DEFAULT_LABEL_TAG = 'label' as const;
interface LabelRenderPropArg {
  open: boolean;
  disabled: boolean;
}
type LabelPropsWeControl = 'id' | 'ref' | 'onClick';

function Label<TTag extends ElementType = typeof DEFAULT_LABEL_TAG>(
  props: Props<TTag, LabelRenderPropArg, LabelPropsWeControl>
) {
  const [state] = useListboxContext([Listbox.name, Label.name].join('.'));
  const id = `headlessui-listbox-label-${useId()}`;

  const handleClick = useCallback(() => state.buttonRef.current?.focus({ preventScroll: true }), [
    state.buttonRef
  ]);

  const propsBag = useMemo<LabelRenderPropArg>(
    () => ({ open: state.listboxState === ListboxStates.Open, disabled: state.disabled }),
    [state]
  );
  const propsWeControl = { ref: state.labelRef, id, onClick: handleClick };
  return render({ ...props, ...propsWeControl }, propsBag, DEFAULT_LABEL_TAG);
}

// ---

const DEFAULT_OPTIONS_TAG = 'ul' as const;
interface OptionsRenderPropArg {
  open: boolean;
}
type OptionsPropsWeControl =
  | 'aria-activedescendant'
  | 'aria-labelledby'
  | 'id'
  | 'onKeyDown'
  | 'role'
  | 'tabIndex';

const OptionsRenderFeatures = Features.RenderStrategy | Features.Static;

const Options = forwardRefWithAs(function Options<
  TTag extends ElementType = typeof DEFAULT_OPTIONS_TAG
>(
  props: Props<TTag, OptionsRenderPropArg, OptionsPropsWeControl> &
    PropsForFeatures<typeof OptionsRenderFeatures>,
  ref: Ref<HTMLUListElement>
) {
  const [state, dispatch] = useListboxContext([Listbox.name, Options.name].join('.'));
  const optionsRef = useSyncRefs(state.optionsRef, ref);

  const id = `headlessui-listbox-options-${useId()}`;
  const d = useDisposables();
  const searchDisposables = useDisposables();

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLUListElement>) => {
      searchDisposables.dispose();

      switch (event.key) {
        // Ref: https://www.w3.org/TR/wai-aria-practices-1.2/#keyboard-interaction-12

        case Keys.Space:
          if (state.searchQuery !== '') {
            event.preventDefault();
            return dispatch({ type: ActionTypes.Search, value: event.key });
          }
        // When in type ahead mode, fallthrough
        case Keys.Enter:
          event.preventDefault();
          dispatch({ type: ActionTypes.CloseListbox });
          if (state.activeOptionIndex !== null) {
            const { dataRef } = state.options[state.activeOptionIndex];
            state.propsRef.current.onChange(dataRef.current.value);
          }
          disposables().nextFrame(() => state.buttonRef.current?.focus({ preventScroll: true }));
          break;

        case Keys.ArrowDown:
          event.preventDefault();
          return dispatch({ type: ActionTypes.GoToOption, focus: Focus.Next });

        case Keys.ArrowUp:
          event.preventDefault();
          return dispatch({ type: ActionTypes.GoToOption, focus: Focus.Previous });

        case Keys.Home:
        case Keys.PageUp:
          event.preventDefault();
          return dispatch({ type: ActionTypes.GoToOption, focus: Focus.First });

        case Keys.End:
        case Keys.PageDown:
          event.preventDefault();
          return dispatch({ type: ActionTypes.GoToOption, focus: Focus.Last });

        case Keys.Escape:
          event.preventDefault();
          dispatch({ type: ActionTypes.CloseListbox });
          return d.nextFrame(() => state.buttonRef.current?.focus({ preventScroll: true }));

        case Keys.Tab:
          return event.preventDefault();

        default:
          if (event.key.length === 1) {
            dispatch({ type: ActionTypes.Search, value: event.key });
            searchDisposables.setTimeout(() => dispatch({ type: ActionTypes.ClearSearch }), 350);
          }
          break;
      }
    },
    [d, dispatch, searchDisposables, state]
  );

  const labelledby = useComputed(() => state.labelRef.current?.id ?? state.buttonRef.current?.id, [
    state.labelRef.current,
    state.buttonRef.current
  ]);

  const propsBag = useMemo<OptionsRenderPropArg>(
    () => ({ open: state.listboxState === ListboxStates.Open }),
    [state]
  );
  const propsWeControl = {
    'aria-activedescendant':
      state.activeOptionIndex === null ? undefined : state.options[state.activeOptionIndex]?.id,
    'aria-labelledby': labelledby,
    id,
    onKeyDown: handleKeyDown,
    role: 'listbox',
    tabIndex: 0,
    ref: optionsRef
  };
  const passthroughProps = props;

  return render(
    { ...passthroughProps, ...propsWeControl },
    propsBag,
    DEFAULT_OPTIONS_TAG,
    OptionsRenderFeatures,
    state.listboxState === ListboxStates.Open
  );
});

// ---

const DEFAULT_OPTION_TAG = 'li' as const;
interface OptionRenderPropArg {
  active: boolean;
  selected: boolean;
  disabled: boolean;
}
type ListboxOptionPropsWeControl =
  | 'id'
  | 'role'
  | 'tabIndex'
  | 'aria-disabled'
  | 'aria-selected'
  | 'onPointerLeave'
  | 'onMouseLeave'
  | 'onPointerMove'
  | 'onMouseMove'
  | 'onFocus';

function Option<
  TTag extends ElementType = typeof DEFAULT_OPTION_TAG,
  // TODO: One day we will be able to infer this type from the generic in Listbox itself.
  // But today is not that day..
  TType = Parameters<typeof Listbox>[0]['value']
>(
  props: Props<TTag, OptionRenderPropArg, ListboxOptionPropsWeControl | 'className' | 'value'> & {
    disabled?: boolean;
    value: TType;

    // Special treatment, can either be a string or a function that resolves to a string
    className?: ((bag: OptionRenderPropArg) => string) | string;
  }
) {
  const { disabled = false, value, className, ...passthroughProps } = props;
  const [state, dispatch] = useListboxContext([Listbox.name, Option.name].join('.'));
  const id = `headlessui-listbox-option-${useId()}`;
  const active =
    state.activeOptionIndex !== null ? state.options[state.activeOptionIndex].id === id : false;
  const selected = state.propsRef.current.value === value;

  const bag = useRef<ListboxOptionDataRef['current']>({ disabled, value });

  useIsoMorphicEffect(() => {
    bag.current.disabled = disabled;
  }, [bag, disabled]);
  useIsoMorphicEffect(() => {
    bag.current.value = value;
  }, [bag, value]);
  useIsoMorphicEffect(() => {
    bag.current.textValue = document.getElementById(id)?.textContent?.toLowerCase();
  }, [bag, id]);

  const select = useCallback(() => state.propsRef.current.onChange(value), [state.propsRef, value]);

  useIsoMorphicEffect(() => {
    dispatch({ type: ActionTypes.RegisterOption, id, dataRef: bag });
    return () => dispatch({ type: ActionTypes.UnregisterOption, id });
  }, [bag, id]);

  useIsoMorphicEffect(() => {
    if (state.listboxState !== ListboxStates.Open) return;
    if (!selected) return;
    dispatch({ type: ActionTypes.GoToOption, focus: Focus.Specific, id });
    document.getElementById(id)?.focus?.();
  }, [state.listboxState]);

  useIsoMorphicEffect(() => {
    if (state.listboxState !== ListboxStates.Open) return;
    if (!active) return;
    const d = disposables();
    d.nextFrame(() => document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' }));
    return d.dispose;
  }, [id, active, state.listboxState]);

  const handleClick = useCallback(
    (event: { preventDefault: Function }) => {
      if (disabled) return event.preventDefault();
      select();
      dispatch({ type: ActionTypes.CloseListbox });
      disposables().nextFrame(() => state.buttonRef.current?.focus({ preventScroll: true }));
    },
    [dispatch, state.buttonRef, disabled, select]
  );

  const handleFocus = useCallback(() => {
    if (disabled) return dispatch({ type: ActionTypes.GoToOption, focus: Focus.Nothing });
    dispatch({ type: ActionTypes.GoToOption, focus: Focus.Specific, id });
  }, [disabled, id, dispatch]);

  const handleMove = useCallback(() => {
    if (disabled) return;
    if (active) return;
    dispatch({ type: ActionTypes.GoToOption, focus: Focus.Specific, id });
  }, [disabled, active, id, dispatch]);

  const handleLeave = useCallback(() => {
    if (disabled) return;
    if (!active) return;
    dispatch({ type: ActionTypes.GoToOption, focus: Focus.Nothing });
  }, [disabled, active, dispatch]);

  const propsBag = useMemo(() => ({ active, selected, disabled }), [active, selected, disabled]);
  const propsWeControl = {
    id,
    role: 'option',
    tabIndex: -1,
    className: resolvePropValue(className, propsBag),
    'aria-disabled': disabled === true ? true : undefined,
    'aria-selected': selected === true ? true : undefined,
    onClick: handleClick,
    onFocus: handleFocus,
    onPointerMove: handleMove,
    onMouseMove: handleMove,
    onPointerLeave: handleLeave,
    onMouseLeave: handleLeave
  };

  return render({ ...passthroughProps, ...propsWeControl }, propsBag, DEFAULT_OPTION_TAG);
}

// ---

Listbox.Button = Button;
Listbox.Label = Label;
Listbox.Options = Options;
Listbox.Option = Option;
