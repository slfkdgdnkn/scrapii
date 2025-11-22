import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const CORS_PROXY = 'https://corsproxy.io/?';

// --- TIPOS DE DATOS ---
interface SeoAuditResult {
    status: 'pass' | 'warn' | 'fail';
    text: string;
}

interface EcommerceData {
    products: {
        name: string;
        price: string | null;
        currency: string | null;
        availability: string | null;
        rating: number | null;
        reviewCount: number | null;
    }[];
    structuredData: {
        hasProductSchema: boolean;
        hasOrganizationSchema: boolean;
        hasReviewSchema: boolean;
    };
    paymentMethods: string[];
    shoppingFeatures: {
        hasCart: boolean;
        hasWishlist: boolean;
        hasSearch: boolean;
        hasFilters: boolean;
    };
    totalProducts: number;
}

interface ScrapedData {
    title: string;
    meta: {
        description: string | null;
        keywords: string | null;
        author: string | null;
        ogTitle: string | null;
        ogDescription: string | null;
    };
    headings: {
        h1: (string | undefined | null)[];
        h2: (string | undefined | null)[];
        h3: (string | undefined | null)[];
    };
    links: { text: string; href: string | null; }[];
    images: { src: string | null; alt: string | null; }[];
    seoAudit: {
        title: SeoAuditResult;
        description: SeoAuditResult;
        h1: SeoAuditResult;
        altTexts: SeoAuditResult;
    };
    technologies: string[];
    ecommerce: EcommerceData;
}

interface Query {
    title: string;
    url: string;
    data: ScrapedData;
    timestamp: number;
}

type Tab = 'summary' | 'seo' | 'gallery' | 'tech' | 'ecommerce' | 'json';

// --- COMPONENTE PRINCIPAL ---
const App = () => {
    const [url, setUrl] = useState('');
    const [queries, setQueries] = useState<Query[]>([]);
    const [currentResult, setCurrentResult] = useState<ScrapedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('summary');

    useEffect(() => {
        try {
            const savedQueries = localStorage.getItem('scrapedQueries');
            if (savedQueries) setQueries(JSON.parse(savedQueries));
        } catch (e) {
            console.error("Fallo al cargar consultas desde localStorage", e);
        }
    }, []);

    const saveQueries = (newQueries: Query[]) => {
        setQueries(newQueries);
        localStorage.setItem('scrapedQueries', JSON.stringify(newQueries));
    };

    const detectTechnologies = (html: string, doc: Document): string[] => {
        const technologies = new Set<string>();
        if (html.includes('react.js') || doc.querySelector('[data-reactroot]')) technologies.add('React');
        if (html.includes('vue.js') || doc.querySelector('#app[data-v-app]')) technologies.add('Vue.js');
        if (html.includes('angular.js')) technologies.add('AngularJS');
        if (doc.querySelector('script[src*="jquery"]')) technologies.add('jQuery');
        if (doc.querySelector('meta[name="generator"][content*="WordPress"]')) technologies.add('WordPress');
        if (doc.querySelector('meta[name="generator"][content*="Shopify"]')) technologies.add('Shopify');
        if (doc.querySelector('#__next')) technologies.add('Next.js');
        return Array.from(technologies);
    };

    const analyzeEcommerce = (html: string, doc: Document): EcommerceData => {
        const products: EcommerceData['products'] = [];
        const paymentMethods: string[] = [];
        
        // Detectar productos por selectores comunes
        const productSelectors = [
            '.product', '.item', '[data-product]', '.product-item',
            '.woocommerce-product', '.shopify-product', '.product-card'
        ];
        
        productSelectors.forEach(selector => {
            doc.querySelectorAll(selector).forEach(productEl => {
                const nameEl = productEl.querySelector('.product-title, .product-name, h1, h2, h3, .title, [data-product-title]');
                const priceEl = productEl.querySelector('.price, .product-price, .cost, [data-price], .amount');
                const ratingEl = productEl.querySelector('.rating, .stars, [data-rating]');
                const reviewEl = productEl.querySelector('.reviews, .review-count, [data-reviews]');
                
                if (nameEl || priceEl) {
                    const priceText = priceEl?.textContent?.trim() || null;
                    const currency = priceText?.match(/[$€£¥₹]/)?.[0] || null;
                    
                    products.push({
                        name: nameEl?.textContent?.trim() || 'Producto sin nombre',
                        price: priceText,
                        currency,
                        availability: productEl.querySelector('.stock, .availability')?.textContent?.trim() || null,
                        rating: ratingEl ? parseFloat(ratingEl.textContent?.match(/\d+\.?\d*/)?.[0] || '0') || null : null,
                        reviewCount: reviewEl ? parseInt(reviewEl.textContent?.match(/\d+/)?.[0] || '0') || null : null
                    });
                }
            });
        });
        
        // Detectar métodos de pago
        const paymentKeywords = {
            'PayPal': ['paypal', 'pp-logo'],
            'Stripe': ['stripe', 'stripe-button'],
            'Visa': ['visa'],
            'Mastercard': ['mastercard', 'master-card'],
            'American Express': ['amex', 'american-express'],
            'Apple Pay': ['apple-pay', 'applepay'],
            'Google Pay': ['google-pay', 'googlepay'],
            'Bitcoin': ['bitcoin', 'btc'],
            'Mercado Pago': ['mercadopago', 'mercado-pago']
        };
        
        Object.entries(paymentKeywords).forEach(([method, keywords]) => {
            if (keywords.some(keyword => 
                html.toLowerCase().includes(keyword) || 
                doc.querySelector(`[class*="${keyword}"], [id*="${keyword}"]`)
            )) {
                paymentMethods.push(method);
            }
        });
        
        // Analizar structured data
        const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
        const structuredData = {
            hasProductSchema: false,
            hasOrganizationSchema: false,
            hasReviewSchema: false
        };
        
        jsonLdScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent || '');
                const checkSchema = (obj: any) => {
                    if (obj['@type']) {
                        if (obj['@type'].includes('Product')) structuredData.hasProductSchema = true;
                        if (obj['@type'].includes('Organization')) structuredData.hasOrganizationSchema = true;
                        if (obj['@type'].includes('Review')) structuredData.hasReviewSchema = true;
                    }
                };
                
                if (Array.isArray(data)) {
                    data.forEach(checkSchema);
                } else {
                    checkSchema(data);
                }
            } catch (e) {
                // Ignorar errores de parsing JSON
            }
        });
        
        // Detectar características de shopping
        const shoppingFeatures = {
            hasCart: !!(doc.querySelector('.cart, #cart, [data-cart], .shopping-cart, .basket') || 
                       html.toLowerCase().includes('add to cart') || 
                       html.toLowerCase().includes('añadir al carrito')),
            hasWishlist: !!(doc.querySelector('.wishlist, .favorites, [data-wishlist]') || 
                           html.toLowerCase().includes('wishlist') || 
                           html.toLowerCase().includes('lista de deseos')),
            hasSearch: !!(doc.querySelector('input[type="search"], .search-box, #search') || 
                         html.toLowerCase().includes('buscar producto')),
            hasFilters: !!(doc.querySelector('.filter, .filters, [data-filter]') || 
                          html.toLowerCase().includes('filtrar'))
        };
        
        return {
            products,
            structuredData,
            paymentMethods,
            shoppingFeatures,
            totalProducts: products.length
        };
    };

    const performSeoAudit = (data: ScrapedData): ScrapedData['seoAudit'] => {
        const audit: ScrapedData['seoAudit'] = {
            title: { status: 'fail', text: 'No se encontró título.' },
            description: { status: 'fail', text: 'No se encontró meta descripción.' },
            h1: { status: 'fail', text: 'No se encontró ningún encabezado H1.' },
            altTexts: { status: 'pass', text: 'Todas las imágenes tienen texto alternativo.' },
        };

        if (data.title) {
            if (data.title.length < 10) audit.title = { status: 'warn', text: `El título es muy corto (${data.title.length} caracteres).` };
            else if (data.title.length > 60) audit.title = { status: 'warn', text: `El título es muy largo (${data.title.length} caracteres).` };
            else audit.title = { status: 'pass', text: 'El título tiene una longitud óptima.' };
        }

        if (data.meta.description) {
            if (data.meta.description.length < 50) audit.description = { status: 'warn', text: `La descripción es muy corta (${data.meta.description.length} caracteres).` };
            else if (data.meta.description.length > 160) audit.description = { status: 'warn', text: `La descripción es muy larga (${data.meta.description.length} caracteres).` };
            else audit.description = { status: 'pass', text: 'La descripción tiene una longitud óptima.' };
        }

        if (data.headings.h1.length === 1) audit.h1 = { status: 'pass', text: 'Se encontró un único encabezado H1.' };
        else if (data.headings.h1.length > 1) audit.h1 = { status: 'warn', text: `Se encontraron ${data.headings.h1.length} encabezados H1. Se recomienda solo uno.` };
        
        const imagesWithoutAlt = data.images.filter(img => !img.alt).length;
        if (imagesWithoutAlt > 0) audit.altTexts = { status: 'warn', text: `${imagesWithoutAlt} de ${data.images.length} imágenes no tienen texto alternativo.` };

        return audit;
    };

    const handleScrape = async () => {
        if (!url.startsWith('http')) {
            setError('Por favor, ingrese una URL válida (ej. https://example.com).');
            return;
        }
        setLoading(true);
        setError(null);
        setCurrentResult(null);
        setActiveTab('summary');

        try {
            const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error(`Error al obtener la URL. Estado: ${response.status}`);
            
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const title = doc.querySelector('title')?.textContent || 'Sin título';

            const scrapedData: Omit<ScrapedData, 'seoAudit' | 'technologies'> = {
                title,
                meta: {
                    description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || null,
                    keywords: doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || null,
                    author: doc.querySelector('meta[name="author"]')?.getAttribute('content') || null,
                    ogTitle: doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || null,
                    ogDescription: doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || null,
                },
                headings: {
                    h1: Array.from(doc.querySelectorAll('h1')).map(h => h.textContent?.trim()),
                    h2: Array.from(doc.querySelectorAll('h2')).map(h => h.textContent?.trim()),
                    h3: Array.from(doc.querySelectorAll('h3')).map(h => h.textContent?.trim()),
                },
                links: Array.from(doc.querySelectorAll('a[href]')).map(a => ({ text: a.textContent?.trim() || '', href: a.getAttribute('href') })),
                images: Array.from(doc.querySelectorAll('img')).map(img => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') })),
            };
            
            const fullScrapedData: ScrapedData = {
                ...scrapedData,
                technologies: detectTechnologies(html, doc),
                seoAudit: performSeoAudit(scrapedData as ScrapedData),
                ecommerce: analyzeEcommerce(html, doc),
            };

            setCurrentResult(fullScrapedData);
            const newQuery: Query = { title, url, data: fullScrapedData, timestamp: Date.now() };
            const updatedQueries = [newQuery, ...queries.filter(q => q.url !== url)].slice(0, 10);
            saveQueries(updatedQueries);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
        } finally {
            setLoading(false);
        }
    };
    
    // --- MANEJADORES DE EVENTOS ---
    const handleHistoryClick = (query: Query) => {
        setUrl(query.url);
        setCurrentResult(query.data);
        setError(null);
        setActiveTab('summary');
    };

    const handleClearHistory = () => {
        saveQueries([]);
    };

    const handleExport = () => {
        if (!currentResult) return;
        const blob = new Blob([JSON.stringify(currentResult, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentResult.title.replace(/\s/g, '_')}_scrape.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    // --- COMPONENTES DE RENDERIZADO ---
    const renderSummary = (data: ScrapedData) => (
        <ul className="summary-list">
             <li className="summary-item">
                <span className="summary-label">Título</span>
                <span className="summary-value-text">{data.title || 'No encontrado'}</span>
            </li>
            <li className="summary-item">
                <span className="summary-label">Descripción</span>
                <span className="summary-value-text">{data.meta.description || 'No encontrada'}</span>
            </li>
            <li className="summary-item"><span className="summary-value-count">{data.headings.h1.length}</span><span className="summary-label">Encabezados H1</span></li>
            <li className="summary-item"><span className="summary-value-count">{data.headings.h2.length}</span><span className="summary-label">Encabezados H2</span></li>
            <li className="summary-item"><span className="summary-value-count">{data.links.length}</span><span className="summary-label">Enlaces</span></li>
            <li className="summary-item"><span className="summary-value-count">{data.images.length}</span><span className="summary-label">Imágenes</span></li>
        </ul>
    );

    const renderSeoAudit = (data: ScrapedData) => {
        const AuditItem = ({ result }: { result: SeoAuditResult }) => (
            <li className={`audit-item audit-${result.status}`}>
                <span className="audit-icon">{result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠️' : '❌'}</span>
                <span>{result.text}</span>
            </li>
        );
        return (
            <ul className="audit-list">
                <AuditItem result={data.seoAudit.title} />
                <AuditItem result={data.seoAudit.description} />
                <AuditItem result={data.seoAudit.h1} />
                <AuditItem result={data.seoAudit.altTexts} />
            </ul>
        );
    };

    const renderImageGallery = (data: ScrapedData) => (
        <div className="image-gallery">
            {data.images.length > 0 ? data.images.map((img, i) => (
                <div key={i} className={`image-item ${!img.alt ? 'no-alt' : ''}`} title={`Alt: ${img.alt || 'Vacío'}`}>
                    <img src={img.src ? new URL(img.src, url).href : ''} alt={img.alt || ''} loading="lazy" />
                </div>
            )) : <p>No se encontraron imágenes.</p>}
        </div>
    );

    const renderTechnologies = (data: ScrapedData) => (
        <div className="tech-list">
            {data.technologies.length > 0 ? data.technologies.map(tech => <span key={tech} className="tech-item">{tech}</span>) : <p>No se detectaron tecnologías específicas.</p>}
        </div>
    );

    const renderEcommerce = (data: ScrapedData) => {
        const { ecommerce } = data;
        return (
            <div className="ecommerce-analysis">
                <div className="ecommerce-section">
                    <h3>📊 Resumen General</h3>
                    <ul className="summary-list">
                        <li className="summary-item">
                            <span className="summary-value-count">{ecommerce.totalProducts}</span>
                            <span className="summary-label">Productos detectados</span>
                        </li>
                        <li className="summary-item">
                            <span className="summary-value-count">{ecommerce.paymentMethods.length}</span>
                            <span className="summary-label">Métodos de pago</span>
                        </li>
                    </ul>
                </div>

                <div className="ecommerce-section">
                    <h3>🛒 Características de Tienda</h3>
                    <ul className="audit-list">
                        <li className={`audit-item ${ecommerce.shoppingFeatures.hasCart ? 'audit-pass' : 'audit-fail'}`}>
                            <span className="audit-icon">{ecommerce.shoppingFeatures.hasCart ? '✓' : '❌'}</span>
                            <span>Carrito de compras</span>
                        </li>
                        <li className={`audit-item ${ecommerce.shoppingFeatures.hasSearch ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{ecommerce.shoppingFeatures.hasSearch ? '✓' : '⚠️'}</span>
                            <span>Búsqueda de productos</span>
                        </li>
                        <li className={`audit-item ${ecommerce.shoppingFeatures.hasFilters ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{ecommerce.shoppingFeatures.hasFilters ? '✓' : '⚠️'}</span>
                            <span>Filtros de productos</span>
                        </li>
                        <li className={`audit-item ${ecommerce.shoppingFeatures.hasWishlist ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{ecommerce.shoppingFeatures.hasWishlist ? '✓' : '⚠️'}</span>
                            <span>Lista de deseos</span>
                        </li>
                    </ul>
                </div>

                {ecommerce.paymentMethods.length > 0 && (
                    <div className="ecommerce-section">
                        <h3>💳 Métodos de Pago</h3>
                        <div className="tech-list">
                            {ecommerce.paymentMethods.map(method => <span key={method} className="tech-item">{method}</span>)}
                        </div>
                    </div>
                )}

                <div className="ecommerce-section">
                    <h3>📋 Structured Data</h3>
                    <ul className="audit-list">
                        <li className={`audit-item ${ecommerce.structuredData.hasProductSchema ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{ecommerce.structuredData.hasProductSchema ? '✓' : '⚠️'}</span>
                            <span>Schema de productos</span>
                        </li>
                        <li className={`audit-item ${ecommerce.structuredData.hasOrganizationSchema ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{ecommerce.structuredData.hasOrganizationSchema ? '✓' : '⚠️'}</span>
                            <span>Schema de organización</span>
                        </li>
                        <li className={`audit-item ${ecommerce.structuredData.hasReviewSchema ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{ecommerce.structuredData.hasReviewSchema ? '✓' : '⚠️'}</span>
                            <span>Schema de reseñas</span>
                        </li>
                    </ul>
                </div>

                {ecommerce.products.length > 0 && (
                    <div className="ecommerce-section">
                        <h3>🛍️ Productos Encontrados</h3>
                        <div className="products-grid">
                            {ecommerce.products.slice(0, 6).map((product, i) => (
                                <div key={i} className="product-card">
                                    <h4>{product.name}</h4>
                                    {product.price && <p className="product-price">{product.price}</p>}
                                    {product.rating && (
                                        <p className="product-rating">⭐ {product.rating} {product.reviewCount && `(${product.reviewCount} reseñas)`}</p>
                                    )}
                                    {product.availability && <p className="product-stock">{product.availability}</p>}
                                </div>
                            ))}
                            {ecommerce.products.length > 6 && (
                                <p className="more-products">... y {ecommerce.products.length - 6} productos más</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderTabContent = () => {
        if (loading) return <div className="loading">Extrayendo información...</div>;
        if (error) return <div className="error">{error}</div>;
        if (!currentResult) return <div className="placeholder">Los resultados del scraping se mostrarán aquí.</div>;
        
        switch (activeTab) {
            case 'summary': return renderSummary(currentResult);
            case 'seo': return renderSeoAudit(currentResult);
            case 'gallery': return renderImageGallery(currentResult);
            case 'tech': return renderTechnologies(currentResult);
            case 'ecommerce': return renderEcommerce(currentResult);
            case 'json': return <pre><code>{JSON.stringify(currentResult, null, 2)}</code></pre>;
            default: return null;
        }
    };

    const sidebarItems = Array.from({ length: 10 }).map((_, i) => queries[i] || null);

    return (
        <>
            <div className="app-container">
                <div className="title-container">
                    <h1 className="app-title">
                        Scrapii &gt;{' '}
                        <a
                            href="https://github.com/loiz1/loiz1"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Repositorio GitHub de loiz1"
                            className="github-link"
                            title="Ver en GitHub"
                        >
                      🦊
                        </a>
                    </h1>
                </div>
                <header className="header">
                    <label htmlFor="url-input">Ingrese la url</label>
                    <input id="url-input" type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScrape()} placeholder="https://ejemplo.com" aria-label="URL a extraer" />
                    <button onClick={handleScrape} disabled={loading}>{loading ? '...' : 'Scrapii'}</button>
                </header>
                <main className="main-content">
                    <aside className="sidebar">
                        <h2>Consultas</h2>
                        <ul aria-label="Historial de consultas">
                            {sidebarItems.map((query, i) => (
                                <li key={query ? query.timestamp : `empty-${i}`}>
                                    <button onClick={() => query && handleHistoryClick(query)} disabled={!query} title={query ? `${query.title} (${query.url})` : 'Vacío'}>
                                        {query ? query.title : 'Vacio'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="sidebar-actions">
                            <button onClick={handleExport} disabled={!currentResult || loading}>Exportar JSON</button>
                            <button onClick={handleClearHistory} disabled={queries.length === 0}>Limpiar Historial</button>
                        </div>
                    </aside>
                    <section className="result-container" aria-live="polite">
                        <div className="tabs">
                            <button className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Resumen</button>
                            <button className={`tab-button ${activeTab === 'seo' ? 'active' : ''}`} onClick={() => setActiveTab('seo')}>Auditoría SEO</button>
                            <button className={`tab-button ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>Galería</button>
                            <button className={`tab-button ${activeTab === 'tech' ? 'active' : ''}`} onClick={() => setActiveTab('tech')}>Tecnologías</button>
                            <button className={`tab-button ${activeTab === 'ecommerce' ? 'active' : ''}`} onClick={() => setActiveTab('ecommerce')}>E-commerce</button>
                            <button className={`tab-button ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>JSON Crudo</button>
                        </div>
                        <div className="tab-content">
                           {renderTabContent()}
                        </div>
                    </section>
                </main>
            </div>
            <footer className="footer">
                DevSecOps By Grupo 5
                <br />
                Uniminuto 2025
            </footer>
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);