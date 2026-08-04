import { useEffect, useRef } from 'react';

export const useInfiniteScroll = ({ onLoadMore, hasMore, loading, rootRef }) => {
  const sentinelRef = useRef(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMoreRef.current();
        }
      },
      { root: rootRef?.current, rootMargin: '0px 0px -40px 0px', threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, rootRef]);

  return sentinelRef;
};
