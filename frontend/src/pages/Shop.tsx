import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react';

const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await productService.getProducts();
      setProducts(data);
    } catch (err: any) {
      console.error('Error fetching products', err);
      setError(err.response?.data?.message || 'Failed to establish connection to products registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="customer-shop-page animate-fade-in">
      {/* Header section */}
      <div className="dashboard-header-block">
        <div>
          <h1 className="page-heading">Customer Storefront</h1>
          <p className="page-subheading">
            Browse verified merchant products and trigger premium encrypted secure settlements.
          </p>
        </div>
        <div className="shopping-cart-badge">
          <ShoppingBag size={18} />
          <span>Gateway Active</span>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="products-grid">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div key={index} className="product-card skeleton-card card-layout">
              <div className="skeleton-image animate-pulse-slow"></div>
              <div className="skeleton-content mt-4">
                <div className="skeleton-line skeleton-vendor animate-pulse-slow"></div>
                <div className="skeleton-line skeleton-title mt-2 animate-pulse-slow"></div>
                <div className="skeleton-line skeleton-desc mt-2 animate-pulse-slow"></div>
                <div className="skeleton-line skeleton-desc mt-2 animate-pulse-slow" style={{ width: '80%' }}></div>
                <div className="skeleton-footer mt-4">
                  <div className="skeleton-price animate-pulse-slow"></div>
                  <div className="skeleton-button animate-pulse-slow"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="content-section text-center max-width-md mx-auto my-6">
          <div className="flex-center text-error-class mb-4">
            <AlertCircle size={48} />
          </div>
          <h3>Registry Synchronization Failed</h3>
          <p className="text-muted-class mt-2">{error}</p>
          <button 
            onClick={fetchProducts} 
            className="btn btn-primary mt-6 px-6"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && products.length === 0 && (
        <div className="content-section text-center max-width-md mx-auto my-6">
          <div className="flex-center text-muted-class mb-4">
            <ShoppingBag size={48} />
          </div>
          <h3>No Merchant Products Found</h3>
          <p className="text-muted-class mt-2">
            There are currently no products seeded or registered in our decentralized ledger. Check back later!
          </p>
        </div>
      )}

      {/* Live Product Catalog Grid */}
      {!isLoading && !error && products.length > 0 && (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Shop;
