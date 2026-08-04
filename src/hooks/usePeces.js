import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';

const PAGE_SIZE = 12;

const partitionByImage = (list) => {
  const withImage = [];
  const withoutImage = [];
  for (const p of list) {
    if (p.imagen_url) withImage.push(p);
    else withoutImage.push(p);
  }
  return [...withImage, ...withoutImage];
};

export const usePeces = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [peces, setPeces] = useState([]);
  const [categories, setCategories] = useState(['all']);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const requestIdRef = useRef(0);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('peces')
        .select('clasificacion')
        .eq('eliminado', false)
        .eq('estado', 'Activo');
      if (err) throw err;
      const unique = [...new Set((data || []).map((r) => r.clasificacion).filter(Boolean))];
      setCategories(['all', ...unique]);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const buildQuery = useCallback(
    ({ from, to }) => {
      let query = supabase
        .from('peces')
        .select('id, nombre_comun, nombre_cientifico, clasificacion, descripcion, imagen_url, video_url, estado')
        .eq('eliminado', false)
        .eq('estado', 'Activo')
        .order('nombre_comun')
        .range(from, to);

      if (selectedCategory !== 'all') {
        query = query.eq('clasificacion', selectedCategory);
      }
      if (debouncedSearch) {
        query = query.or(
          `nombre_comun.ilike.%${debouncedSearch}%,nombre_cientifico.ilike.%${debouncedSearch}%,clasificacion.ilike.%${debouncedSearch}%`
        );
      }
      return query;
    },
    [selectedCategory, debouncedSearch]
  );

  const resetAndFetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadingMore(false);
    setPeces([]);
    setHasMore(true);
    setError(null);
    try {
      const { data, error: err } = await buildQuery({ from: 0, to: PAGE_SIZE - 1 });
      if (requestId !== requestIdRef.current) return;
      if (err) throw err;
      setPeces(partitionByImage(data || []));
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Error cargando peces');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    try {
      const from = peces.length;
      const { data, error: err } = await buildQuery({ from, to: from + PAGE_SIZE - 1 });
      if (requestId !== requestIdRef.current) return;
      if (err) throw err;
      setPeces((prev) => partitionByImage([...prev, ...(data || [])]));
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Error cargando más peces');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingMore(false);
      }
    }
  }, [buildQuery, loadingMore, hasMore, loading, peces.length]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    resetAndFetch();
  }, [resetAndFetch]);

  return {
    peces,
    categories,
    hasMore,
    loading,
    loadingMore,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    loadMore,
    retry: resetAndFetch,
  };
};
