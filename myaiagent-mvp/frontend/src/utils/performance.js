import { useCallback, useMemo, useRef, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottle(callback, delay) {
  const lastRan = useRef(Date.now());

  return useCallback(
    (...args) => {
      if (Date.now() - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = Date.now();
      }
    },
    [callback, delay]
  );
}

export function useMemoCompare(value, compare) {
  const previousRef = useRef();
  const previous = previousRef.current;

  const isEqual = previous && compare(previous, value);

  useEffect(() => {
    if (!isEqual) {
      previousRef.current = value;
    }
  });

  return isEqual ? previous : value;
}

export const memoizeOne = (fn) => {
  let lastArgs;
  let lastResult;

  return (...args) => {
    if (
      lastArgs &&
      args.length === lastArgs.length &&
      args.every((arg, index) => arg === lastArgs[index])
    ) {
      return lastResult;
    }

    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
};

import { useState } from 'react';

export const optimizeArrayMap = (array, mapFn, deps = []) => {
  return useMemo(() => array?.map(mapFn) || [], [array, ...deps]);
};

export const optimizeFilter = (array, filterFn, deps = []) => {
  return useMemo(() => array?.filter(filterFn) || [], [array, ...deps]);
};

export const optimizeSort = (array, sortFn, deps = []) => {
  return useMemo(() => [...(array || [])].sort(sortFn), [array, ...deps]);
};
