import { useEffect, useState } from 'react';

import { disposables } from '../shared/disposables';

export function useDisposables() {
  // Using useState instead of useRef so that we can use the initializer function.
  const [d] = useState(disposables);
  useEffect(() => () => d.dispose(), [d]);
  return d;
}
