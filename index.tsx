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

interface SubdomainData {
    url: string;
    title: string;
    technologies: { name: string; version?: string; currentVersion?: string }[];
    linkCount: number;
    imageCount: number;
    status: 'success' | 'error' | 'skipped';
    error?: string;
}

interface ScrapedData {
    title: string;
    url: string;
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
    technologies: { name: string; version?: string; currentVersion?: string }[];
    ecommerce: EcommerceData;
    subdomains: SubdomainData[];
}

interface Query {
    title: string;
    url: string;
    data: ScrapedData;
    timestamp: number;
}

type Tab = 'summary' | 'tech' | 'ecommerce' | 'subdomains' | 'gallery' | 'json';

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

    const extractBaseDomain = (url: string): string => {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const parts = hostname.split('.');
            // Para dominios como example.com, sub.example.com, blog.example.com
            if (parts.length >= 2) {
                // Si es un subdominio, tomar desde el segundo nivel
                if (parts.length > 2) {
                    return parts.slice(-2).join('.');
                }
                return hostname;
            }
            return hostname;
        } catch {
            return '';
        }
    };

    const extractSubdomains = (links: { href: string | null }[], baseUrl: string): string[] => {
        const baseDomain = extractBaseDomain(baseUrl);
        const subdomains = new Set<string>();
        const baseUrlObj = new URL(baseUrl);
        const baseHostname = baseUrlObj.hostname;
        const baseOrigin = baseUrlObj.origin;

        links.forEach(link => {
            if (!link.href) return;
            
            try {
                const linkUrl = new URL(link.href, baseUrl);
                const linkHostname = linkUrl.hostname;
                
                // Solo incluir si es un subdominio real del mismo dominio base
                if (linkHostname !== baseHostname && linkHostname.endsWith('.' + baseDomain)) {
                    // Verificar que no sea el dominio principal
                    if (linkUrl.origin !== baseOrigin) {
                        subdomains.add(linkUrl.origin);
                    }
                }
            } catch {
                // URLs inválidas, ignorar
            }
        });

        return Array.from(subdomains);
    };

    const scrapeSubdomain = async (subdomainUrl: string): Promise<SubdomainData> => {
        try {
            const response = await fetch(`${CORS_PROXY}${encodeURIComponent(subdomainUrl)}`);
            if (!response.ok) {
                return {
                    url: subdomainUrl,
                    title: 'Error de conexión',
                    technologies: [],
                    linkCount: 0,
                    imageCount: 0,
                    status: 'error',
                    error: `HTTP ${response.status}`
                };
            }

            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const title = doc.querySelector('title')?.textContent || 'Sin título';
            const technologies = detectTechnologies(html, doc);
            const links = Array.from(doc.querySelectorAll('a[href]')).length;
            const images = Array.from(doc.querySelectorAll('img')).length;

            return {
                url: subdomainUrl,
                title,
                technologies,
                linkCount: links,
                imageCount: images,
                status: 'success'
            };
        } catch (error) {
            return {
                url: subdomainUrl,
                title: 'Error',
                technologies: [],
                linkCount: 0,
                imageCount: 0,
                status: 'error',
                error: error instanceof Error ? error.message : 'Error desconocido'
            };
        }
    };

    const getCurrentVersions = (): Record<string, string> => {
        return {
            'React': '18.2.0',
            'Vue.js': '3.3.0',
            'Angular': '17.1.0',
            'Svelte': '4.2.0',
            'Ember.js': '5.0.0',
            'Backbone.js': '1.4.1',
            'jQuery': '3.7.1',
            'Bootstrap': '5.3.0',
            'Tailwind CSS': '3.4.0',
            'Bulma': '0.9.4',
            'Foundation': '6.8.1',
            'Semantic UI': '2.5.0',
            'Next.js': '14.1.0',
            'Nuxt.js': '3.8.0',
            'Gatsby': '5.12.0',
            'Vite': '5.1.0',
            'Webpack': '5.89.0',
            'Rollup': '4.9.0',
            'WordPress': '6.4.0',
            'Shopify': '2024-01',
            'Drupal': '10.3.0',
            'Joomla': '5.0.0',
            'Magento': '2.4.7',
            'PHP': '8.3.0',
            'ASP.NET': '8.0.0',
            'Django': '4.2.7',
            'Flask': '3.0.0',
            'Ruby on Rails': '7.1.0',
            'Node.js/Express': '21.5.0',
            'Laravel': '11.0.0',
            'Spring': '3.2.0',
            'FastAPI': '0.109.0',
            'MongoDB': '7.0.0',
            'Firebase': '10.7.0',
            'Supabase': '2.37.0',
            'TypeScript': '5.3.0',
            'SASS/SCSS': '1.69.0',
            'LESS': '4.2.0',
            'PostCSS': '8.4.0',
            'Chart.js': '4.4.0',
            'D3.js': '7.8.0'
        };
    };

    const detectTechnologyVersion = (html: string, techName: string): string | undefined => {
        const htmlLower = html.toLowerCase();
        
        // Verificar que la tecnología esté realmente presente en el HTML
        if (!htmlLower.includes(techName.toLowerCase().replace(/[^a-z]/g, ''))) {
            return undefined;
        }
        
        // Patrones más estrictos para detectar versiones reales
        const versionPatterns = {
            'React': [
                /react[.\-]?\d+\.\d+\.\d+/,
                /react[-_]\d+\.\d+\.\d+/,
                /react[.\-]\d+\.\d+/,
                /react[-_]\d+\.\d+/,
                /react\.version[.\-]?\d+\.\d+\.\d+/,
                /react-dom@\d+\.\d+\.\d+/,
                /react[.\-]version[:\s]*[\'"]?\d+\.\d+\.\d+/,
                /react[.\-]v\d+\.\d+\.\d+/g
            ],
            'jQuery': [
                /jquery[.\-]?\d+\.\d+\.\d+/,
                /jquery[.\-]?\d+\.\d+/,
                /jquery[.\-]v\d+\.\d+\.\d+/,
                /jquery[.\-]v\d+\.\d+/,
                /jquery[.\-]version[.\-]?\d+\.\d+\.\d+/g
            ],
            'Bootstrap': [
                /bootstrap[.\-@]?\d+\.\d+\.\d+/,
                /bootstrap[.\-@]?\d+\.\d+/,
                /bootstrap[.\-]v\d+\.\d+\.\d+/,
                /bootstrap[.\-]version[.\-]?\d+\.\d+\.\d+/g
            ],
            'Vue.js': [
                /vue[.\-@]?\d+\.\d+\.\d+/,
                /vue[.\-@]?\d+\.\d+/,
                /vue[.\-]v\d+\.\d+\.\d+/,
                /vue[.\-]version[.\-]?\d+\.\d+\.\d+/g
            ],
            'Angular': [
                /@angular[./]core[.\-@]?\d+\.\d+\.\d+/,
                /@angular[./]cli[.\-@]?\d+\.\d+\.\d+/,
                /angular[.\-]v?\d+\.\d+\.\d+/,
                /ng[.\-]version[:\s]*[\'"]?\d+\.\d+\.\d+/g
            ],
            'TypeScript': [
                /typescript[.\-@]?\d+\.\d+\.\d+/,
                /typescript[.\-@]?\d+\.\d+/,
                /ts[.\-@]?\d+\.\d+\.\d+/g
            ],
            'Node.js/Express': [
                /node[.\-]?\d+\.\d+\.\d+/,
                /nodejs[.\-]?\d+\.\d+\.\d+/,
                /express[.\-@]?\d+\.\d+\.\d+/g
            ]
        };

        // Buscar versión específica para esta tecnología
        const patterns = versionPatterns[techName as keyof typeof versionPatterns];
        if (patterns) {
            for (const pattern of patterns) {
                const matches = htmlLower.match(pattern);
                if (matches && matches[0]) {
                    // Extraer solo los números de versión del match
                    const versionMatch = matches[0].match(/\d+\.\d+\.\d+|\d+\.\d+/);
                    if (versionMatch && versionMatch[0]) {
                        return versionMatch[0];
                    }
                }
                
                // Para patrones con 'g', buscar todos los matches
                if (pattern.flags.includes('g')) {
                    const allMatches = Array.from(htmlLower.matchAll(pattern));
                    for (const match of allMatches) {
                        if (match[0]) {
                            const versionMatch = match[0].match(/\d+\.\d+\.\d+|\d+\.\d+/);
                            if (versionMatch && versionMatch[0]) {
                                return versionMatch[0];
                            }
                        }
                    }
                }
            }
        }

        // Patrones genéricos más estrictos (solo si no hay patrones específicos)
        if (!patterns) {
            const cleanTechName = techName.toLowerCase().replace(/[^a-z]/g, '');
            const genericPattern = new RegExp(`${cleanTechName}[.\-@_\\s]*v?(\\d+\\.\\d+(?:\\.\\d+)?)`, 'g');
            
            const allMatches = Array.from(htmlLower.matchAll(genericPattern));
            for (const match of allMatches) {
                if (match[1] && match[1].match(/^\d+\.\d+(?:\.\d+)?$/)) {
                    return match[1];
                }
            }
        }

        return undefined;
    };

    const detectTechnologies = (html: string, doc: Document): { name: string; version?: string; currentVersion?: string }[] => {
        const technologies = new Set<string>();
        const htmlLower = html.toLowerCase();
        const scripts = Array.from(doc.querySelectorAll('script'));
        const links = Array.from(doc.querySelectorAll('link[href]'));
        const metaGenerator = doc.querySelector('meta[name="generator"]')?.getAttribute('content') || '';
        
        // Frameworks y librerías de JavaScript
        if (html.includes('react') || doc.querySelector('[data-reactroot], [data-react]') || scripts.some(s => s.src?.includes('react'))) technologies.add('React');
        if (html.includes('vue') || doc.querySelector('#app[data-v-app]') || scripts.some(s => s.src?.includes('vue'))) technologies.add('Vue.js');
        if (html.includes('angular') || html.includes('ng-app') || scripts.some(s => s.src?.includes('angular'))) technologies.add('Angular');
        if (html.includes('svelte') || doc.querySelector('[data-svelte]') || scripts.some(s => s.src?.includes('svelte'))) technologies.add('Svelte');
        if (html.includes('ember') || scripts.some(s => s.src?.includes('ember'))) technologies.add('Ember.js');
        if (html.includes('backbone') || scripts.some(s => s.src?.includes('backbone'))) technologies.add('Backbone.js');
        if (html.includes('jquery')) technologies.add('jQuery');
        if (html.includes('bootstrap') || doc.querySelector('.container-fluid, .container') || links.some(l => l.getAttribute('href')?.includes('bootstrap'))) technologies.add('Bootstrap');
        if (html.includes('tailwind') || doc.querySelector('[class*="tw-"]')) technologies.add('Tailwind CSS');
        if (html.includes('bulma') || doc.querySelector('.is-primary')) technologies.add('Bulma');
        if (html.includes('foundation') || doc.querySelector('[data-sticky]')) technologies.add('Foundation');
        if (html.includes('semantic-ui') || doc.querySelector('.ui.segment')) technologies.add('Semantic UI');
        
        // Frameworks de JavaScript modernos
        if (doc.querySelector('#__next') || html.includes('next')) technologies.add('Next.js');
        if (html.includes('nuxt') || doc.querySelector('[data-n-head]')) technologies.add('Nuxt.js');
        if (html.includes('gatsby') || doc.querySelector('[data-gatsby]')) technologies.add('Gatsby');
        if (html.includes('vite') || doc.querySelector('[data-vite-plugin]')) technologies.add('Vite');
        if (html.includes('webpack') || scripts.some(s => s.src?.includes('webpack'))) technologies.add('Webpack');
        if (html.includes('rollup') || scripts.some(s => s.src?.includes('rollup'))) technologies.add('Rollup');
        
        // CMS y plataformas
        if (metaGenerator.includes('WordPress') || html.includes('wp-content') || html.includes('wordpress')) technologies.add('WordPress');
        if (metaGenerator.includes('Shopify') || html.includes('shopify')) technologies.add('Shopify');
        if (metaGenerator.includes('Drupal') || html.includes('drupal')) technologies.add('Drupal');
        if (metaGenerator.includes('Joomla') || html.includes('joomla')) technologies.add('Joomla');
        if (metaGenerator.includes('Magento') || html.includes('magento')) technologies.add('Magento');
        if (html.includes('docusaurus') || html.includes('dokuwiki')) technologies.add('Docusaurus');
        if (html.includes('notion') || html.includes('notion.so')) technologies.add('Notion');
        if (html.includes('wix') || html.includes('wixstatic')) technologies.add('Wix');
        if (html.includes('squarespace') || html.includes('squarespace.com')) technologies.add('Squarespace');
        
        // Lenguajes y frameworks de backend
        if (html.includes('php') || html.includes('.php') || metaGenerator.includes('php')) technologies.add('PHP');
        if (html.includes('asp.net') || html.includes('.aspx') || metaGenerator.includes('asp.net')) technologies.add('ASP.NET');
        if (html.includes('django') || html.includes('csrfmiddlewaretoken')) technologies.add('Django');
        if (html.includes('flask') || html.includes('flask')) technologies.add('Flask');
        if (html.includes('rails') || html.includes('ruby on rails') || html.includes('csrf-token')) technologies.add('Ruby on Rails');
        if (html.includes('express') || html.includes('node.js') || html.includes('nodejs')) technologies.add('Node.js/Express');
        if (html.includes('laravel') || html.includes('laravel')) technologies.add('Laravel');
        if (html.includes('spring') || html.includes('spring boot')) technologies.add('Spring');
        if (html.includes('fastapi') || html.includes('swagger-ui')) technologies.add('FastAPI');
        
        // Bases de datos (detectables desde el frontend)
        if (html.includes('mongodb') || scripts.some(s => s.src?.includes('mongodb'))) technologies.add('MongoDB');
        if (html.includes('firebase') || html.includes('google-analytics')) technologies.add('Firebase');
        if (html.includes('supabase') || html.includes('supabase')) technologies.add('Supabase');
        
        // Bibliotecas de CSS
        if (html.includes('animate.css') || html.includes('aos') || links.some(l => l.getAttribute('href')?.includes('animate'))) technologies.add('Animate.css');
        if (html.includes('swiper') || html.includes('slick')) technologies.add('Slider/Carousel');
        if (html.includes('chart.js') || scripts.some(s => s.src?.includes('chart'))) technologies.add('Chart.js');
        if (html.includes('d3') || scripts.some(s => s.src?.includes('d3'))) technologies.add('D3.js');
        
        // Herramientas de análisis y marketing
        if (html.includes('google-analytics') || html.includes('gtag')) technologies.add('Google Analytics');
        if (html.includes('facebook') || html.includes('fb-')) technologies.add('Facebook Pixel');
        if (html.includes('hubspot') || html.includes('hs-')) technologies.add('HubSpot');
        if (html.includes('mailchimp') || html.includes('mc-')) technologies.add('Mailchimp');
        if (html.includes('stripe') || html.includes('stripe')) technologies.add('Stripe');
        if (html.includes('paypal') || html.includes('paypal')) technologies.add('PayPal');
        
        // Herramientas de desarrollo y build
        if (html.includes('types') || scripts.some(s => s.src?.includes('types'))) technologies.add('TypeScript');
        if (html.includes('sass') || html.includes('scss') || links.some(l => l.getAttribute('href')?.includes('sass') || l.getAttribute('href')?.includes('scss'))) technologies.add('SASS/SCSS');
        if (html.includes('less') || links.some(l => l.getAttribute('href')?.includes('less'))) technologies.add('LESS');
        if (html.includes('postcss') || links.some(l => l.getAttribute('href')?.includes('postcss'))) technologies.add('PostCSS');
        
        const currentVersions = getCurrentVersions();
        
        return Array.from(technologies)
            .sort()
            .map(techName => ({
                name: techName,
                version: detectTechnologyVersion(html, techName),
                currentVersion: currentVersions[techName]
            }));
    };

    const analyzeEcommerce = (html: string, doc: Document): EcommerceData => {
        const products: EcommerceData['products'] = [];
        const paymentMethods: string[] = [];
        const htmlLower = html.toLowerCase();
        
        // Detectar productos con selectores más amplios
        const productSelectors = [
            // Selectores generales
            '.product', '.item', '.product-item', '.product-card', '.product-tile',
            // E-commerce específicos
            '.woocommerce-product', '.shopify-product', '.magento-product',
            // Atributos data
            '[data-product]', '[data-product-id]', '[data-item]',
            // Contenedores de artículos
            'article', '.card', '.listing', '.result',
            // Grids y listas de productos
            '.grid-item', '.list-item', '.catalog-item'
        ];
        
        // También buscar por patrones de precio para detectar productos
        const pricePatterns = /\$\d+|€\d+|£\d+|¥\d+|₹\d+|\d+\.\d+\s*\$|\d+,\d+\s*€/g;
        const priceMatches = html.match(pricePatterns) || [];
        
        productSelectors.forEach(selector => {
            doc.querySelectorAll(selector).forEach(productEl => {
                // Selectores más amplios para nombres
                const nameSelectors = [
                    '.product-title', '.product-name', '.title', '.name',
                    'h1', 'h2', 'h3', 'h4', '.heading',
                    '[data-product-title]', '[data-name]',
                    '.item-title', '.card-title'
                ];
                
                // Selectores más amplios para precios
                const priceSelectors = [
                    '.price', '.product-price', '.cost', '.amount',
                    '[data-price]', '.price-current', '.price-now',
                    '.sale-price', '.regular-price', '.final-price',
                    '.money', '.currency'
                ];
                
                let nameEl = null;
                let priceEl = null;
                
                // Buscar nombre
                for (const sel of nameSelectors) {
                    nameEl = productEl.querySelector(sel);
                    if (nameEl && nameEl.textContent?.trim()) break;
                }
                
                // Buscar precio
                for (const sel of priceSelectors) {
                    priceEl = productEl.querySelector(sel);
                    if (priceEl && priceEl.textContent?.trim()) break;
                }
                
                // Si no encuentra precio, buscar por patrón de texto
                if (!priceEl) {
                    const textContent = productEl.textContent || '';
                    const priceMatch = textContent.match(/\$\d+|€\d+|£\d+|¥\d+|₹\d+/);
                    if (priceMatch) {
                        priceEl = { textContent: priceMatch[0] } as Element;
                    }
                }
                
                if (nameEl || priceEl) {
                    const priceText = priceEl?.textContent?.trim() || null;
                    const currency = priceText?.match(/[$€£¥₹]/)?.[0] || null;
                    
                    const ratingEl = productEl.querySelector('.rating, .stars, [data-rating], .review-stars, .star-rating');
                    const reviewEl = productEl.querySelector('.reviews, .review-count, [data-reviews], .review-total');
                    
                    products.push({
                        name: nameEl?.textContent?.trim() || 'Producto detectado',
                        price: priceText,
                        currency,
                        availability: productEl.querySelector('.stock, .availability, .in-stock, .out-of-stock')?.textContent?.trim() || null,
                        rating: ratingEl ? parseFloat(ratingEl.textContent?.match(/\d+\.?\d*/)?.[0] || '0') || null : null,
                        reviewCount: reviewEl ? parseInt(reviewEl.textContent?.match(/\d+/)?.[0] || '0') || null : null
                    });
                }
            });
        });
        
        // Si no encontró productos, buscar por patrones de precio en el HTML
        if (products.length === 0 && priceMatches.length > 0) {
            priceMatches.slice(0, 5).forEach((price, i) => {
                products.push({
                    name: `Producto ${i + 1}`,
                    price: price,
                    currency: price.match(/[$€£¥₹]/)?.[0] || null,
                    availability: null,
                    rating: null,
                    reviewCount: null
                });
            });
        }
        
        // Detectar métodos de pago con patrones más amplios
        const paymentKeywords = {
            'PayPal': ['paypal', 'pp-logo', 'paypal-button'],
            'Stripe': ['stripe', 'stripe-button', 'stripe-checkout'],
            'Visa': ['visa', 'visa-card'],
            'Mastercard': ['mastercard', 'master-card', 'mc-card'],
            'American Express': ['amex', 'american-express', 'americanexpress'],
            'Apple Pay': ['apple-pay', 'applepay', 'apple-payment'],
            'Google Pay': ['google-pay', 'googlepay', 'gpay'],
            'Bitcoin': ['bitcoin', 'btc', 'crypto'],
            'Mercado Pago': ['mercadopago', 'mercado-pago', 'mp-payment']
        };
        
        Object.entries(paymentKeywords).forEach(([method, keywords]) => {
            if (keywords.some(keyword => 
                htmlLower.includes(keyword) || 
                doc.querySelector(`[class*="${keyword}"], [id*="${keyword}"], [alt*="${keyword}"]`)
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
                        const type = Array.isArray(obj['@type']) ? obj['@type'].join(' ') : obj['@type'];
                        if (type.includes('Product')) structuredData.hasProductSchema = true;
                        if (type.includes('Organization')) structuredData.hasOrganizationSchema = true;
                        if (type.includes('Review')) structuredData.hasReviewSchema = true;
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
        
        // Detectar características de shopping con patrones más amplios
        const cartPatterns = [
            // Selectores CSS
            '.cart', '#cart', '.shopping-cart', '.basket', '.bag',
            '.cart-icon', '.cart-button', '.add-to-cart', '.buy-now',
            '[data-cart]', '.minicart', '.cart-container',
            // Texto en español e inglés
            'add to cart', 'añadir al carrito', 'agregar al carrito',
            'comprar ahora', 'buy now', 'add to bag', 'añadir a la bolsa'
        ];
        
        const wishlistPatterns = [
            '.wishlist', '.favorites', '.favourite', '.wish-list',
            '[data-wishlist]', '.save-for-later', '.add-to-wishlist',
            'wishlist', 'lista de deseos', 'favoritos', 'guardar para después'
        ];
        
        const searchPatterns = [
            'input[type="search"]', '.search-box', '#search', '.search-input',
            '.search-form', '[placeholder*="search"]', '[placeholder*="buscar"]',
            'buscar producto', 'search products', 'find products'
        ];
        
        const filterPatterns = [
            '.filter', '.filters', '[data-filter]', '.facet', '.facets',
            '.sort', '.sorting', '.category-filter', '.price-filter',
            'filtrar', 'filter', 'ordenar', 'sort by'
        ];
        
        const hasCart = cartPatterns.some(pattern => 
            pattern.startsWith('.') || pattern.startsWith('#') || pattern.startsWith('[') ?
            doc.querySelector(pattern) : htmlLower.includes(pattern)
        );
        
        const hasWishlist = wishlistPatterns.some(pattern => 
            pattern.startsWith('.') || pattern.startsWith('#') || pattern.startsWith('[') ?
            doc.querySelector(pattern) : htmlLower.includes(pattern)
        );
        
        const hasSearch = searchPatterns.some(pattern => 
            pattern.startsWith('input') || pattern.startsWith('.') || pattern.startsWith('#') || pattern.startsWith('[') ?
            doc.querySelector(pattern) : htmlLower.includes(pattern)
        );
        
        const hasFilters = filterPatterns.some(pattern => 
            pattern.startsWith('.') || pattern.startsWith('#') || pattern.startsWith('[') ?
            doc.querySelector(pattern) : htmlLower.includes(pattern)
        );
        
        const shoppingFeatures = {
            hasCart,
            hasWishlist,
            hasSearch,
            hasFilters
        };
        
        return {
            products,
            structuredData,
            paymentMethods,
            shoppingFeatures,
            totalProducts: products.length
        };
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
            // Hacer scraping de la página principal
            const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error(`Error al obtener la URL. Estado: ${response.status}`);
            
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const title = doc.querySelector('title')?.textContent || 'Sin título';

            // Extraer enlaces de la página principal
            const links = Array.from(doc.querySelectorAll('a[href]')).map(a => ({ 
                text: a.textContent?.trim() || '', 
                href: a.getAttribute('href') 
            }));
            
            // Extraer subdominios únicos
            const subdomains = extractSubdomains(links, url);
            
            // Hacer scraping de subdominios (máximo 10 para evitar sobrecarga)
            const subdomainResults: SubdomainData[] = [];
            const maxSubdomains = Math.min(subdomains.length, 10);
            
            for (let i = 0; i < maxSubdomains; i++) {
                const subdomainUrl = subdomains[i];
                try {
                    const result = await scrapeSubdomain(subdomainUrl);
                    subdomainResults.push(result);
                } catch (err) {
                    subdomainResults.push({
                        url: subdomainUrl,
                        title: 'Error',
                        technologies: [],
                        linkCount: 0,
                        imageCount: 0,
                        status: 'error',
                        error: err instanceof Error ? err.message : 'Error desconocido'
                    });
                }
            }

            const scrapedData = {
                title,
                url,
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
                links: links,
                images: Array.from(doc.querySelectorAll('img')).map(img => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') })),
                technologies: detectTechnologies(html, doc),
                ecommerce: analyzeEcommerce(html, doc),
                subdomains: subdomainResults,
            };

            setCurrentResult(scrapedData);
            const newQuery: Query = { title, url, data: scrapedData, timestamp: Date.now() };
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

    const getErrorExplanation = (error: string): string => {
        const errorLower = error.toLowerCase();
        
        // Códigos HTTP comunes
        if (errorLower.includes('404')) {
            return 'Error 404 - Recurso no encontrado. La URL no existe o ha sido movida.';
        }
        if (errorLower.includes('403')) {
            return 'Error 403 - Acceso prohibido. El servidor deniega el acceso a la página.';
        }
        if (errorLower.includes('500')) {
            return 'Error 500 - Error interno del servidor. Problemas en el servidor web.';
        }
        if (errorLower.includes('502')) {
            return 'Error 502 - Puerta de enlace inválida. Problema de conectividad.';
        }
        if (errorLower.includes('503')) {
            return 'Error 503 - Servicio no disponible. El servidor está temporalmente sobrecargado.';
        }
        if (errorLower.includes('timeout')) {
            return 'Timeout - La conexión tardó demasiado tiempo. El servidor puede estar sobrecargado.';
        }
        if (errorLower.includes('refused')) {
            return 'Conexión rechazada - El servidor está rechazando las conexiones.';
        }
        if (errorLower.includes('network')) {
            return 'Error de red - Problemas de conectividad o DNS.';
        }
        if (errorLower.includes('cors')) {
            return 'Error CORS - El servidor bloquea las peticiones desde este origen.';
        }
        if (errorLower.includes('ssl') || errorLower.includes('certificate')) {
            return 'Error SSL - Problemas con el certificado de seguridad.';
        }
        if (errorLower.includes('http')) {
            const match = errorLower.match(/http (\d+)/);
            if (match) {
                const code = match[1];
                const httpCodes: Record<string, string> = {
                    '400': 'Error 400 - Petición malformada',
                    '401': 'Error 401 - No autorizado',
                    '405': 'Error 405 - Método no permitido',
                    '408': 'Error 408 - Timeout de petición',
                    '429': 'Error 429 - Demasiadas peticiones',
                    '502': 'Error 502 - Puerta de enlace inválida',
                    '503': 'Error 503 - Servicio no disponible',
                    '504': 'Error 504 - Timeout de puerta de enlace'
                };
                return httpCodes[code] || `Error HTTP ${code} - Código de estado HTTP no estándar`;
            }
        }
        
        return `Error no identificado: ${error}`;
    };

    const renderSubdomains = (data: ScrapedData) => {
        const successSubdomains = data.subdomains.filter(s => s.status === 'success');

        return (
            <div className="subdomains-analysis">
                {/* Solo subdominios exitosos con URL completa */}
                {successSubdomains.length > 0 && (
                    <div className="subdomains-section">
                        <h3>🌐 Subdominios Encontrados</h3>
                        <div className="subdomains-compact">
                            {successSubdomains.map((subdomain, i) => (
                                <div 
                                    key={`success-${i}`} 
                                    className="subdomain-compact-item success"
                                >
                                    <span className="subdomain-title">{subdomain.url}</span>
                                    <span className="subdomain-status-text">✓ Accesible</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {successSubdomains.length === 0 && (
                    <div className="placeholder">No se encontraron subdominios accesibles.</div>
                )}
            </div>
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

    const compareVersions = (version: string, currentVersion: string): 'outdated' | 'current' | 'newer' => {
        if (!version || !currentVersion) return 'current';
        
        const versionParts = version.split('.').map(Number);
        const currentParts = currentVersion.split('.').map(Number);
        
        // Comparar versión mayor, menor y patch
        for (let i = 0; i < Math.max(versionParts.length, currentParts.length); i++) {
            const v = versionParts[i] || 0;
            const c = currentParts[i] || 0;
            
            if (v < c) return 'outdated';
            if (v > c) return 'newer';
        }
        
        return 'current';
    };

    const renderTechnologies = (data: ScrapedData) => (
        <div className="tech-list">
            {data.technologies.length > 0 ? data.technologies.map((tech, i) => {
                const versionStatus = tech.version && tech.currentVersion ? compareVersions(tech.version, tech.currentVersion) : 'current';
                
                return (
                    <div key={i} className={`tech-item-with-version ${versionStatus}`}>
                        <span className="tech-name">{tech.name}</span>
                        {tech.version && (
                            <span className="tech-version">v{tech.version}</span>
                        )}
                        {tech.currentVersion && (
                            <span className="tech-current">actual: {tech.currentVersion}</span>
                        )}
                        {versionStatus === 'outdated' && (
                            <span className="tech-warning">⚠️ Obsoleta</span>
                        )}
                        {versionStatus === 'newer' && (
                            <span className="tech-beta">🆕 Beta</span>
                        )}
                        {versionStatus === 'current' && (
                            <span className="tech-updated">✅ Actual</span>
                        )}
                    </div>
                );
            }) : <p>No se detectaron tecnologías específicas.</p>}
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
                        <li className="summary-item">
                            <span className="summary-value-count">{Object.values(ecommerce.shoppingFeatures).filter(Boolean).length}</span>
                            <span className="summary-label">Características activas</span>
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
            case 'gallery': return renderImageGallery(currentResult);
            case 'tech': return renderTechnologies(currentResult);
            case 'ecommerce': return renderEcommerce(currentResult);
            case 'subdomains': return renderSubdomains(currentResult);
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
                            href="https://github.com/loiz1/scrapii"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Repositorio GitHub del proyecto"
                            className="github-link"
                            title="Scrapii en GitHub"
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
                            <button className={`tab-button ${activeTab === 'tech' ? 'active' : ''}`} onClick={() => setActiveTab('tech')}>Tecnologías</button>
                            <button className={`tab-button ${activeTab === 'ecommerce' ? 'active' : ''}`} onClick={() => setActiveTab('ecommerce')}>E-commerce</button>
                            <button className={`tab-button ${activeTab === 'subdomains' ? 'active' : ''}`} onClick={() => setActiveTab('subdomains')}>Subdominios</button>
                            <button className={`tab-button ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>Galería</button>
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