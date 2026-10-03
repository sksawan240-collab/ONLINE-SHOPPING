import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, ArrowUpDown, X, Search, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import { Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { QuickViewModal } from '../components/product/QuickViewModal';

interface CatalogPageProps {
  onOpenAuth: () => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ onOpenAuth }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Available filter options fetched from actual catalog
  const [filterMeta, setFilterMeta] = useState<{
    categories: string[];
    brands: string[];
    sizes: string[];
    colors: { name: string; hex: string }[];
    minPrice: number;
    maxPrice: number;
  }>({
    categories: [],
    brands: [],
    sizes: [],
    colors: [],
    minPrice: 0,
    maxPrice: 1000,
  });

  // Extract query filters
  const currentCategory = searchParams.get('category') || '';
  const currentBrand = searchParams.get('brand') || '';
  const currentGender = searchParams.get('gender') || '';
  const currentSize = searchParams.get('size') || '';
  const currentColor = searchParams.get('color') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentNewArrival = searchParams.get('isNewArrival') || '';

  // Load catalog filter metadata
  useEffect(() => {
    api.products.getFilters()
      .then(res => {
        if (res.success && res.filters) {
          setFilterMeta(res.filters);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch products on query param changes
  useEffect(() => {
    async function fetchCatalog() {
      try {
        setLoading(true);
        const page = parseInt(searchParams.get('page') || '1', 10);
        setCurrentPage(page);

        const res = await api.products.list({
          category: currentCategory || undefined,
          brand: currentBrand || undefined,
          gender: currentGender && currentGender !== 'All' ? currentGender : undefined,
          size: currentSize || undefined,
          color: currentColor || undefined,
          search: currentSearch || undefined,
          sort: currentSort,
          minPrice: currentMinPrice || undefined,
          maxPrice: currentMaxPrice || undefined,
          isNewArrival: currentNewArrival || undefined,
          page,
          limit: 12,
        });

        if (res.success) {
          setProducts(res.products || []);
          setTotalProducts(res.pagination?.total || 0);
          setTotalPages(res.pagination?.totalPages || 1);
        }
      } catch (err) {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, [searchParams]);

  const updateParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (val === null || val === '') {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    next.set('page', '1'); // reset page
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters =
    Boolean(currentCategory || currentBrand || currentGender || currentSize || currentColor || currentSearch || currentMinPrice || currentMaxPrice || currentNewArrival);

  return (
    <div className="min-h-screen bg-[#fafaf9] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Header */}
        <div className="mb-6">
          <div className="text-xs text-stone-500 mb-1">
            <span>Atelier</span>
            <span className="mx-1.5">/</span>
            <span className="text-stone-900 font-medium">Collections</span>
            {currentCategory && (
              <>
                <span className="mx-1.5">/</span>
                <span className="text-stone-900 font-semibold">{currentCategory}</span>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-stone-900">
                {currentCategory || (currentGender ? `${currentGender}'s Collection` : 'All Garments')}
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Displaying {totalProducts} verified piece{totalProducts === 1 ? '' : 's'}
              </p>
            </div>

            {/* Sort & Mobile Filter Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-600" />}
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 hidden sm:inline">Sort:</span>
                <select
                  value={currentSort}
                  onChange={e => updateParam('sort', e.target.value)}
                  className="bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-900"
                >
                  <option value="newest">Newest Releases</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="popularity">Most Reviewed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-white rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 font-medium">Applied Filters:</span>
            {currentCategory && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-stone-100 text-stone-800 rounded-md">
                Category: {currentCategory}
                <button onClick={() => updateParam('category', null)}><X className="w-3 h-3 hover:text-stone-950" /></button>
              </span>
            )}
            {currentGender && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-stone-100 text-stone-800 rounded-md">
                Gender: {currentGender}
                <button onClick={() => updateParam('gender', null)}><X className="w-3 h-3 hover:text-stone-950" /></button>
              </span>
            )}
            {currentBrand && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-stone-100 text-stone-800 rounded-md">
                Brand: {currentBrand}
                <button onClick={() => updateParam('brand', null)}><X className="w-3 h-3 hover:text-stone-950" /></button>
              </span>
            )}
            {currentSize && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-stone-100 text-stone-800 rounded-md">
                Size: {currentSize}
                <button onClick={() => updateParam('size', null)}><X className="w-3 h-3 hover:text-stone-950" /></button>
              </span>
            )}
            {currentColor && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-stone-100 text-stone-800 rounded-md">
                Color: {currentColor}
                <button onClick={() => updateParam('color', null)}><X className="w-3 h-3 hover:text-stone-950" /></button>
              </span>
            )}
            {currentSearch && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-md">
                Search: "{currentSearch}"
                <button onClick={() => updateParam('search', null)}><X className="w-3 h-3 hover:text-amber-950" /></button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold ml-auto flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-6 bg-white p-5 rounded-2xl border border-stone-200 h-fit sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-base font-bold text-stone-900">Refine Selection</h3>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-xs text-stone-400 hover:text-stone-800">
                  Clear
                </button>
              )}
            </div>

            {/* Gender filter */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2.5">Gender</h4>
              <div className="space-y-1">
                {['All', 'Women', 'Men', 'Kids', 'Unisex'].map(g => (
                  <button
                    key={g}
                    onClick={() => updateParam('gender', g === 'All' ? null : g)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      (currentGender === g || (!currentGender && g === 'All'))
                        ? 'bg-stone-900 text-white font-semibold'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span>{g}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            {filterMeta.categories.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2.5">Category</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {filterMeta.categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => updateParam('category', currentCategory === cat ? null : cat)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        currentCategory === cat
                          ? 'bg-amber-100 text-amber-900 font-bold'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Brand filter */}
            {filterMeta.brands.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2.5">Atelier Brand</h4>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {filterMeta.brands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => updateParam('brand', currentBrand === brand ? null : brand)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        currentBrand === brand
                          ? 'bg-stone-900 text-white font-semibold'
                          : 'text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {filterMeta.sizes.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2.5">Sizes</h4>
                <div className="flex flex-wrap gap-1.5">
                  {filterMeta.sizes.map(s => (
                    <button
                      key={s}
                      onClick={() => updateParam('size', currentSize === s ? null : s)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                        currentSize === s
                          ? 'bg-stone-900 text-white border-stone-900 font-bold'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {filterMeta.colors.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2.5">Palette</h4>
                <div className="flex flex-wrap gap-2">
                  {filterMeta.colors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => updateParam('color', currentColor === c.name ? null : c.name)}
                      title={c.name}
                      className={`w-6 h-6 rounded-full border-2 transition-all p-0.5 ${
                        currentColor === c.name ? 'border-stone-900 scale-110' : 'border-stone-200 hover:scale-105'
                      }`}
                    >
                      <span className="block w-full h-full rounded-full" style={{ backgroundColor: c.hex }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="rounded-xl bg-stone-200 animate-pulse aspect-3/4" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {products.map(product => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onQuickView={prod => setQuickViewProduct(prod)}
                      onAuthRequired={onOpenAuth}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-12">
                    <button
                      onClick={() => updateParam('page', String(currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="px-4 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => updateParam('page', String(pageNum))}
                          className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                            currentPage === pageNum
                              ? 'bg-stone-900 text-white'
                              : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => updateParam('page', String(currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-4 py-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 px-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                <Search className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="font-serif text-lg font-bold text-stone-900">No matching garments found</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  Try adjusting or resetting your filter criteria to discover pieces in other ateliers.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="mt-5 px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAuthRequired={onOpenAuth}
      />
    </div>
  );
};
