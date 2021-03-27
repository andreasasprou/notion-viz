import { useRef, useState } from 'react';

import { useIsoMorphicEffect } from './useIsoMorphicEffect';

export function useComputed<T>(cb: () => T, dependencies: React.DependencyList) {
  const [value, setValue] = useState(cb);
  const cbRef = useRef(cb);
  useIsoMorphicEffect(() => {
    cbRef.current = cb;
  }, [cb]);
  useIsoMorphicEffect(() => setValue(cbRef.current), [cbRef, setValue, ...dependencies]);
  return value;
}
