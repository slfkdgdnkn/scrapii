export interface SeoAuditResult {
    status: 'pass' | 'warn' | 'fail';
    text: string;
}

export interface EcommerceData {
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

export interface SubdomainData {
    url: string;
    title: string;
    technologies: { name: string; version?: string; currentVersion?: string }[];
    linkCount: number;
    imageCount: number;
    status: 'success' | 'error' | 'skipped';
    error?: string;
}

// NUEVAS INTERFACES PARA CIBERSEGURIDAD
export interface ScrapingPolicy {
    robotsTxtAllowed: boolean;
    termsOfServiceRestricted: boolean;
    rateLimitDetected: boolean;
    scrapingProhibited: boolean;
    userAgentRequired: boolean;
    delayRequired: number;
    robotsTxtChecked: boolean;
    termsChecked: boolean;
}

export interface SecurityHeaders {
    csp: boolean;
    hsts: boolean;
    xss: boolean;
    contentType: boolean;
    detailed?: {
        csp: {
            present: boolean;
            valid: boolean;
            content: string;
        };
        hsts: {
            present: boolean;
            valid: boolean;
            content: string;
            maxAge: number;
        };
        xssProtection: {
            present: boolean;
            valid: boolean;
            content: string;
        };
        referrerPolicy: {
            present: boolean;
            valid: boolean;
            content: string;
        };
        frameOptions: {
            present: boolean;
            valid: boolean;
            content: string;
        };
        infoDisclosure: {
            serverExposed: boolean;
            poweredByExposed: boolean;
        };
    };
}

export interface SSLAnalysis {
    hasSSL: boolean;
    validCertificate: boolean;
    tlsVersion: string;
    httpsEnabled: boolean;
    additionalInfo?: {
        certificateIssuer?: string;
        certificateSubject?: string;
        certificateValidity?: {
            validFrom?: string;
            validTo?: string;
            daysRemaining?: number;
        };
        protocolVersion?: string;
        cipherSuite?: string;
        mixedContent?: boolean;
    };
}

export interface VulnerableTechnology {
    name: string;
    version: string;
    vulnerability: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    lineNumbers?: number[];
    recommendation?: string;
}

export interface SecurityAnalysis {
    securityHeaders: SecurityHeaders;
    sslAnalysis: SSLAnalysis;
    vulnerableTechnologies: VulnerableTechnology[];
    privacyScore: number;
    externalLinks: number;
    imagesWithoutAlt: number;
    cookiesDetected: number;
}

export interface ScrapedData {
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
    scrapingPolicy: ScrapingPolicy;
    securityAnalysis: SecurityAnalysis;
    robotsTxtContent: string;
    usersDetected: {
        hasUsers: boolean;
        accessPoints: string[];
    };
}

export interface OptimizedQuery {
    title: string;
    url: string;
    keywords: string[];
    securityScore: number;
    matchPercentage: number; // Porcentaje de coincidencia de keywords con contenido web
    timestamp: number;
}

export interface Query {
    title: string;
    url: string;
    data: ScrapedData;
    timestamp: number;
}

export type Tab = 'summary' | 'security' | 'tech' | 'ecommerce' | 'subdomains' | 'gallery' | 'json';
