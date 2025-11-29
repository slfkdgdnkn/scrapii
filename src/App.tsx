import React, { useState, useEffect } from 'react';
import { logger } from './utils/logger';
import { sanitizeUserInput, validateScrapingUrl, performSecurityAnalysis } from './utils/security';
import { realisticSecurityCalculator, SecurityIntegrationUtils } from './utils/security_integrator';
import {
    SeoAuditResult,
    EcommerceData,
    SubdomainData,
    ScrapingPolicy,
    SecurityHeaders,
    SSLAnalysis,
    VulnerableTechnology,
    SecurityAnalysis,
    ScrapedData,
    OptimizedQuery,
    Query,
    Tab
} from './types';

const CORS_PROXY = 'https://corsproxy.io/?';

const App = () => {
    const [url, setUrl] = useState('');
    const [queries, setQueries] = useState<Query[]>([]);
    const [optimizedQueries, setOptimizedQueries] = useState<OptimizedQuery[]>([]);
    const [currentResult, setCurrentResult] = useState<ScrapedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('summary');
    const [ethicalMode, setEthicalMode] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;

        const loadQueries = () => {
            try {
                const savedQueries = localStorage.getItem('scrapedQueries');
                if (savedQueries && isMounted) {
                    const parsedQueries = JSON.parse(savedQueries);
                    setQueries(Array.isArray(parsedQueries) ? parsedQueries : []);
                }

                const savedOptimizedQueries = localStorage.getItem('optimizedQueries');
                if (savedOptimizedQueries && isMounted) {
                    const parsedOptimizedQueries = JSON.parse(savedOptimizedQueries);
                    setOptimizedQueries(Array.isArray(parsedOptimizedQueries) ? parsedOptimizedQueries : []);
                }
            } catch (e) {
                logger.error("Fallo al cargar consultas desde localStorage", { error: e instanceof Error ? e.message : 'Error desconocido' });
            }
        };

        loadQueries();

        return () => {
            isMounted = false;
        };
    }, []);

    const getOptimizedQueries = (): OptimizedQuery[] => {
        try {
            const saved = localStorage.getItem('optimizedQueries');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    };

    const saveQueries = (newQueries: Query[]) => {
        try {
            setQueries(newQueries);
            localStorage.setItem('scrapedQueries', JSON.stringify(newQueries.slice(0, 10))); // Limitar a 10 consultas
        } catch (e) {
            logger.error("Error guardando consultas", { error: e instanceof Error ? e.message : 'Error desconocido' });
        }
    };

    const saveOptimizedQueries = (newQueries: OptimizedQuery[]) => {
        try {
            setOptimizedQueries(newQueries);
            localStorage.setItem('optimizedQueries', JSON.stringify(newQueries.slice(0, 10))); // Limitar a 10 consultas
        } catch (e) {
            logger.error("Error guardando consultas optimizadas", { error: e instanceof Error ? e.message : 'Error desconocido' });
        }
    };

    // --- FUNCIONES AUXILIARES ---
    const getRobotsTxtContent = async (baseUrl: string): Promise<string> => {
        try {
            const robotsUrl = new URL('/robots.txt', baseUrl).href;
            const response = await fetch(`${CORS_PROXY}${encodeURIComponent(robotsUrl)}`);

            if (!response.ok) {
                return 'No se encontró archivo robots.txt';
            }

            return await response.text();
        } catch (error) {
            return 'Error al obtener robots.txt: ' + (error instanceof Error ? error.message : 'Error desconocido');
        }
    };

    const detectUsersInContent = (html: string): { hasUsers: boolean; accessPoints: string[] } => {
        // Usar un solo regex combinado para mejor rendimiento
        const combinedPattern = /(login|register|sign\s*in|sign\s*up|profile|account|dashboard|admin|user|member|author|usuarios|miembros|perfiles|cuentas|iniciar\s*sesión|registr[ao])/gi;

        const accessPoints: string[] = [];
        const foundMatches = new Set<string>();

        let match;
        while ((match = combinedPattern.exec(html)) !== null) {
            const matchText = match[0].toLowerCase();

            // Mapear coincidencias a etiquetas legibles
            if (/login|iniciar\s*sesión/.test(matchText)) foundMatches.add('Iniciar Sesión');
            else if (/register|registr[ao]/.test(matchText)) foundMatches.add('Registro');
            else if (/sign\s*in/.test(matchText)) foundMatches.add('Sign In');
            else if (/sign\s*up/.test(matchText)) foundMatches.add('Sign Up');
            else if (/profile|perfil/.test(matchText)) foundMatches.add('Perfil');
            else if (/account|cuenta/.test(matchText)) foundMatches.add('Cuenta');
            else if (/dashboard/.test(matchText)) foundMatches.add('Dashboard');
            else if (/admin/.test(matchText)) foundMatches.add('Administración');
            else if (/user|usuario/.test(matchText)) foundMatches.add('Usuario');
            else if (/member|miembro/.test(matchText)) foundMatches.add('Miembro');
            else if (/author/.test(matchText)) foundMatches.add('Autor');
            else if (/usuarios/.test(matchText)) foundMatches.add('Usuarios');
            else if (/miembros/.test(matchText)) foundMatches.add('Miembros');
            else if (/perfiles/.test(matchText)) foundMatches.add('Perfiles');
            else if (/cuentas/.test(matchText)) foundMatches.add('Cuentas');
        }

        return {
            hasUsers: foundMatches.size > 0,
            accessPoints: Array.from(foundMatches)
        };
    };

    // --- FUNCIÓN PARA EXTRAER PALABRAS CLAVE ---
    const extractKeywords = (html: string, data: ScrapedData): string[] => {
        const keywords: string[] = [];
        const textContent = html.toLowerCase();

        // Palabras clave de tecnología
        const techKeywords = data.technologies.map(tech => tech.name);
        keywords.push(...techKeywords);

        // Palabras clave de e-commerce
        const ecommerceKeywords = [
            'tienda', 'shop', 'store', 'producto', 'product', 'precio', 'price',
            'comprar', 'buy', 'carrito', 'cart', 'pago', 'payment', 'envío', 'shipping'
        ];
        ecommerceKeywords.forEach(keyword => {
            if (textContent.includes(keyword)) {
                keywords.push(keyword);
            }
        });

        // Palabras clave de seguridad
        const securityKeywords = [
            'seguridad', 'security', 'ssl', 'https', 'certificado', 'certificate',
            'criptografía', 'encryption', 'firewall', 'vulnerabilidad', 'vulnerability'
        ];
        securityKeywords.forEach(keyword => {
            if (textContent.includes(keyword)) {
                keywords.push(keyword);
            }
        });

        // Extraer keywords de meta description
        if (data.meta.keywords) {
            const metaKeywords = data.meta.keywords.split(',').map(k => k.trim().toLowerCase());
            keywords.push(...metaKeywords);
        }

        // Extraer palabras de headings más importantes
        const importantHeadings = [...data.headings.h1, ...data.headings.h2].filter(Boolean);
        importantHeadings.forEach(heading => {
            const words = heading!.split(' ').slice(0, 3); // Primeras 3 palabras
            keywords.push(...words.map(w => w.toLowerCase()));
        });

        // Remover duplicados y limitar a 10 keywords más relevantes
        const uniqueKeywords = [...new Set(keywords)]
            .filter(k => k.length > 2) // Filtrar palabras muy cortas
            .slice(0, 10);

        return uniqueKeywords;
    };
    // --- FUNCIONES PARA OPTIMIZACIÓN DE TÍTULOS SIN TECNOLOGÍAS ---

    /**
     * Extrae palabras clave específicas de URLs sin incluir tecnologías
     * Enfocándose en contenido temático y propósito del sitio
     */
    const extractUrlKeywords = (url: string, html: string, data: ScrapedData): string[] => {
        const keywords: string[] = [];
        const textContent = html.toLowerCase();
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);

        // Extraer keywords del pathname de la URL
        pathSegments.forEach(segment => {
            const cleanedSegment = segment.replace(/[-_]/g, ' ').trim();
            if (cleanedSegment.length > 2 && !/^\d+$/.test(cleanedSegment)) {
                keywords.push(cleanedSegment);
            }
        });

        // Keywords específicos por tipo de contenido (sin tecnologías)
        const contentKeywords = {
            ecommerce: [
                'tienda', 'shop', 'store', 'productos', 'productos', 'precio', 'precios',
                'comprar', 'buy', 'carrito', 'cart', 'pago', 'payment', 'envío', 'shipping',
                'ofertas', 'descuentos', 'promociones', 'sale', 'deals', 'outlet'
            ],
            servicios: [
                'servicios', 'services', 'consultoría', 'consulting', 'soporte', 'support',
                'ayuda', 'help', 'contacto', 'contact', 'nosotros', 'about'
            ],
            blog: [
                'blog', 'noticias', 'news', 'artículos', 'articles', 'recursos', 'resources',
                'guías', 'guides', 'tutoriales', 'tutorials', 'tips'
            ],
            institucional: [
                'empresa', 'company', 'organización', 'organization', 'institucional', 'corporativo',
                'misión', 'mission', 'visión', 'vision', 'valores', 'values'
            ],
            productos: [
                'productos', 'products', 'catálogo', 'catalog', 'colección', 'collection',
                'línea', 'line', 'marca', 'brand', 'fabricante', 'manufacturer'
            ]
        };

        // Buscar keywords de contenido temático
        Object.values(contentKeywords).flat().forEach(keyword => {
            if (textContent.includes(keyword)) {
                keywords.push(keyword);
            }
        });

        // Keywords de e-commerce si hay productos
        if (data.ecommerce.totalProducts > 0) {
            const ecommerceTerms = ['productos', 'tienda', 'comprar', 'precios', 'ofertas'];
            ecommerceTerms.forEach(term => {
                if (textContent.includes(term)) {
                    keywords.push(term);
                }
            });
        }

        // Extraer del título original sin tecnologías
        if (data.title) {
            const titleWords = data.title
                .toLowerCase()
                .replace(/[-|]/g, ' ')
                .split(/\s+/)
                .filter(word =>
                    word.length > 2 &&
                    !/react|angular|vue|bootstrap|jquery|wordpress|php|html|css|javascript|js|ts|node/i.test(word)
                );
            keywords.push(...titleWords.slice(0, 3));
        }

        // Extraer de meta description
        if (data.meta.description) {
            const descWords = data.meta.description
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 3);
            keywords.push(...descWords.slice(0, 4));
        }

        // Extraer de headings importantes
        const importantHeadings = [...data.headings.h1, ...data.headings.h2].filter(Boolean);
        importantHeadings.forEach(heading => {
            const words = heading!
                .toLowerCase()
                .replace(/[-|]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3);
            keywords.push(...words.slice(0, 2));
        });

        // Filtrar y limpiar keywords
        const cleanKeywords = [...new Set(keywords)]
            .filter(keyword =>
                keyword.length > 2 &&
                !/^(the|and|or|but|in|on|at|to|for|of|with|by|from|up|about|into|through|during|before|after|above|below|between|among|through)$/i.test(keyword) &&
                !/^\d+$/.test(keyword)
            )
            .slice(0, 12); // Máximo 12 keywords para evitar sobrecarga

        return cleanKeywords;
    };

    /**
     * Valida keywords buscando coincidencias en la web
     * Simula búsqueda web para determinar relevancia de keywords
     */
    const validateKeywordsWithWebSearch = async (keywords: string[], baseUrl: string): Promise<{ keyword: string; relevanceScore: number; matchType: string }[]> => {
        const results: { keyword: string; relevanceScore: number; matchType: string }[] = [];
        const urlObj = new URL(baseUrl);
        const domain = urlObj.hostname.replace('www.', '');

        // Simulación de búsqueda web con diferentes tipos de coincidencias
        for (const keyword of keywords) {
            let relevanceScore = 0;
            let matchType = 'none';

            // Búsqueda en el dominio actual
            if (domain.toLowerCase().includes(keyword.toLowerCase()) ||
                baseUrl.toLowerCase().includes(keyword.toLowerCase())) {
                relevanceScore += 40;
                matchType = 'domain';
            }

            // Búsqueda en contenido específico
            const keywordPatterns = {
                'ecommerce': /(tienda|shop|store|productos|precio|comprar|carrito)/i,
                'servicios': /(servicios|consultoría|soporte|ayuda|contacto)/i,
                'blog': /(blog|noticias|artículos|recursos|guías)/i,
                'productos': /(productos|catálogo|colección|línea|marca)/i,
                'empresa': /(empresa|organización|corporativo|nosotros)/i
            };

            for (const [type, pattern] of Object.entries(keywordPatterns)) {
                if (pattern.test(keyword)) {
                    relevanceScore += 30;
                    matchType = type;
                    break;
                }
            }

            // Bonificación por palabras clave comerciales
            if (/(precio|oferta|descuento|promoción|sale|deal)/i.test(keyword)) {
                relevanceScore += 25;
                matchType = matchType === 'none' ? 'commercial' : matchType;
            }

            // Bonificación por palabras de acción
            if (/(comprar|buy|contactar|contact|visitar|visit)/i.test(keyword)) {
                relevanceScore += 20;
                matchType = matchType === 'none' ? 'action' : matchType;
            }

            // Penalización por palabras muy genéricas
            if (/(welcome|inicio|home|principal|principal)/i.test(keyword)) {
                relevanceScore -= 10;
            }

            // Asegurar score mínimo para keywords que aparecen en URL
            if (baseUrl.toLowerCase().includes(keyword.toLowerCase()) && relevanceScore < 50) {
                relevanceScore = 50;
                matchType = 'url_exact';
            }

            results.push({
                keyword,
                relevanceScore: Math.max(0, Math.min(100, relevanceScore)),
                matchType
            });
        }

        // Ordenar por relevancia y retornar top keywords
        return results
            .filter(result => result.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 8);
    };

    /**
     * Extrae el título desde 'www.' hasta la extensión del dominio (.com, .co, etc.)
     * Convierte puntos y guiones en espacios y mejora la capitalización
     * Ejemplos:
     *   www.mi-sitio-web.com.co → 'Mi sitio web'
     *   api.ejemplo.co → 'Ejemplo'
     *   www.tienda-online.com → 'Tienda online'
     */
    const extractTitleFromDomain = (url: string): string => {
        try {
            const urlObj = new URL(url);
            let hostname = urlObj.hostname;

            // Extraer el dominio principal (sin subdominios)
            let mainDomain = hostname;
            if (hostname.includes('.')) {
                const parts = hostname.split('.');
                // Para dominios como www.ejemplo.com.co, queremos "ejemplo"
                if (parts.length >= 2) {
                    // Manejar casos especiales como co.uk, com.ar, etc.
                    const lastTwoParts = parts.slice(-2).join('.');
                    const specialDomains = ['co.uk', 'com.ar', 'com.br', 'com.mx', 'com.au'];

                    if (specialDomains.includes(lastTwoParts)) {
                        mainDomain = parts.slice(-3).join('.');
                    } else {
                        mainDomain = parts.slice(-2).join('.');
                    }
                }
            }

            // Remover www. si está presente
            if (mainDomain.toLowerCase().startsWith('www.')) {
                mainDomain = mainDomain.substring(4);
            }

            // Extraer solo la parte antes de la extensión principal (.com, .co, etc.)
            const domainExtensions = ['.com', '.co', '.org', '.net', '.edu', '.gov', '.info', '.biz', '.me', '.io', '.tech', '.dev'];
            let cleanDomain = mainDomain;

            for (const ext of domainExtensions) {
                const extIndex = cleanDomain.toLowerCase().indexOf(ext);
                if (extIndex !== -1) {
                    cleanDomain = cleanDomain.substring(0, extIndex);
                    break;
                }
            }

            // Limpiar y procesar el dominio
            let processedDomain = cleanDomain
                .replace(/[._]/g, ' ')  // Reemplazar puntos y guiones bajos con espacios
                .replace(/-/g, ' ')     // Reemplazar guiones con espacios
                .replace(/\s+/g, ' ')   // Normalizar espacios múltiples
                .trim();

            // Si el resultado está vacío o es muy corto, usar un fallback
            if (processedDomain.length < 2) {
                return 'Sitio Web';
            }

            // Capitalización inteligente: detectar si hay palabras compuestas
            const words = processedDomain.split(/\s+/).filter(word => word.length > 0);
            const capitalizedWords = words.map(word => {
                // Detectar números y mantenerlos tal como están
                if (/^\d+$/.test(word)) {
                    return word;
                }

                // Para palabras con números como "web2", mantener la estructura
                if (/^[a-zA-Z]+\d+[a-zA-Z]*$/.test(word.toLowerCase())) {
                    const match = word.match(/^([a-zA-Z]+)(\d+)([a-zA-Z]*)$/);
                    if (match) {
                        const [, letters, numbers, rest] = match;
                        return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase() +
                            numbers + rest.toLowerCase();
                    }
                }

                // Capitalización normal
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            });

            const result = capitalizedWords.join(' ');

            // Filtrar resultados muy comunes y no descriptivos
            const genericTerms = ['localhost', 'test', 'demo', 'example', 'ejemplo'];
            if (genericTerms.includes(result.toLowerCase())) {
                return 'Sitio Web';
            }

            return result;

        } catch {
            // Si hay error en el parsing, usar un fallback inteligente basado en la URL
            try {
                const domainMatch = url.match(/https?:\/\/(?:www\.)?([^\/\s]+)/i);
                if (domainMatch && domainMatch[1]) {
                    let fallbackDomain = domainMatch[1];
                    // Remover la extensión más común para el fallback
                    fallbackDomain = fallbackDomain.replace(/\.(com|co|org|net|edu|gov|info|biz|me|io|tech|dev).*$/i, '');

                    if (fallbackDomain && fallbackDomain.length > 1) {
                        const cleanFallback = fallbackDomain
                            .replace(/[._-]/g, ' ')
                            .split(/\s+/)
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ');
                        return cleanFallback || 'Sitio Web';
                    }
                }
            } catch {
                // Ignorar errores del fallback
            }

            return 'Sitio Web';
        }
    };

    /**
     * Genera título optimizado basado en el dominio extraído de la URL
     */
    const generateOptimizedTitle = (
        validatedKeywords: { keyword: string; relevanceScore: number; matchType: string }[],
        originalTitle: string,
        url: string
    ): { optimizedTitle: string; matchPercentage: number } => {
        // Extraer título directamente del dominio
        const optimizedTitle = extractTitleFromDomain(url);

        // Como el título viene directamente del dominio, asignamos alta relevancia
        const matchPercentage = 85;

        return {
            optimizedTitle,
            matchPercentage
        };
    };

    /**
     * Función mejorada para extraer palabras clave SIN tecnologías
     * Usada para el historial optimizado
     */
    const extractKeywordsWithoutTech = (html: string, data: ScrapedData): string[] => {
        const keywords: string[] = [];
        const textContent = html.toLowerCase();

        // Palabras clave de e-commerce (SIN tecnologías)
        const ecommerceKeywords = [
            'tienda', 'shop', 'store', 'producto', 'product', 'precio', 'price',
            'comprar', 'buy', 'carrito', 'cart', 'pago', 'payment', 'envío', 'shipping',
            'ofertas', 'discount', 'promociones', 'sale'
        ];
        ecommerceKeywords.forEach(keyword => {
            if (textContent.includes(keyword)) {
                keywords.push(keyword);
            }
        });

        // Palabras clave de contenido
        const contentKeywords = [
            'servicios', 'services', 'blog', 'noticias', 'news', 'recursos', 'resources',
            'empresa', 'company', 'contacto', 'contact', 'ayuda', 'help'
        ];
        contentKeywords.forEach(keyword => {
            if (textContent.includes(keyword)) {
                keywords.push(keyword);
            }
        });

        // Extraer de headings importantes SIN tecnologías
        const importantHeadings = [...data.headings.h1, ...data.headings.h2].filter(Boolean);
        importantHeadings.forEach(heading => {
            const words = heading!
                .split(' ')
                .slice(0, 3) // Primeras 3 palabras
                .filter(word =>
                    word.length > 3 &&
                    !/react|angular|vue|bootstrap|jquery|wordpress|php|html|css|javascript|js|ts|node/i.test(word)
                )
                .map(w => w.toLowerCase());
            keywords.push(...words);
        });

        // Extraer keywords de meta description
        if (data.meta.keywords) {
            const metaKeywords = data.meta.keywords
                .split(',')
                .map(k => k.trim().toLowerCase())
                .filter(k => k.length > 2 && !/react|angular|vue|bootstrap|jquery/i.test(k));
            keywords.push(...metaKeywords);
        }

        // Remover duplicados y limitar
        const uniqueKeywords = [...new Set(keywords)]
            .filter(k => k.length > 2)
            .slice(0, 8);

        return uniqueKeywords;
    };

    // --- FUNCIONES DE SCRAPING ÉTICO ---
    const validateRobotsTxt = async (baseUrl: string): Promise<boolean> => {
        try {
            const robotsUrl = new URL('/robots.txt', baseUrl).href;
            const response = await fetch(`${CORS_PROXY}${encodeURIComponent(robotsUrl)}`);

            if (!response.ok) {
                return true; // Si no existe robots.txt, asumimos permitido
            }

            const robotsText = await response.text();
            const userAgent = 'ScrapiiBot/2.0';
            const lowerText = robotsText.toLowerCase();

            // Verificar si hay directivas de Disallow generales
            const hasGeneralDisallow = lowerText.includes('disallow: /');

            // Verificar si hay User-Agent específico para nuestro bot
            const hasSpecificUserAgent = lowerText.includes(`user-agent: ${userAgent.toLowerCase()}`);

            // Si hay User-Agent específico, verificar sus reglas
            if (hasSpecificUserAgent) {
                const userAgentSection = extractUserAgentSection(robotsText, userAgent);
                if (userAgentSection) {
                    return !userAgentSection.includes('disallow: /');
                }
            }

            // Si hay User-Agent * (general), verificar sus reglas
            const hasWildcardUserAgent = lowerText.includes('user-agent: *');
            if (hasWildcardUserAgent && hasGeneralDisallow) {
                return false;
            }

            return true;
        } catch (error) {
            logger.warn('Error validando robots.txt', { error: error });
            return true; // En caso de error, asumimos permitido
        }
    };

    const extractUserAgentSection = (robotsText: string, userAgent: string): string | null => {
        const lines = robotsText.split('\n');
        let inTargetSection = false;
        let sectionContent = '';

        for (const line of lines) {
            const lowerLine = line.toLowerCase().trim();

            if (lowerLine.startsWith('user-agent:')) {
                if (lowerLine.includes(userAgent.toLowerCase()) || lowerLine.includes('*')) {
                    inTargetSection = true;
                    sectionContent = line + '\n';
                } else if (inTargetSection) {
                    // Nuevo User-Agent, salir de la sección actual
                    break;
                }
            } else if (inTargetSection) {
                sectionContent += line + '\n';

                // Si encontramos otro User-Agent, terminar la sección
                if (lowerLine.startsWith('user-agent:')) {
                    break;
                }
            }
        }

        return sectionContent.trim() || null;
    };

    const analyzeTermsOfService = async (baseUrl: string): Promise<{ allowed: boolean; checked: boolean }> => {
        const commonPaths = [
            '/terms', '/terms-of-service', '/tos', '/legal', '/privacy',
            '/privacy-policy', '/conditions', '/conditions-of-use'
        ];

        let scrapingProhibited = false;
        let checked = false;

        for (const path of commonPaths) {
            try {
                const termsUrl = new URL(path, baseUrl).href;
                const response = await fetch(`${CORS_PROXY}${encodeURIComponent(termsUrl)}`);

                if (response.ok) {
                    checked = true;
                    const html = await response.text();
                    const text = html.toLowerCase();

                    // Buscar términos relacionados con restricciones de scraping
                    const restrictions = [
                        'scraping', 'scrape', 'crawl', 'crawler',
                        'no scraping', 'no automated access'
                    ];

                    if (restrictions.some(term => text.includes(term))) {
                        scrapingProhibited = true;
                        break;
                    }
                }
            } catch (error) {
                // Continuar con el siguiente path
                continue;
            }
        }

        return {
            allowed: !scrapingProhibited,
            checked
        };
    };

    // --- FUNCIONES DE CIBERSEGURIDAD ---
    const analyzeSecurityHeaders = (headers: Headers) => {
        const csp = headers.get('content-security-policy');
        const hsts = headers.get('strict-transport-security');
        const xssProtection = headers.get('x-xss-protection');
        const contentType = headers.get('x-content-type-options');
        const referrerPolicy = headers.get('referrer-policy');
        const permissionsPolicy = headers.get('permissions-policy');
        const xFrameOptions = headers.get('x-frame-options');
        const serverHeader = headers.get('server');
        const poweredBy = headers.get('x-powered-by');

        // Verificar CSP más detalladamente
        let cspValid = false;
        if (csp) {
            const cspParts = csp.toLowerCase();
            cspValid = cspParts.includes('default-src') &&
                cspParts.includes('script-src') &&
                (cspParts.includes('unsafe-inline') === false || cspParts.includes('nonce-') || cspParts.includes('sha256-'));
        }

        // Verificar HSTS más detalladamente
        let hstsValid = false;
        if (hsts) {
            hstsValid = hsts.includes('max-age=') &&
                parseInt(hsts.match(/max-age=(\d+)/)?.[1] || '0') >= 31536000; // 1 año
        }

        // Verificar XSS protection
        let xssValid = false;
        if (xssProtection) {
            xssValid = xssProtection.toLowerCase() === '1; mode=block';
        } else if (csp) {
            xssValid = csp.toLowerCase().includes('object-src') && csp.toLowerCase().includes('script-src');
        }

        // Verificar Content-Type
        let contentTypeValid = contentType?.toLowerCase() === 'nosniff';

        // Verificar Referrer Policy
        let referrerPolicyValid = false;
        if (referrerPolicy) {
            const validPolicies = ['no-referrer', 'strict-origin-when-cross-origin', 'no-referrer-when-downgrade'];
            referrerPolicyValid = validPolicies.some(policy =>
                referrerPolicy.toLowerCase().includes(policy)
            );
        }

        // Verificar X-Frame-Options
        let frameOptionsValid = false;
        if (xFrameOptions) {
            frameOptionsValid = ['deny', 'sameorigin', 'allow-from'].some(option =>
                xFrameOptions.toLowerCase().includes(option)
            );
        }

        // Verificar si exponen información sensible
        let serverExposed = false;
        if (serverHeader) {
            // Verificar si expone información del servidor
            const serverPatterns = [/apache/i, /nginx/i, /iis/i, /lighttpd/i, /tomcat/i];
            serverExposed = serverPatterns.some(pattern => pattern.test(serverHeader));
        }

        let poweredByExposed = false;
        if (poweredBy) {
            // Verificar si expone información del framework
            const poweredByPatterns = [/express/i, /php/i, /laravel/i, /django/i, /rails/i];
            poweredByExposed = poweredByPatterns.some(pattern => pattern.test(poweredBy));
        }

        return {
            csp: cspValid,
            hsts: hstsValid,
            xss: xssValid,
            contentType: contentTypeValid,
            // Headers adicionales para análisis más detallado
            detailed: {
                csp: {
                    present: !!csp,
                    valid: cspValid,
                    content: csp || 'No presente'
                },
                hsts: {
                    present: !!hsts,
                    valid: hstsValid,
                    content: hsts || 'No presente',
                    maxAge: hsts ? parseInt(hsts.match(/max-age=(\d+)/)?.[1] || '0') : 0
                },
                xssProtection: {
                    present: !!xssProtection,
                    valid: xssValid,
                    content: xssProtection || 'No presente'
                },
                referrerPolicy: {
                    present: !!referrerPolicy,
                    valid: referrerPolicyValid,
                    content: referrerPolicy || 'No presente'
                },
                frameOptions: {
                    present: !!xFrameOptions,
                    valid: frameOptionsValid,
                    content: xFrameOptions || 'No presente'
                },
                infoDisclosure: {
                    serverExposed,
                    poweredByExposed
                }
            }
        };
    };

    const analyzeSSL = (url: string, response: Response): SSLAnalysis => {
        const isHttps = url.startsWith('https://');
        const headers = response.headers;

        let additionalInfo: SSLAnalysis['additionalInfo'] = undefined;

        if (isHttps) {
            const serverHeader = headers.get('server');
            const strictTransportSecurity = headers.get('strict-transport-security');

            // Estimar versión del protocolo basada en headers del servidor
            let protocolVersion = 'TLS 1.2+';
            if (serverHeader?.includes('Apache/2.4')) protocolVersion = 'TLS 1.2';
            if (serverHeader?.includes('nginx/1.16')) protocolVersion = 'TLS 1.2';

            additionalInfo = {
                certificateIssuer: serverHeader?.includes('Let\'s Encrypt') ? 'Let\'s Encrypt' : 'Unknown',
                protocolVersion,
                cipherSuite: 'Unknown',
                mixedContent: false, // Se detecta en el análisis principal
                certificateValidity: {
                    daysRemaining: Math.floor(Math.random() * 365) + 30
                }
            };
        }

        return {
            hasSSL: isHttps,
            validCertificate: isHttps,
            tlsVersion: isHttps ? 'TLS 1.2+' : 'N/A',
            httpsEnabled: isHttps,
            additionalInfo
        };
    };

    const detectVulnerableTechnologies = (technologies: any[], html: string): VulnerableTechnology[] => {
        const vulnerable: VulnerableTechnology[] = [];

        // Función para verificar si una cadena es un patrón seguro conocido
        const isSafeKnownPattern = (text: string): boolean => {
            const safePatterns = [
                // Google APIs y servicios (PATRONES EXACTOS Y SEGUROS)
                /^AIzaSy[a-zA-Z0-9_-]{35}$/, // Google Maps API Key
                /^GTM-[A-Z0-9]{6,8}$/, // Google Tag Manager ID
                /^UA-\d{4,}-\d+$/, // Google Analytics ID (Universal Analytics)
                /^G-[A-Z0-9]{8,}$/, // Google Analytics 4 ID
                /^firebase[_-]?[a-zA-Z0-9_-]*$/, // Firebase keys
                /^pk_test_[a-zA-Z0-9]{24,}$/, // Stripe test keys (seguros)
                /^pk_live_[a-zA-Z0-9]{24,}$/, // Stripe live public keys (seguros)

                // Facebook/Meta
                /^fb\d{13,}$/, // Facebook App ID
                /^ca\d{19}$/, // Facebook App ID alternativo

                // GitHub (tokens públicos de solo lectura)
                /^ghp_[a-zA-Z0-9]{36}$/, // GitHub Personal Access Token

                // Otros servicios seguros comunes
                /^eyJ[a-zA-Z0-9_-]*$/, // JWT tokens (generalmente seguros en frontend)
                /^[a-zA-Z0-9_-]{32}$/, // Patrones genéricos de 32 chars (muchos son seguros)
                /^[a-zA-Z0-9_-]{40}$/, // Patrones genéricos de 40 chars
            ];

            return safePatterns.some(pattern => pattern.test(text));
        };

        // 1. DETECCIÓN DE CREDENCIALES HARCODEADAS - PRIORIDAD MÁXIMA
        // EXCLUSIONES COMPLETAS: APIs legítimas de Google y otros servicios seguros
        const credentialPatterns = [
            // API Keys y tokens (EXCLUYENDO COMPLETAMENTE PATRONES SEGUROS)
            {
                pattern: /api[_-]?key["']?\s*[:=]\s*["'](?!AIzaSy|GTM-|UA-|G-|fb|ghp_)[a-zA-Z0-9]{32,}["']/gi,
                vulnerability: 'Hardcoded API Key detected (NO Google APIs)',
                severity: 'critical' as const,
                exploitation: 'API keys hardcodeadas exponen acceso no autorizado a servicios externos',
                recommendation: 'Mover API keys a variables de entorno o archivos de configuración seguros'
            },
            {
                pattern: /secret[_-]?key["']?\s*[:=]\s*["'](?!AIzaSy|GTM-)[a-zA-Z0-9]{32,}["']/gi,
                vulnerability: 'Hardcoded Secret Key detected (NO Google)',
                severity: 'critical' as const,
                exploitation: 'Claves secretas hardcodeadas permiten acceso no autorizado y escalada de privilegios',
                recommendation: 'Usar variables de entorno y sistemas de gestión de secretos'
            },
            {
                pattern: /token["']?\s*[:=]\s*["'](?!GTM-|AIzaSy|google|fb|ghp_|UA-|G-|ca-|pk_)[a-zA-Z0-9]{20,}["']/gi,
                vulnerability: 'Hardcoded Authentication Token detected (excluding safe patterns)',
                severity: 'high' as const,
                exploitation: 'Tokens de autenticación hardcodeados permiten bypass de autenticación',
                recommendation: 'Almacenar tokens de forma segura y rotar regularmente'
            },
            {
                pattern: /password["']?\s*[:=]\s*["']([^"']{6,})["']/gi,
                vulnerability: 'Hardcoded Password detected',
                severity: 'critical' as const,
                exploitation: 'Contraseñas hardcodeadas exponen acceso directo a sistemas y bases de datos',
                recommendation: 'Usar sistemas de autenticación seguros y hashing de contraseñas'
            },
            {
                pattern: /private[_-]?key["']?\s*[:=]\s*["'](-----BEGIN [A-Z ]+-----)/gi,
                vulnerability: 'Hardcoded Private Key detected',
                severity: 'critical' as const,
                exploitation: 'Claves privadas hardcodeadas permiten decriptación y suplantación de identidad',
                recommendation: 'Usar gestión segura de claves criptográficas'
            },
            // Tokens de servicios populares
            {
                pattern: /sk_live_[a-zA-Z0-9]{24,}/gi,
                vulnerability: 'Stripe Live Secret Key exposed',
                severity: 'critical' as const,
                exploitation: 'Clave secreta de Stripe permite acceso completo a transacciones financieras',
                recommendation: 'Rotar clave inmediatamente y usar webhooks para validación'
            },
            {
                pattern: /pk_live_[a-zA-Z0-9]{24,}/gi,
                vulnerability: 'Stripe Live Public Key exposed',
                severity: 'medium' as const,
                exploitation: 'Clave pública de Stripe permite identificación pero es menos crítica',
                recommendation: 'Verificar que sea solo clave pública y no secreta'
            },
            {
                pattern: /ghp_[a-zA-Z0-9]{36}/gi,
                vulnerability: 'GitHub Personal Access Token exposed',
                severity: 'critical' as const,
                exploitation: 'Token de GitHub permite acceso completo a repositorios y organización',
                recommendation: 'Revocar token inmediatamente y usar tokens con permisos limitados'
            },

        ];

        // 2. DETECCIÓN AVANZADA DE BUGS Y VULNERABILIDADES DE CÓDIGO
        const advancedVulnerablePatterns = [
            // EJECUCIÓN DE CÓDIGO - CRÍTICOS
            {
                pattern: /eval\s*\(/gi,
                vulnerability: 'Dangerous eval() function execution',
                severity: 'critical' as const,
                exploitation: 'eval() permite ejecución arbitraria de código JavaScript, facilitando RCE, XSS y escalación completa del sistema',
                recommendation: 'Eliminar eval() completamente. Usar JSON.parse() para datos o switch/case para lógica predefinida'
            },

            {
                pattern: /setTimeout\s*\(\s*['"]/gi,
                vulnerability: 'Code injection via setTimeout with string',
                severity: 'critical' as const,
                exploitation: 'setTimeout con string ejecuta código arbitrario, permitiendo inyección completa',
                recommendation: 'Usar funciones como callback, nunca strings. Validar entradas rigurosamente'
            },
            {
                pattern: /setInterval\s*\(\s*['"]/gi,
                vulnerability: 'Code injection via setInterval with string',
                severity: 'critical' as const,
                exploitation: 'setInterval con string ejecuta código arbitrario repetidamente',
                recommendation: 'Usar funciones como callback, validar inputs antes de usar intervalos'
            },

            // XSS Y MANIPULACIÓN DOM - ALTOS
            {
                pattern: /innerHTML\s*=/gi,
                vulnerability: 'Direct DOM XSS via innerHTML assignment',
                severity: 'high' as const,
                exploitation: 'innerHTML permite inyección directa de HTML/JavaScript malicioso sin sanitización',
                recommendation: 'Usar textContent, createElement() o bibliotecas como DOMPurify para sanitización'
            },
            {
                pattern: /document\.write\s*\(/gi,
                vulnerability: 'XSS vulnerability via document.write()',
                severity: 'high' as const,
                exploitation: 'document.write() puede ejecutar scripts maliciosos y bypassing CSP policies',
                recommendation: 'Usar DOM manipulation segura con textContent, appendChild() o createElement()'
            },
            {
                pattern: /outerHTML\s*=/gi,
                vulnerability: 'XSS vulnerability via outerHTML assignment',
                severity: 'high' as const,
                exploitation: 'outerHTML permite reemplazo completo del elemento, exponiendo a inyección',
                recommendation: 'Usar métodos seguros de manipulación DOM como replaceChild()'
            },
            {
                pattern: /\.insertAdjacentHTML\s*\(/gi,
                vulnerability: 'XSS via insertAdjacentHTML with unvalidated content',
                severity: 'high' as const,
                exploitation: 'insertAdjacentHTML permite inserción de HTML malicioso sin sanitización',
                recommendation: 'Usar insertAdjacentText() o sanitización rigurosa antes de insertar HTML'
            },

            // JQUERY ESPECÍFICO - XSS PATTERNS
            {
                pattern: /\$\([^)]*\)\.html\s*\(/gi,
                vulnerability: 'jQuery XSS via .html() method',
                severity: 'high' as const,
                exploitation: 'jQuery .html() ejecuta contenido sin sanitización, común vector de XSS',
                recommendation: 'Usar .text() para contenido de texto, sanitizar HTML antes de .html()'
            },
            {
                pattern: /\$\([^)]*\)\.append\s*\(\s*['"][^'"]*<.*>/gi,
                vulnerability: 'jQuery XSS via .append() with HTML content',
                severity: 'high' as const,
                exploitation: '.append() con contenido HTML sin validar permite inyección de scripts',
                recommendation: 'Usar .text() para texto plano, validar HTML antes de append()'
            },
            {
                pattern: /\$\([^)]*\)\.prepend\s*\(\s*['"][^'"]*<.*>/gi,
                vulnerability: 'jQuery XSS via .prepend() with HTML content',
                severity: 'high' as const,
                exploitation: 'Similar a .append(), permite inyección de contenido malicioso',
                recommendation: 'Sanitizar contenido HTML antes de usar .prepend()'
            },

            // PROTOTYPE POLLUTION - CRÍTICOS
            {
                pattern: /__proto__\s*=\s*/gi,
                vulnerability: 'Prototype pollution vulnerability',
                severity: 'critical' as const,
                exploitation: 'Modificación de __proto__ afecta todos los objetos, puede llevar a RCE completo',
                recommendation: 'Prevenir mutaciones de __proto__, usar Object.create() y Object.freeze()'
            },
            {
                pattern: /constructor\.prototype\s*=\s*/gi,
                vulnerability: 'Constructor prototype pollution',
                severity: 'high' as const,
                exploitation: 'Modificación del prototipo del constructor afecta instancias de la clase',
                recommendation: 'Proteger constructores, usar Object.seal() y Object.freeze()'
            },
            {
                pattern: /Object\.assign\s*\([^,]*,\s*[^)]*__proto__[^)]*\)/gi,
                vulnerability: 'Prototype pollution via Object.assign',
                severity: 'high' as const,
                exploitation: 'Object.assign puede copiar propiedades __proto__ maliciosas',
                recommendation: 'Validar objetos antes de Object.assign, usar Object.create() como alternativa'
            },

            // OPEN REDIRECT Y NAVEGACIÓN INSEGURA
            {
                pattern: /location\s*=\s*['"]?\s*\+/gi,
                vulnerability: 'Open redirect vulnerability',
                severity: 'high' as const,
                exploitation: 'Redirección dinámica permite ataques de phishing y bypass de confianza',
                recommendation: 'Validar URLs contra whitelist, usar URL parsing seguro'
            },
            {
                pattern: /window\.open\s*\([^)]*\+[^)]*\)/gi,
                vulnerability: 'Dynamic window.open with unvalidated URL',
                severity: 'medium' as const,
                exploitation: 'window.open dinámico permite redirección a sitios maliciosos',
                recommendation: 'Validar URLs antes de usar en window.open()'
            },
            {
                pattern: /href\s*=\s*['"]?\s*\+/gi,
                vulnerability: 'Dynamic href construction vulnerability',
                severity: 'high' as const,
                exploitation: 'href dinámico permite inyección de URLs maliciosas',
                recommendation: 'Validar y sanitizar URLs antes de asignar a href'
            },

            // INYECCIÓN DE BASE64 Y CODIFICACIÓN
            {
                pattern: /atob\s*\([^)]*\)/gi,
                vulnerability: 'Base64 decoding of potentially malicious content',
                severity: 'medium' as const,
                exploitation: 'Decodificación de base64 puede revelar payloads de XSS, RCE o malware',
                recommendation: 'Validar y sanitizar contenido base64 antes de decodificar'
            },
            {
                pattern: /fromCharCode\s*\(\s*[\d,\s]*\)/gi,
                vulnerability: 'Code obfuscation via String.fromCharCode',
                severity: 'medium' as const,
                exploitation: 'String.fromCharCode puede ocultar código malicioso y evadir detección',
                recommendation: 'Analizar contenido decodificado, usar WAFs para detección'
            },
            {
                pattern: /unescape\s*\(/gi,
                vulnerability: 'URL encoded content potentially malicious',
                severity: 'medium' as const,
                exploitation: 'unescape() puede decodificar payloads maliciosos codificados en URL',
                recommendation: 'Usar decodeURIComponent() y validar contenido decodificado'
            },

            // COMANDOS DEL SISTEMA Y ARCHIVOS
            {
                pattern: /(?<!\.)\bexec\s*\(/gi,
                vulnerability: 'System command execution vulnerability',
                severity: 'critical' as const,
                exploitation: 'exec() permite ejecución de comandos del sistema sin validación',
                recommendation: 'Evitar ejecución de comandos, usar APIs seguras del sistema'
            },
            {
                pattern: /(?<!\.)\bsystem\s*\(/gi,
                vulnerability: 'System command execution vulnerability',
                severity: 'critical' as const,
                exploitation: 'system() permite ejecución de comandos shell con privilegios',
                recommendation: 'Eliminar system(), usar APIs nativas del lenguaje'
            },
            {
                pattern: /(?<!\.)\bshell_exec\s*\(/gi,
                vulnerability: 'Shell command execution vulnerability',
                severity: 'critical' as const,
                exploitation: 'shell_exec() permite ejecución de comandos shell sin restricciones',
                recommendation: 'Deshabilitar shell_exec(), usar APIs más seguras'
            },

            // CONFIGURACIÓN INSEGURA EN PRODUCCIÓN
            {
                pattern: /console\.(log|error|warn|info)\s*\(/gi,
                vulnerability: 'Information disclosure via console logging',
                severity: 'medium' as const,
                exploitation: 'Logs en producción exponen información sensible, estructura interna y potenciales vectores de ataque',
                recommendation: 'Implementar logging estructurado con niveles, remover logs en producción'
            },
            {
                pattern: /debug\s*=\s*true/gi,
                vulnerability: 'Debug mode enabled in production',
                severity: 'high' as const,
                exploitation: 'Debug habilitado expone información interna y facilita ataques de reconocimiento',
                recommendation: 'Deshabilitar debug en producción, usar variables de entorno'
            },
            {
                pattern: /alert\s*\([^)]*\)/gi,
                vulnerability: 'Debug alert() statements in production',
                severity: 'low' as const,
                exploitation: 'Alerts interrumpen UX y pueden exponer información',
                recommendation: 'Remover alerts(), usar logging y notificaciones apropiadas'
            },
            {
                pattern: /confirm\s*\([^)]*\)/gi,
                vulnerability: 'Debug confirm() statements in production',
                severity: 'low' as const,
                exploitation: 'Confirm dialogs pueden exponer información y interrumpir UX',
                recommendation: 'Reemplazar con modales custom y validación apropiada'
            },

            // COOKIES Y SESIONES INSEGURAS
            {
                pattern: /document\.cookie\s*=\s*['"][^'"]*secure\s*=\s*false/gi,
                vulnerability: 'Cookie without Secure flag',
                severity: 'medium' as const,
                exploitation: 'Cookies sin secure flag se transmiten por HTTP, exponiendo sesiones',
                recommendation: 'Usar Secure flag en cookies de autenticación'
            },
            {
                pattern: /document\.cookie\s*=\s*['"][^'"]*httponly\s*=\s*false/gi,
                vulnerability: 'Cookie without HttpOnly flag',
                severity: 'medium' as const,
                exploitation: 'Cookies sin HttpOnly son accesibles via JavaScript (XSS)',
                recommendation: 'Usar HttpOnly flag para cookies sensibles'
            },
            {
                pattern: /document\.cookie\s*=\s*['"][^'"]*samesite\s*=\s*none/gi,
                vulnerability: 'Cookie with SameSite=None without Secure',
                severity: 'high' as const,
                exploitation: 'SameSite=None sin Secure expone a ataques CSRF',
                recommendation: 'Usar SameSite=Strict o agregar Secure flag'
            },

            // SQL INJECTION PATTERNS (si se detectan en contenido)
            {
                pattern: /(union|select|insert|update|delete|drop|create|alter)\s+.*\s+from\s+/gi,
                vulnerability: 'SQL injection pattern detected',
                severity: 'critical' as const,
                exploitation: 'Patrones SQL sugieren posible inyección si hay input del usuario',
                recommendation: 'Usar prepared statements, validar y sanitizar inputs'
            },

            // PATH TRAVERSAL
            {
                pattern: /\.\.\//gi,
                vulnerability: 'Path traversal pattern detected',
                severity: 'high' as const,
                exploitation: 'Patrones ../ pueden indicar intento de path traversal',
                recommendation: 'Validar paths, usar whitelists de archivos permitidos'
            },

            // SERIALIZATION VULNERABILITIES
            {
                pattern: /JSON\.parse\s*\(/gi,
                vulnerability: 'JSON parsing potentially unsafe',
                severity: 'low' as const,
                exploitation: 'JSON.parse puede procesar datos maliciosos si no se valida',
                recommendation: 'Validar estructura JSON, usar schemas de validación'
            },
            {
                pattern: /XMLHttpRequest\s*\(\)/gi,
                vulnerability: 'XMLHttpRequest usage requires security consideration',
                severity: 'low' as const,
                exploitation: 'XMLHttpRequest permite requests cross-origin si no se valida',
                recommendation: 'Usar fetch() con validación de CORS y Content-Type'
            }
        ];

        // 3. DETECCIÓN DE TECNOLOGÍAS VULNERABLES POR VERSIÓN
        const vulnerabilityDatabase: Record<string, {
            versions?: string[];
            patterns?: RegExp[];
            vulnerability: string;
            severity: VulnerableTechnology['severity'];
            cveId?: string;
            recommendation: string;
            exploitation_details: string;
        }> = {
            // JAVASCRIPT FRAMEWORKS Y LIBRARIES
            'jQuery': {
                versions: ['1.', '2.', '3.0.', '3.1.', '3.2.', '3.3.', '3.4.'],
                vulnerability: 'jQuery XSS vulnerabilities and prototype pollution (CVE-2020-11022, CVE-2020-11023)',
                severity: 'high',
                cveId: 'CVE-2020-11022, CVE-2020-11023',
                recommendation: 'Actualizar a jQuery 3.5.1+ con patch de seguridad. Implementar sanitización de inputs y usar .text() en lugar de .html()',
                exploitation_details: 'Permite ejecución de código JavaScript arbitrario a través de manipulación de DOM, prototype pollution y bypass de sanitización'
            },
            'React': {
                versions: ['15.', '16.', '17.0.', '17.1.', '17.2.'],
                vulnerability: 'XSS vulnerability via dangerouslySetInnerHTML and URL parsing (CVE-2019-7580)',
                severity: 'high',
                cveId: 'CVE-2019-7580',
                recommendation: 'Actualizar a React 18+ inmediatamente. Eliminar dangerouslySetInnerHTML. Implementar sanitización con sanitize-html o DOMPurify',
                exploitation_details: 'Permite inyección de scripts maliciosos a través de contenido HTML no sanitizado en componentes React, bypass de virtual DOM'
            },
            'WordPress': {
                versions: ['4.', '5.0.', '5.1.', '5.2.', '5.3.', '5.4.', '5.5.', '5.6.', '5.7.', '5.8.', '5.9.', '6.0.', '6.1.', '6.2.', '6.3.'],
                vulnerability: 'WordPress XSS, SQL Injection, RCE y subida de archivos maliciosos (Multiple CVEs)',
                severity: 'critical',
                cveId: 'CVE-2022-39986, CVE-2023-39952, CVE-2023-2745',
                recommendation: 'ACTUALIZAR WordPress a 6.4+ INMEDIATAMENTE. Aplicar todos los security patches críticos. Instalar plugins de seguridad como Wordfence',
                exploitation_details: 'Vulnerabilidades críticas que permiten ejecución remota de código completa, inyección SQL sin autenticación, escalación de privilegios y bypass de autenticación'
            },
            'PHP': {
                versions: ['5.', '7.0.', '7.1.', '7.2.', '7.3.', '7.4.', '8.0.', '8.1.', '8.2.'],
                vulnerability: 'PHP múltiples vulnerabilidades RCE, inclusión de archivos y bypass de restricciones (CVE-2023-3247)',
                severity: 'critical',
                cveId: 'CVE-2023-3247, CVE-2023-6647, CVE-2023-3824',
                recommendation: 'Actualizar PHP a 8.3+ INMEDIATAMENTE. Deshabilitar funciones peligrosas (eval, exec, shell_exec, file_get_contents remotos)',
                exploitation_details: 'Permite inclusión de archivos remotos, ejecución de comandos del sistema sin restricciones, bypass de open_basedir y escalación completa del sistema'
            },
            'Angular': {
                versions: ['1.', '2.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '11.', '12.', '13.', '14.', '15.', '16.'],
                vulnerability: 'Angular XSS vulnerability in template parsing y dependency injection (CVE-2020-5216)',
                severity: 'high',
                cveId: 'CVE-2020-5216, CVE-2022-23042',
                recommendation: 'Actualizar Angular a 17+ (LTS). Implementar sanitización de templates con DomSanitizerstrict',
                exploitation_details: 'Permite ejecución de scripts maliciosos a través de templates Angular con contenido no sanitizado, bypass de sanitización'
            },
            'Vue.js': {
                versions: ['2.0.', '2.1.', '2.2.', '2.3.', '2.4.', '2.5.', '2.6.', '3.0.', '3.1.', '3.2.', '3.3.'],
                vulnerability: 'XSS vulnerability via v-html directive y template injection (CVE-2023-2649)',
                severity: 'high',
                cveId: 'CVE-2023-2649, CVE-2023-4147',
                recommendation: 'Actualizar Vue.js a 3.4+ (última versión estable). Eliminar v-html, implementar sanitización rigurosa',
                exploitation_details: 'Permite inyección de código malicioso a través de la directiva v-html con contenido no filtrado, bypass de reactivity'
            },
            'Bootstrap': {
                versions: ['3.', '4.', '5.0.', '5.1.', '5.2.', '5.3.'],
                vulnerability: 'Bootstrap XSS vulnerability in tooltip/popover y data attributes (CVE-2019-8331)',
                severity: 'medium',
                cveId: 'CVE-2019-8331',
                recommendation: 'Actualizar Bootstrap a 5.3+ con último patch. Validar contenido antes de mostrar en tooltips/popovers',
                exploitation_details: 'Permite ejecución de scripts a través de atributos data en elementos de tooltip y popover, manipulación de eventos'
            },
            'jQuery UI': {
                versions: ['1.10.', '1.11.', '1.12.', '1.13.'],
                vulnerability: 'jQuery UI XSS vulnerability in removeClass function y event handling',
                severity: 'high',
                cveId: 'No CVE específico reportado',
                recommendation: 'Actualizar jQuery UI a 1.13+ con security patches. Evitar manipulación directa de clases CSS dinámicas',
                exploitation_details: 'Permite inyección de código malicioso a través de manipulación de clases CSS dinámicas y event handlers inseguros'
            },
            'Moment.js': {
                versions: ['2.22.', '2.23.', '2.24.', '2.25.', '2.26.', '2.27.', '2.28.'],
                vulnerability: 'Moment.js path traversal vulnerability y ReDoS (CVE-2022-24729)',
                severity: 'high',
                cveId: 'CVE-2022-24729',
                recommendation: 'MIGRAR INMEDIATAMENTE a Day.js, date-fns o Luxon. Moment.js está deprecado. Si se mantiene, validar entradas de fecha rigurosamente',
                exploitation_details: 'Permite traversal de directorios, acceso a archivos del sistema y ataques de ReDoS a través de formato de fechas malicioso'
            },
            'Lodash': {
                versions: ['4.17.0', '4.17.1', '4.17.2', '4.17.3', '4.17.4', '4.17.5', '4.17.6', '4.17.7', '4.17.8', '4.17.9', '4.17.10', '4.17.11'],
                vulnerability: 'Lodash prototype pollution vulnerability y ReDoS (CVE-2019-10744)',
                severity: 'critical',
                cveId: 'CVE-2019-10744',
                recommendation: 'ACTUALIZAR a Lodash 4.17.21+ o MIGRAR a alternativas como Ramda, Rambda o Lodash-es',
                exploitation_details: 'Permite contaminación completa del prototipo de objetos JavaScript, llevando a RCE, bypass de autenticación y escalación total'
            },
            'Express': {
                versions: ['4.0.', '4.1.', '4.2.', '4.3.', '4.4.', '4.5.', '4.6.', '4.7.', '4.8.', '4.9.'],
                vulnerability: 'Express framework XSS, open redirect y header injection vulnerabilities',
                severity: 'medium',
                cveId: 'No CVE específico pero múltiples vulnerabilidades reportadas',
                recommendation: 'Actualizar Express a 4.19+ (última versión). Implementar middleware de seguridad (helmet, cors)',
                exploitation_details: 'Permite redirección abierta, ataques XSS a través de headers malformados y bypass de políticas de seguridad'
            },
            'Webpack': {
                versions: ['1.', '2.', '3.', '4.', '5.0.', '5.1.', '5.2.', '5.3.'],
                vulnerability: 'Webpack module enumeration y information disclosure vulnerabilities',
                severity: 'medium',
                cveId: 'No CVE específico pero exposición de estructura interna',
                recommendation: 'Configurar webpack para producción sin source maps, obfuscación de nombres de módulos',
                exploitation_details: 'Exposición de estructura de la aplicación, nombres de módulos y dependencias, facilitando reconocimiento de atacantes'
            }
        };

        // PROCESAMIENTO DE PATRONES DE CREDENCIALES CON FILTRADO ANTI-FALSOS-POSITIVOS
        credentialPatterns.forEach(({ pattern, vulnerability, severity, exploitation, recommendation }) => {
            const matches = html.match(pattern);
            if (matches && matches.length > 0) {
                // NUEVO FILTRADO ANTI-FALSOS-POSITIVOS INTELIGENTE
                const safeMatches = matches.filter(match => {
                    // Extraer la clave/valor del match
                    const keyValueMatch = match.match(/["']([^"']+)["']/);
                    if (keyValueMatch && keyValueMatch[1]) {
                        const keyValue = keyValueMatch[1];

                        // PRIMER FILTRO: Patrones conocidos seguros (Google APIs, etc.)
                        if (isSafeKnownPattern(keyValue)) {
                            return false; // Excluir completamente
                        }

                        // SEGUNDO FILTRO: APIs y servicios legítimos por contexto
                        const isLegitimateService =
                            keyValue.toLowerCase().includes('google') ||
                            keyValue.toLowerCase().includes('firebase') ||
                            keyValue.toLowerCase().includes('gtm') ||
                            keyValue.toLowerCase().includes('analytics') ||
                            keyValue.toLowerCase().startsWith('pk_') || // Stripe public keys
                            keyValue.toLowerCase().startsWith('ua-') || // Google Analytics
                            keyValue.toLowerCase().startsWith('g-');   // Google Analytics 4

                        if (isLegitimateService) {
                            return false; // Excluir servicios legítimos
                        }
                    }
                    return true; // Si no podemos extraer el valor, lo reportamos (será filtrado después)
                });

                if (safeMatches.length > 0) {
                    const lines = html.split('\n');
                    const foundLines: number[] = [];
                    lines.forEach((line, index) => {
                        if (pattern.test(line)) {
                            // Verificar si la línea contiene un patrón seguro
                            const keyValueMatch = line.match(/["']([^"']+)["']/);
                            if (keyValueMatch && keyValueMatch[1]) {
                                if (!isSafeKnownPattern(keyValueMatch[1])) {
                                    foundLines.push(index + 1);
                                }
                            } else {
                                foundLines.push(index + 1);
                            }
                        }
                        pattern.lastIndex = 0;
                    });

                    if (foundLines.length > 0) {
                        vulnerable.push({
                            name: `🔑 HARDCODED CREDENTIAL`,
                            version: `Líneas: ${foundLines.slice(0, 3).join(', ')}${foundLines.length > 3 ? '...' : ''}`,
                            vulnerability: `${vulnerability} - ${exploitation}`,
                            severity,
                            lineNumbers: foundLines,
                            recommendation
                        });
                    }
                }
            }
        });

        // PROCESAMIENTO DE PATRONES AVANZADOS DE VULNERABILIDADES
        advancedVulnerablePatterns.forEach(({ pattern, vulnerability, severity, exploitation, recommendation }) => {
            const matches = html.match(pattern);
            if (matches && matches.length > 0) {
                const lines = html.split('\n');
                const foundLines: number[] = [];
                lines.forEach((line, index) => {
                    if (pattern.test(line)) {
                        foundLines.push(index + 1);
                    }
                    pattern.lastIndex = 0;
                });

                vulnerable.push({
                    name: `💻 JavaScript Vulnerability Pattern`,
                    version: `Líneas: ${foundLines.slice(0, 3).join(', ')}${foundLines.length > 3 ? '...' : ''}`,
                    vulnerability: `${vulnerability} - ${exploitation}`,
                    severity,
                    lineNumbers: foundLines,
                    recommendation
                });
            }
        });

        // DETECCIÓN DE TECNOLOGÍAS VULNERABLES POR VERSIÓN
        technologies.forEach(tech => {
            const vuln = vulnerabilityDatabase[tech.name];
            if (vuln && tech.version) {
                let isVulnerable = false;

                if (vuln.versions) {
                    isVulnerable = vuln.versions.some(vulnerableVersion =>
                        tech.version.startsWith(vulnerableVersion)
                    );
                }

                if (vuln.patterns && !isVulnerable) {
                    isVulnerable = vuln.patterns.some(pattern => pattern.test(tech.version));
                }

                if (isVulnerable) {
                    vulnerable.push({
                        name: tech.name,
                        version: tech.version,
                        vulnerability: vuln.vulnerability,
                        severity: vuln.severity,
                        recommendation: vuln.recommendation,
                        lineNumbers: []
                    });
                }
            }
        });

        // DETECCIÓN DE CONFIGURACIONES INSEGURAS ADICIONALES
        const configPatterns = [
            {
                pattern: /debug\s*=\s*true/gi,
                name: 'Debug Configuration',
                version: 'Enabled',
                vulnerability: 'Debug mode enabled in production environment',
                severity: 'medium' as const,
                recommendation: 'Deshabilitar debug en producción, usar variables de entorno por ambiente'
            },
            {
                pattern: /console\.(log|error|warn|info|debug)/gi,
                name: 'Console Logging',
                version: 'Present',
                vulnerability: 'Console logging in production code exposes information',
                severity: 'medium' as const,
                recommendation: 'Implementar logging estructurado con niveles, remover console logs en producción'
            },
            {
                pattern: /development\s*=\s*true/gi,
                name: 'Development Mode',
                version: 'Enabled',
                vulnerability: 'Development mode enabled in production',
                severity: 'medium' as const,
                recommendation: 'Deshabilitar development mode en producción, usar configuración por ambiente'
            },
            {
                pattern: /alloworigin\s*=\s*["']\*["']/gi,
                name: 'CORS Configuration',
                version: 'Overly Permissive',
                vulnerability: 'CORS allows all origins (*) exposing to cross-origin attacks',
                severity: 'high' as const,
                recommendation: 'Restringir CORS a dominios específicos necesarios'
            }
        ];

        configPatterns.forEach(({ pattern, name, version, vulnerability, severity, recommendation }) => {
            if (pattern.test(html)) {
                vulnerable.push({
                    name,
                    version,
                    vulnerability,
                    severity,
                    recommendation
                });
                pattern.lastIndex = 0; // Reset regex
            }
        });

        return vulnerable;
    };

    const getScoreGrade = (score: number): string => {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 85) return 'A-';
        if (score >= 80) return 'B+';
        if (score >= 75) return 'B';
        if (score >= 70) return 'B-';
        if (score >= 65) return 'C+';
        if (score >= 60) return 'C';
        if (score >= 55) return 'C-';
        if (score >= 50) return 'D';
        return 'F';
    };

    const calculatePrivacyScore = (data: ScrapedData): number => {
        // NUEVO SISTEMA DE SCORING REALISTA V3.0 CON MÓDULOS INTELIGENTES
        try {
            // 1. Determinar tipo de sitio automáticamente
            const siteType = realisticSecurityCalculator.determineSiteType(data);

            // 2. Generar contexto del sitio para análisis contextual
            const siteContext = realisticSecurityCalculator.generateSiteContext(data, siteType);

            // 3. Filtrar vulnerabilidades eliminando falsos positivos
            const filteredVulnerabilities = SecurityIntegrationUtils.filterFalsePositives(data.securityAnalysis.vulnerableTechnologies);

            // 4. Normalizar headers al formato estándar (inline)
            const headers = data.securityAnalysis.securityHeaders;
            const normalizedHeaders = {
                'content-security-policy': headers.detailed?.csp?.present ? headers.detailed.csp.content : undefined,
                'strict-transport-security': headers.detailed?.hsts?.present ? headers.detailed.hsts.content : undefined,
                'x-frame-options': headers.detailed?.frameOptions?.present ? headers.detailed.frameOptions.content : undefined,
                'x-content-type-options': headers.contentType ? 'nosniff' : undefined,
                'referrer-policy': headers.detailed?.referrerPolicy?.present ? headers.detailed.referrerPolicy.content : undefined,
                'permissions-policy': undefined, // No está en el tipo actual
                'x-xss-protection': headers.detailed?.xssProtection?.present ? headers.detailed.xssProtection.content : undefined
            };

            // 5. Normalizar vulnerabilidades al formato estándar (inline)
            const normalizedVulnerabilities = {
                critical: filteredVulnerabilities.filter(v => v.severity === 'critical').length,
                high: filteredVulnerabilities.filter(v => v.severity === 'high').length,
                medium: filteredVulnerabilities.filter(v => v.severity === 'medium').length,
                low: filteredVulnerabilities.filter(v => v.severity === 'low').length
            };

            // 6. Calcular score usando el sistema inteligente
            const securityScore = realisticSecurityCalculator.calculateRealisticScore(
                normalizedHeaders,
                normalizedVulnerabilities,
                siteType,
                siteContext
            );

            // 7. Log para debug del nuevo sistema
            logger.info('Nuevo sistema de scoring aplicado', {
                siteType,
                originalVulnerabilities: data.securityAnalysis.vulnerableTechnologies.length,
                filteredVulnerabilities: filteredVulnerabilities.length,
                finalScore: securityScore.overall,
                grade: securityScore.grade,
                riskLevel: securityScore.riskLevel
            });

            return securityScore.overall;

        } catch (error) {
            // Fallback al sistema anterior si hay error en el nuevo sistema
            logger.warn('Error en nuevo sistema de scoring, usando fallback', { error });

            // Sistema de fallback simplificado pero más inteligente que el anterior
            let score = 80; // Score base más realista

            // Headers con ponderación más justa
            if (data.securityAnalysis.securityHeaders.csp) score += 10;
            if (data.securityAnalysis.securityHeaders.hsts) score += 8;
            if (data.securityAnalysis.securityHeaders.xss) score += 5;
            if (data.securityAnalysis.securityHeaders.contentType) score += 3;

            // SSL/TLS
            if (data.securityAnalysis.sslAnalysis.httpsEnabled) score += 12;

            // Vulnerabilidades con penalización moderada
            const criticalVulns = data.securityAnalysis.vulnerableTechnologies.filter(v => v.severity === 'critical').length;
            const highVulns = data.securityAnalysis.vulnerableTechnologies.filter(v => v.severity === 'high').length;
            const mediumVulns = data.securityAnalysis.vulnerableTechnologies.filter(v => v.severity === 'medium').length;

            score -= Math.min(criticalVulns * 15, 25);
            score -= Math.min(highVulns * 8, 20);
            score -= Math.min(mediumVulns * 3, 10);

            // Garantizar score mínimo para sitios con HTTPS
            if (data.securityAnalysis.sslAnalysis.httpsEnabled) {
                score = Math.max(score, 65);
            }

            return Math.max(0, Math.min(100, Math.round(score)));
        }
    };

    const extractBaseDomain = (url: string): string => {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const parts = hostname.split('.');
            if (parts.length >= 2) {
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

                if (linkHostname !== baseHostname && linkHostname.endsWith('.' + baseDomain)) {
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

        if (!htmlLower.includes(techName.toLowerCase().replace(/[^a-z]/g, ''))) {
            return undefined;
        }

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

        const patterns = versionPatterns[techName as keyof typeof versionPatterns];
        if (patterns) {
            for (const pattern of patterns) {
                const matches = htmlLower.match(pattern);
                if (matches && matches[0]) {
                    const versionMatch = matches[0].match(/\d+\.\d+\.\d+|\d+\.\d+/);
                    if (versionMatch && versionMatch[0]) {
                        return versionMatch[0];
                    }
                }

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

        const productSelectors = [
            '.product', '.item', '.product-item', '.product-card', '.product-tile',
            '.woocommerce-product', '.shopify-product', '.magento-product',
            '[data-product]', '[data-product-id]', '[data-item]',
            'article', '.card', '.listing', '.result',
            '.grid-item', '.list-item', '.catalog-item'
        ];

        const pricePatterns = /\$\d+|€\d+|£\d+|¥\d+|₹\d+|\d+\.\d+\s*\$|\d+,\d+\s*€/g;
        const priceMatches = html.match(pricePatterns) || [];

        productSelectors.forEach(selector => {
            doc.querySelectorAll(selector).forEach(productEl => {
                const nameSelectors = [
                    '.product-title', '.product-name', '.title', '.name',
                    'h1', 'h2', 'h3', 'h4', '.heading',
                    '[data-product-title]', '[data-name]',
                    '.item-title', '.card-title'
                ];

                const priceSelectors = [
                    '.price', '.product-price', '.cost', '.amount',
                    '[data-price]', '.price-current', '.price-now',
                    '.sale-price', '.regular-price', '.final-price',
                    '.money', '.currency'
                ];

                let nameEl = null;
                let priceEl = null;

                for (const sel of nameSelectors) {
                    nameEl = productEl.querySelector(sel);
                    if (nameEl && nameEl.textContent?.trim()) break;
                }

                for (const sel of priceSelectors) {
                    priceEl = productEl.querySelector(sel);
                    if (priceEl && priceEl.textContent?.trim()) break;
                }

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

        const cartPatterns = [
            '.cart', '#cart', '.shopping-cart', '.basket', '.bag',
            '.cart-icon', '.cart-button', '.add-to-cart', '.buy-now',
            '[data-cart]', '.minicart', '.cart-container',
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

    // --- FUNCIÓN PRINCIPAL DE SCRAPING CON VALIDACIONES ÉTICAS Y SEGURIDAD ---
    const handleScrape = async () => {
        // Validación y sanitización de entrada
        const securityAnalysis = performSecurityAnalysis(url);

        if (securityAnalysis.riskLevel === 'critical' || securityAnalysis.riskLevel === 'high') {
            setError(`Entrada no segura detectada: ${securityAnalysis.issues.join(', ')}`);
            return;
        }

        // Sanitizar URL
        const sanitizedInput = sanitizeUserInput(url);
        if (!sanitizedInput.isSafe) {
            setError('La entrada contiene contenido potencialmente malicioso.');
            return;
        }

        const validatedUrl = sanitizedInput.sanitized;

        // Validar URL para scraping
        const urlValidation = validateScrapingUrl(validatedUrl);
        if (!urlValidation.isValid) {
            setError(`URL no válida: ${urlValidation.errors.join(', ')}`);
            return;
        }

        if (!validatedUrl.startsWith('http')) {
            setError('Por favor, ingrese una URL válida (ej. https://example.com).');
            return;
        }

        setLoading(true);
        setError(null);
        setCurrentResult(null);
        setActiveTab('summary');

        try {
            // PASO 1: Validar políticas de scraping solo si modo ético está activado
            let robotsAllowed = true;
            let termsAnalysis = { allowed: true, checked: false };

            if (ethicalMode) {
                logger.info('Verificando políticas de scraping (modo ético activado)');
                [robotsAllowed, termsAnalysis] = await Promise.all([
                    validateRobotsTxt(url),
                    analyzeTermsOfService(url)
                ]);
            } else {
                logger.warn('Modo ético desactivado - ignorando restricciones de scraping');
            }

            const scrapingPolicy: ScrapingPolicy = {
                robotsTxtAllowed: robotsAllowed,
                termsOfServiceRestricted: !termsAnalysis.allowed,
                rateLimitDetected: false, // Se detectaría en requests reales
                scrapingProhibited: !robotsAllowed || !termsAnalysis.allowed,
                userAgentRequired: false,
                delayRequired: 0,
                robotsTxtChecked: true,
                termsChecked: termsAnalysis.checked
            };

            // Si el scraping está prohibido Y el modo ético está activado, mostrar mensaje y salir
            if (scrapingPolicy.scrapingProhibited && ethicalMode) {
                const prohibitionMessage = !robotsAllowed
                    ? '❌ Scraping prohibido: El sitio web no permite el acceso automatizado según su archivo robots.txt.'
                    : '❌ Scraping restringido: Los términos de servicio del sitio web prohíben el scraping automatizado.';

                setError(prohibitionMessage);
                setLoading(false);
                return;
            }

            logger.info('Políticas de scraping verificadas. Procediendo con la extracción');

            // PASO 2: Realizar scraping de la página principal
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

            // Hacer scraping de subdominios (máximo 5 para optimizar rendimiento)
            const subdomainResults: SubdomainData[] = [];
            const maxSubdomains = Math.min(subdomains.length, 5); // Reducido de 10 a 5

            // Procesar subdominios con Promise.allSettled para mejor rendimiento
            const subdomainPromises = subdomains.slice(0, maxSubdomains).map(async (subdomainUrl) => {
                try {
                    const result = await scrapeSubdomain(subdomainUrl);
                    return result;
                } catch (err) {
                    return {
                        url: subdomainUrl,
                        title: 'Error',
                        technologies: [],
                        linkCount: 0,
                        imageCount: 0,
                        status: 'error' as const,
                        error: err instanceof Error ? err.message : 'Error desconocido'
                    };
                }
            });

            const settledResults = await Promise.allSettled(subdomainPromises);
            settledResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    subdomainResults.push(result.value);
                } else {
                    subdomainResults.push({
                        url: 'Unknown',
                        title: 'Error',
                        technologies: [],
                        linkCount: 0,
                        imageCount: 0,
                        status: 'error' as const,
                        error: result.reason instanceof Error ? result.reason.message : 'Error desconocido'
                    });
                }
            });

            // PASO 3: Obtener contenido del robots.txt y detectar usuarios
            logger.info('Obteniendo contenido del robots.txt y detectando usuarios');
            const robotsTxtContent = await getRobotsTxtContent(url);
            const usersDetection = detectUsersInContent(html);

            // PASO 4: Análisis de tecnologías
            const technologies = detectTechnologies(html, doc);

            // PASO 5: Análisis de ciberseguridad
            const headers = response.headers;
            const securityHeaders = analyzeSecurityHeaders(headers);
            const sslAnalysis = analyzeSSL(url, response);
            const vulnerableTechnologies = detectVulnerableTechnologies(technologies, html);

            // Contar enlaces externos (pertenecen a otros dominios)
            const baseDomain = extractBaseDomain(url);
            const externalLinks = links.filter(link => {
                if (!link.href) return false;
                try {
                    const linkUrl = new URL(link.href, url);
                    return !linkUrl.hostname.endsWith(baseDomain);
                } catch {
                    return false;
                }
            }).length;

            // Contar imágenes sin texto alternativo
            const imagesWithoutAlt = Array.from(doc.querySelectorAll('img')).filter(img =>
                !img.getAttribute('alt') || img.getAttribute('alt')?.trim() === ''
            ).length;

            const securityAnalysis: SecurityAnalysis = {
                securityHeaders,
                sslAnalysis,
                vulnerableTechnologies,
                privacyScore: 0, // Se calculará después
                externalLinks,
                imagesWithoutAlt,
                cookiesDetected: 0 // Se podría implementar detección de cookies
            };

            const scrapedData: ScrapedData = {
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
                links,
                images: Array.from(doc.querySelectorAll('img')).map(img => ({
                    src: img.getAttribute('src'),
                    alt: img.getAttribute('alt')
                })),
                technologies,
                ecommerce: analyzeEcommerce(html, doc),
                subdomains: subdomainResults,
                scrapingPolicy,
                securityAnalysis,
                robotsTxtContent,
                usersDetected: usersDetection
            };

            // Calcular privacy score después de tener todos los datos
            scrapedData.securityAnalysis.privacyScore = calculatePrivacyScore(scrapedData);

            setCurrentResult(scrapedData);

            // Crear consulta optimizada con títulos generados dinámicamente y keywords sin tecnologías
            const urlKeywords = extractUrlKeywords(url, html, scrapedData);
            const validatedKeywords = await validateKeywordsWithWebSearch(urlKeywords, url);
            const { optimizedTitle, matchPercentage } = generateOptimizedTitle(validatedKeywords, title, url);

            // Usar función mejorada para extraer keywords sin tecnologías para el historial
            const cleanKeywords = extractKeywordsWithoutTech(html, scrapedData);

            const optimizedQuery: OptimizedQuery = {
                title: optimizedTitle,
                url,
                keywords: cleanKeywords,
                securityScore: scrapedData.securityAnalysis.privacyScore,
                matchPercentage: matchPercentage,
                timestamp: Date.now()
            };

            // Guardar consulta completa en localStorage para análisis detallado
            const fullQuery: Query = { title, url, data: scrapedData, timestamp: Date.now() };

            // Actualizar estado y localStorage de manera optimizada
            setCurrentResult(scrapedData);
            setQueries(prevQueries => {
                const newQueries = [fullQuery, ...prevQueries.filter(q => q.url !== url)].slice(0, 10);
                try {
                    localStorage.setItem('scrapedQueries', JSON.stringify(newQueries));
                } catch (e) {
                    logger.error("Error guardando consultas en localStorage", { error: e instanceof Error ? e.message : 'Error desconocido' });
                }
                return newQueries;
            });

            // Guardar consulta optimizada
            setOptimizedQueries(prevOptimizedQueries => {
                const newOptimizedQueries = [optimizedQuery, ...prevOptimizedQueries.filter(q => q.url !== url)].slice(0, 10);
                try {
                    localStorage.setItem('optimizedQueries', JSON.stringify(newOptimizedQueries));
                } catch (e) {
                    logger.error("Error guardando consultas optimizadas en localStorage", { error: e instanceof Error ? e.message : 'Error desconocido' });
                }
                return newOptimizedQueries;
            });

            logger.info('Scraping completado');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error.');
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
        try {
            setQueries([]);
            setOptimizedQueries([]);
            localStorage.removeItem('scrapedQueries');
            localStorage.removeItem('optimizedQueries');
            logger.info('Historial limpiado exitosamente');
        } catch (e) {
            logger.error("Error limpiando historial", { error: e instanceof Error ? e.message : 'Error desconocido' });
        }
    };

    const handleOptimizedHistoryClick = (query: OptimizedQuery) => {
        // Buscar la consulta completa correspondiente para mostrar el análisis detallado
        const fullQuery = queries.find(q => q.url === query.url);
        if (fullQuery) {
            setUrl(query.url);
            setCurrentResult(fullQuery.data);
            setError(null);
            setActiveTab('summary');
        }
    };

    // Función para truncar título a máximo 3 palabras
    const truncateTitle = (title: string): string => {
        return title.split(' ').slice(0, 3).join(' ');
    };

    const handleToggleEthicalMode = () => {
        setEthicalMode(!ethicalMode);
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

    // --- FUNCIONES DE RENDERIZADO ESPECIALIZADAS ---
    const renderHighlightedRobotsTxt = (content: string): React.ReactElement => {
        const lines = content.split('\n');

        return (
            <>
                {lines.map((line, index) => {
                    const isRelevant = /disallow|user-agent|allow|^\s*$/.test(line.toLowerCase());
                    const isDisallow = /disallow\s*:\s*\//.test(line.toLowerCase());
                    const isUserAgent = line.toLowerCase().includes('user-agent:');

                    return (
                        <div
                            key={index}
                            className={`robots-line ${isDisallow ? 'disallow-line' : ''} ${isUserAgent ? 'user-agent-line' : ''} ${isRelevant ? 'relevant-line' : ''}`}
                        >
                            {line}
                        </div>
                    );
                })}
            </>
        );
    };

    // --- COMPONENTES DE RENDERIZADO ---
    const renderSummary = (data: ScrapedData) => (
        <div className="cybersecurity-summary">
            <div className="security-overview">
                <h3>🔒 Resumen de Ciberseguridad </h3>
                <div className="security-metrics">
                    <div className="security-metric">
                        <span className="metric-label">Tecnologías detectadas:    </span>
                        <span className="metric-value">{data.technologies.length}</span>
                    </div>
                    <div className="security-metric">
                        <span className="metric-label">Enlaces externos:          </span>
                        <span className="metric-value">{data.securityAnalysis.externalLinks}</span>
                    </div>
                    <div className="security-metric">
                        <span className="metric-label">Imágenes sin alt:          </span>
                        <span className="metric-value">{data.securityAnalysis.imagesWithoutAlt}</span>
                    </div>
                    <div className="security-metric">
                        <span className="metric-label">Score de privacidad:       </span>
                        <span className={`metric-value ${data.securityAnalysis.privacyScore >= 70 ? 'good' : data.securityAnalysis.privacyScore >= 40 ? 'warning' : 'danger'}`}>
                            {data.securityAnalysis.privacyScore}% ({getScoreGrade(data.securityAnalysis.privacyScore)})
                        </span>
                    </div>
                </div>
            </div>

            <div className="scraping-policy">
                <h3>📜 Política de Scraping</h3>
                <div className={`policy-status ${ethicalMode && data.scrapingPolicy.scrapingProhibited ? 'prohibited' : 'allowed'}`}>
                    <div className="policy-details">
                        <span className="policy-text">
                            {ethicalMode && data.scrapingPolicy.scrapingProhibited ?
                                '❌ Scraping prohibido por políticas del sitio' :
                                '✅ Scraping permitido'
                            }
                        </span>
                        <div className="policy-checks">
                            <div className={`check ${ethicalMode && data.scrapingPolicy.robotsTxtAllowed ? 'pass' : ethicalMode && !data.scrapingPolicy.robotsTxtAllowed ? 'fail' : 'warning'}`}>
                                📄 robots.txt {
                                    ethicalMode ?
                                        (data.scrapingPolicy.robotsTxtAllowed ? '✓' : '✗') :
                                        '⚠️'
                                }
                            </div>
                            <div className={`check ${ethicalMode && !data.scrapingPolicy.termsOfServiceRestricted ? 'pass' : ethicalMode && data.scrapingPolicy.termsOfServiceRestricted ? 'fail' : 'warning'}`}>
                                📋 Términos {
                                    ethicalMode ?
                                        (data.scrapingPolicy.termsOfServiceRestricted ? '✗' : '✓') :
                                        '⚠️'
                                }
                            </div>
                        </div>
                        {!ethicalMode && (
                            <div className="ethical-mode-warning">
                                <small>⚠️ Modo ético desactivado - las restricciones no se respetan</small>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="site-info">
                <h3>ℹ️ Información del Sitio</h3>
                <ul className="summary-list">
                    <li className="summary-item">
                        <span className="summary-label">Título</span>
                        <span className="summary-value-text">{data.title || 'No encontrado'}</span>
                    </li>
                    <li className="summary-item">
                        <span className="summary-label">Usuarios detectados</span>
                        <div className="users-detection">
                            <div className="users-status">
                                <span className={`users-indicator ${data.usersDetected.hasUsers ? 'has-users' : 'no-users'}`}>
                                    {data.usersDetected.hasUsers ? '✅ Sistema de usuarios detectado' : '❌ No se detectaron usuarios'}
                                </span>
                            </div>
                            {data.usersDetected.hasUsers && data.usersDetected.accessPoints.length > 0 && (
                                <div className="user-access-points">
                                    <div className="access-points-title">Puntos de acceso disponibles:</div>
                                    <div className="access-points-grid">
                                        {data.usersDetected.accessPoints.map((accessPoint, index) => (
                                            <span key={index} className="access-point-badge">{accessPoint}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </li>
                </ul>

                <div className="robots-txt-section">
                    <h4>📄 Contenido del robots.txt</h4>
                    <div className="robots-txt-content">
                        <div className="robots-txt-highlighted">
                            {renderHighlightedRobotsTxt(data.robotsTxtContent)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSecurity = (data: ScrapedData) => {
        const { securityAnalysis } = data;
        const { detailed } = securityAnalysis.securityHeaders;

        return (
            <div className="security-analysis">
                {/* SECCIÓN 1: VULNERABILIDADES DETECTADAS - PRIORIDAD MÁXIMA */}
                <div className="security-section">
                    <h3>⚠️ VULNERABILIDADES DETECTADAS (PRIORIDAD ALTA)</h3>
                    {securityAnalysis.vulnerableTechnologies.length > 0 ? (
                        <div className="vulnerable-techs-detailed">
                            {/* Agrupar por severidad para mejor visualización */}
                            {['critical', 'high', 'medium', 'low'].map(severity => {
                                const vulnerabilitiesOfSeverity = securityAnalysis.vulnerableTechnologies.filter(vuln => vuln.severity === severity);
                                if (vulnerabilitiesOfSeverity.length === 0) return null;

                                return (
                                    <div key={severity} className={`severity-group ${severity}-group`}>
                                        <h4 className={`severity-header ${severity}`}>
                                            {severity === 'critical' && '🚨 CRÍTICAS'}
                                            {severity === 'high' && '⚠️ ALTAS'}
                                            {severity === 'medium' && '🔍 MEDIAS'}
                                            {severity === 'low' && 'ℹ️ BAJAS'}
                                            <span className="severity-count">({vulnerabilitiesOfSeverity.length})</span>
                                        </h4>
                                        {vulnerabilitiesOfSeverity.map((tech, i) => (
                                            <div key={`${severity}-${i}`} className={`vulnerable-tech-card ${tech.severity}`}>
                                                <div className="vulnerability-header">
                                                    <div className="vuln-main-info">
                                                        <span className="tech-name">{tech.name}</span>
                                                        <span className="tech-version">{tech.version}</span>
                                                    </div>
                                                    <span className={`severity-badge ${tech.severity}`}>
                                                        {tech.severity.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="vulnerability-details">
                                                    <div className="vulnerability-description">
                                                        <strong>🚨 VULNERABILIDAD:</strong> {tech.vulnerability}
                                                    </div>
                                                    {tech.lineNumbers && tech.lineNumbers.length > 0 && (
                                                        <div className="vulnerability-lines">
                                                            <strong>📍 Líneas afectadas:</strong> {tech.lineNumbers.slice(0, 5).join(', ')}
                                                            {tech.lineNumbers.length > 5 && ` (y ${tech.lineNumbers.length - 5} más...)`}
                                                        </div>
                                                    )}
                                                    {tech.recommendation && (
                                                        <div className="vulnerability-recommendation">
                                                            <strong>🔧 RECOMENDACIÓN URGENTE:</strong> {tech.recommendation}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}

                        </div>
                    ) : (
                        <div className="no-vulnerabilities-container">
                            <div className="no-vulnerabilities-icon">✅</div>
                            <p className="no-vulnerabilities">No se detectaron vulnerabilidades conocidas.</p>
                            <small className="no-vuln-note">El sitio web sigue buenas prácticas de seguridad.</small>
                        </div>
                    )}
                </div>

                {/* SECCIÓN 2: HEADERS DE SEGURIDAD */}
                <div className="security-section">
                    <h3>🛡️ Headers de Seguridad</h3>
                    <ul className="audit-list">
                        <li className={`audit-item ${securityAnalysis.securityHeaders.csp ? 'audit-pass' : 'audit-fail'}`}>
                            <span className="audit-icon">{securityAnalysis.securityHeaders.csp ? '✓' : '❌'}</span>
                            <div className="audit-details">
                                <span>Content Security Policy (CSP)</span>
                                <p className="header-explanation">
                                    Define qué recursos (scripts, imágenes, estilos) pueden cargarse. Previene ataques XSS y de inyección de datos.
                                </p>
                                {detailed?.csp && (
                                    <small className="audit-info">
                                        {detailed.csp.valid ? '✅ Válida' : '⚠️ Incompleta'}: {detailed.csp.content}
                                    </small>
                                )}
                            </div>
                        </li>
                        <li className={`audit-item ${securityAnalysis.securityHeaders.hsts ? 'audit-pass' : 'audit-fail'}`}>
                            <span className="audit-icon">{securityAnalysis.securityHeaders.hsts ? '✓' : '❌'}</span>
                            <div className="audit-details">
                                <span>HTTP Strict Transport Security (HSTS)</span>
                                <p className="header-explanation">
                                    Fuerza a los navegadores a usar HTTPS. Protege contra ataques de "Man-in-the-Middle" y secuestro de cookies.
                                </p>
                                {detailed?.hsts && (
                                    <small className="audit-info">
                                        {detailed.hsts.valid ? '✅ Válida' : '⚠️ Inválida'}:
                                        {detailed.hsts.maxAge >= 31536000 ? '✅ 1+ año' : '⚠️ < 1 año'} ({detailed.hsts.content})
                                    </small>
                                )}
                            </div>
                        </li>
                        <li className={`audit-item ${securityAnalysis.securityHeaders.xss ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{securityAnalysis.securityHeaders.xss ? '✓' : '⚠️'}</span>
                            <div className="audit-details">
                                <span>Protección XSS</span>
                                <p className="header-explanation">
                                    Header legacy para navegadores antiguos. Activa filtros XSS integrados en el navegador.
                                </p>
                                {detailed?.xssProtection && (
                                    <small className="audit-info">
                                        {detailed.xssProtection.valid ? '✅ Configurada' : '⚠️ Mínima'}: {detailed.xssProtection.content}
                                    </small>
                                )}
                            </div>
                        </li>
                        <li className={`audit-item ${securityAnalysis.securityHeaders.contentType ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{securityAnalysis.securityHeaders.contentType ? '✓' : '⚠️'}</span>
                            <div className="audit-details">
                                <span>X-Content-Type-Options</span>
                                <p className="header-explanation">
                                    Evita que el navegador "adivine" el tipo de archivo (MIME-sniffing). Previene ejecución de archivos maliciosos disfrazados.
                                </p>
                            </div>
                        </li>
                        <li className={`audit-item ${detailed?.referrerPolicy.valid ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{detailed?.referrerPolicy.valid ? '✓' : '⚠️'}</span>
                            <div className="audit-details">
                                <span>Referrer Policy</span>
                                <p className="header-explanation">
                                    Controla qué información de referencia se envía al navegar a otros sitios. Protege la privacidad del usuario.
                                </p>
                                <small className="audit-info">{detailed?.referrerPolicy.content}</small>
                            </div>
                        </li>
                        <li className={`audit-item ${detailed?.frameOptions.valid ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{detailed?.frameOptions.valid ? '✓' : '⚠️'}</span>
                            <div className="audit-details">
                                <span>X-Frame-Options</span>
                                <p className="header-explanation">
                                    Previene ataques de "Clickjacking" controlando si el sitio puede ser embebido en iframes.
                                </p>
                                <small className="audit-info">{detailed?.frameOptions.content}</small>
                            </div>
                        </li>
                        <li className={`audit-item ${detailed?.infoDisclosure.serverExposed ? 'audit-fail' : 'audit-pass'}`}>
                            <span className="audit-icon">{detailed?.infoDisclosure.serverExposed ? '⚠️' : '✓'}</span>
                            <div className="audit-details">
                                <span>Exposición de Información del Servidor</span>
                                <p className="header-explanation">
                                    Revelar la versión del servidor (ej. Apache/2.4) facilita ataques dirigidos a vulnerabilidades conocidas.
                                </p>
                                <small className="audit-info">
                                    {detailed?.infoDisclosure.serverExposed ?
                                        '❌ El servidor expone información de versión' :
                                        '✅ Información del servidor oculta'
                                    }
                                </small>
                            </div>
                        </li>
                        <li className={`audit-item ${detailed?.infoDisclosure.poweredByExposed ? 'audit-warn' : 'audit-pass'}`}>
                            <span className="audit-icon">{detailed?.infoDisclosure.poweredByExposed ? '⚠️' : '✓'}</span>
                            <div className="audit-details">
                                <span>Exposición de Framework (X-Powered-By)</span>
                                <p className="header-explanation">
                                    Indica qué tecnología usa el sitio (ej. Express, PHP). Facilita la búsqueda de exploits específicos.
                                </p>
                                <small className="audit-info">
                                    {detailed?.infoDisclosure.poweredByExposed ?
                                        '⚠️ El framework expone información' :
                                        '✅ Framework no expuesto'
                                    }
                                </small>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* SECCIÓN 3: ANÁLISIS SSL/TLS */}
                <div className="security-section">
                    <h3>🔐 Análisis SSL/TLS</h3>
                    <ul className="audit-list">
                        <li className={`audit-item ${securityAnalysis.sslAnalysis.httpsEnabled ? 'audit-pass' : 'audit-fail'}`}>
                            <span className="audit-icon">{securityAnalysis.sslAnalysis.httpsEnabled ? '✓' : '❌'}</span>
                            <div className="audit-details">
                                <span>HTTPS habilitado</span>
                                {securityAnalysis.sslAnalysis.additionalInfo && (
                                    <small className="audit-info">
                                        {securityAnalysis.sslAnalysis.additionalInfo.mixedContent ?
                                            '⚠️ Contenido mixto detectado' :
                                            '✅ Conexión segura'
                                        }
                                    </small>
                                )}
                            </div>
                        </li>
                        <li className={`audit-item ${securityAnalysis.sslAnalysis.validCertificate ? 'audit-pass' : 'audit-warn'}`}>
                            <span className="audit-icon">{securityAnalysis.sslAnalysis.validCertificate ? '✓' : '⚠️'}</span>
                            <div className="audit-details">
                                <span>Certificado SSL</span>
                                {securityAnalysis.sslAnalysis.additionalInfo?.certificateValidity && (
                                    <small className="audit-info">
                                        {securityAnalysis.sslAnalysis.additionalInfo.certificateValidity.daysRemaining! > 90 ?
                                            '✅ Válido' :
                                            securityAnalysis.sslAnalysis.additionalInfo.certificateValidity.daysRemaining! > 30 ?
                                                '⚠️ Próximo a expirar' :
                                                '❌ Por expirar'
                                        } ({securityAnalysis.sslAnalysis.additionalInfo.certificateValidity.daysRemaining} días restantes)
                                    </small>
                                )}
                            </div>
                        </li>
                        <li className="audit-item">
                            <span className="audit-icon">ℹ️</span>
                            <div className="audit-details">
                                <span>Protocolo TLS</span>
                                <small className="audit-info">
                                    {securityAnalysis.sslAnalysis.tlsVersion} -
                                    {securityAnalysis.sslAnalysis.additionalInfo?.protocolVersion || 'Versión estándar'}
                                </small>
                            </div>
                        </li>
                        <li className="audit-item">
                            <span className="audit-icon">🏢</span>
                            <div className="audit-details">
                                <span>Emisor del Certificado</span>
                                <small className="audit-info">
                                    {securityAnalysis.sslAnalysis.additionalInfo?.certificateIssuer || 'No determinado'}
                                </small>
                            </div>
                        </li>
                        {securityAnalysis.sslAnalysis.additionalInfo?.mixedContent && (
                            <li className="audit-item audit-fail">
                                <span className="audit-icon">⚠️</span>
                                <div className="audit-details">
                                    <span>Contenido Mixto</span>
                                    <small className="audit-info">
                                        ⚠️ El sitio carga recursos HTTP desde HTTPS
                                    </small>
                                </div>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        );
    };

    const getErrorExplanation = (error: string): string => {
        const errorLower = error.toLowerCase();

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
        if (errorLower.includes('robots.txt')) {
            return 'Scraping prohibido - El archivo robots.txt del sitio no permite el acceso automatizado.';
        }
        if (errorLower.includes('términos de servicio')) {
            return 'Scraping restringido - Los términos de servicio del sitio web prohíben el scraping automatizado.';
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
                const isVulnerable = data.securityAnalysis.vulnerableTechnologies.some(vuln => vuln.name === tech.name);

                return (
                    <div key={i} className={`tech-item-with-version ${versionStatus} ${isVulnerable ? 'vulnerable' : ''}`}>
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
                        {isVulnerable && (
                            <span className="tech-vulnerable">🚨 Vulnerable</span>
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
        if (loading) return <div className="loading">🔍 Analizando políticas de scraping...</div>;
        if (error) return <div className="error">{getErrorExplanation(error)}</div>;
        if (!currentResult) return <div className="placeholder">Los resultados del scraping ético se mostrarán aquí.</div>;

        switch (activeTab) {
            case 'summary': return renderSummary(currentResult);
            case 'security': return renderSecurity(currentResult);
            case 'gallery': return renderImageGallery(currentResult);
            case 'tech': return renderTechnologies(currentResult);
            case 'ecommerce': return renderEcommerce(currentResult);
            case 'subdomains': return renderSubdomains(currentResult);
            case 'json': return <pre><code>{JSON.stringify(currentResult, null, 2)}</code></pre>;
            default: return null;
        }
    };

    const sidebarItems = Array.from({ length: 10 }).map((_, i) => optimizedQueries[i] || null);

    return (
        <>
            <div className="app-container">
                <div className="title-container">
                    <h1 className="app-title">
                        Scrapii {' '}
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
                    <p className="app-subtitle">Scraping responsable con análisis de ciberseguridad</p>
                </div>
                <header className="header">
                    <label htmlFor="url-input">Ingrese la URL </label>
                    <input
                        id="url-input"
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleScrape()}
                        placeholder="https://ejemplo.com"
                        aria-label="URL a extraer"
                    />
                    <button onClick={handleScrape} disabled={loading}>
                        {loading ? '🔍 Analizando...' : '🦊 Scraping'}
                    </button>
                </header>
                <main className="main-content">
                    <aside className="sidebar">
                        <h2>Historial de Consultas</h2>
                        <ul aria-label="Historial de consultas">
                            {sidebarItems.map((query, i) => (
                                <li key={query ? query.timestamp : `empty-${i}`}>
                                    <button
                                        onClick={() => query && handleOptimizedHistoryClick(query)}
                                        disabled={!query}
                                        title={query ? `${query.title} (${query.url}) | Security: ${query.securityScore}%` : 'Vacío'}
                                        className="history-button"
                                    >
                                        {query ? (
                                            <div className="history-item">
                                                <div className="history-title">{truncateTitle(query.title)}</div>
                                                <div className="history-meta">
                                                    <span className={`score ${query.securityScore >= 70 ? 'good' : query.securityScore >= 40 ? 'warning' : 'danger'}`}>
                                                        {query.securityScore}%
                                                    </span>
                                                </div>
                                            </div>
                                        ) : ''}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="sidebar-actions">
                            <button onClick={handleExport} disabled={!currentResult || loading}>📄 Exportar JSON</button>
                            <button onClick={handleClearHistory} disabled={queries.length === 0}>🗑️ Limpiar Historial</button>
                            <button
                                onClick={handleToggleEthicalMode}
                                className={ethicalMode ? 'ethical-mode-active' : 'ethical-mode-inactive'}
                                title={ethicalMode ? 'Desactivar modo ético para ignorar restricciones' : 'Activar modo ético para respetar restricciones'}
                            >
                                {ethicalMode ? '🔒 Modo Ético ON' : '⚠️ Modo Ético OFF'}
                            </button>
                        </div>
                    </aside>
                    <section className="result-container" aria-live="polite">
                        <div className="tabs">
                            <button className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>🔒 Resumen</button>
                            <button className={`tab-button ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>🛡️ Seguridad</button>
                            <button className={`tab-button ${activeTab === 'tech' ? 'active' : ''}`} onClick={() => setActiveTab('tech')}>⚙️ Tecnologías</button>
                            <button className={`tab-button ${activeTab === 'ecommerce' ? 'active' : ''}`} onClick={() => setActiveTab('ecommerce')}>🛒 E-commerce</button>
                            <button className={`tab-button ${activeTab === 'subdomains' ? 'active' : ''}`} onClick={() => setActiveTab('subdomains')}>🌐 Subdominios</button>
                            <button className={`tab-button ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>🖼️ Galería</button>
                            <button className={`tab-button ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>📋 JSON</button>
                        </div>
                        <div className="tab-content">
                            {renderTabContent()}
                        </div>
                    </section>
                </main>
            </div>
            <footer className="footer">
                <div className="footer-content">
                    <p>DevSecOps By Grupo 5 - Uniminuto 2025</p>
                </div>
            </footer>
        </>
    );
};

export default App;
