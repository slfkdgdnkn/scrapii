/**
 * Integrador de Módulos de Seguridad para index.tsx
 * Adapta los módulos TypeScript para uso en el componente React
 * Versión 3.0 - Realistic Security Integration
 */

// Adaptadores de tipos TypeScript a JavaScript
interface SecurityHeaders {
  'content-security-policy'?: string;
  'strict-transport-security'?: string;
  'x-frame-options'?: string;
  'x-content-type-options'?: string;
  'referrer-policy'?: string;
  'permissions-policy'?: string;
  'x-xss-protection'?: string;
  [key: string]: string | undefined;
}

interface VulnerabilityData {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface SiteContext {
  type: 'static' | 'dynamic' | 'ecommerce' | 'enterprise' | 'government' | 'api' | 'single-page-app' | 'blog' | 'portfolio';
  hasUserGeneratedContent: boolean;
  handlesFinancialData: boolean;
  hasLoginSystem: boolean;
  allowsFileUploads: boolean;
  usesExternalAPIs: boolean;
  hasThirdPartyIntegrations: boolean;
  isPublicFacing: boolean;
  usesHTTPS: boolean;
  technologyStack: string[];
  targetAudience: 'general' | 'business' | 'financial' | 'government' | 'enterprise' | 'developer';
}

interface SecurityScore {
  overall: number;
  grade: string;
  riskLevel: string;
  details: {
    baseline: number;
    headers: { present: number; missing: number; score: number };
    vulnerabilities: { critical: number; high: number; medium: number; low: number; score: number };
    bonus: number;
    total: number;
  };
}

/**
 * Sistema de Scoring Realista Integrado
 * Reemplaza el sistema de cálculo旧 (legacy) por el nuevo sistema inteligente
 */
export class RealisticSecurityCalculator {
  private readonly SITE_BASELINES = {
    'ecommerce-standard': 75,
    'ecommerce-premium': 85,
    'enterprise-smb': 70,
    'enterprise-corporate': 80,
    'portfolio-professional': 65,
    'saas-platform': 78,
    'government': 90,
    'financial': 95,
    'healthcare': 85,
    'education': 75,
    'media-publisher': 70,
    'blog-influencer': 60,
    'landing-page-conversion': 65,
    'DEFAULT': 80
  };

  private readonly HEADER_WEIGHTS = {
    'content-security-policy': { weight: 25, criticality: 'CRITICAL' },
    'strict-transport-security': { weight: 20, criticality: 'CRITICAL' },
    'x-frame-options': { weight: 15, criticality: 'HIGH' },
    'x-content-type-options': { weight: 12, criticality: 'HIGH' },
    'referrer-policy': { weight: 8, criticality: 'MEDIUM' },
    'permissions-policy': { weight: 6, criticality: 'MEDIUM' },
    'x-xss-protection': { weight: 3, criticality: 'LOW' }
  };

  private readonly VULNERABILITY_PENALTIES = {
    CRITICAL: 25,
    HIGH: 12,
    MEDIUM: 5,
    LOW: 2
  };

  /**
   * Calcula el score de seguridad usando el nuevo sistema realista
   */
  public calculateRealisticScore(
    headers: SecurityHeaders,
    vulnerabilities: VulnerabilityData,
    siteType: string = 'DEFAULT',
    context?: SiteContext
  ): SecurityScore {

    // 1. Score base según tipo de sitio
    const baseline = this.SITE_BASELINES[siteType as keyof typeof this.SITE_BASELINES] || this.SITE_BASELINES.DEFAULT;

    // 2. Evaluar headers con ponderación inteligente
    const headersScore = this.evaluateHeadersRealistically(headers, context);

    // 3. Evaluar vulnerabilidades con penalizaciones justas
    const vulnScore = this.evaluateVulnerabilitiesRealistically(vulnerabilities);

    // 4. Calcular bonificaciones contextuales
    const bonusScore = this.calculateContextualBonus(headers, vulnerabilities, context);

    // 5. Score total con límites realistas
    const total = Math.max(0, Math.min(100, baseline + headersScore.score + vulnScore + bonusScore));

    // 6. Determinar letra y nivel de riesgo
    const grade = this.calculateGrade(total);
    const riskLevel = this.calculateRiskLevel(total, vulnerabilities);

    return {
      overall: Math.round(total),
      grade,
      riskLevel,
      details: {
        baseline,
        headers: headersScore,
        vulnerabilities: {
          critical: vulnerabilities.critical,
          high: vulnerabilities.high,
          medium: vulnerabilities.medium,
          low: vulnerabilities.low,
          score: vulnScore
        },
        bonus: bonusScore,
        total
      }
    };
  }

  /**
   * Evalúa headers de seguridad con criterios realistas
   */
  private evaluateHeadersRealistically(headers: SecurityHeaders, context?: SiteContext) {
    let presentPoints = 0;
    let missingPoints = 0;

    for (const [headerName, config] of Object.entries(this.HEADER_WEIGHTS)) {
      const headerValue = headers[headerName] || headers[headerName.toLowerCase()];

      if (headerValue) {
        // Header presente - evaluar calidad
        const quality = this.evaluateHeaderQuality(headerName, headerValue);
        presentPoints += config.weight * quality;
      } else {
        // Header faltante - penalización contextual
        const penalty = this.calculateMissingHeaderPenalty(headerName, config.criticality, context);
        missingPoints += config.weight * penalty;
      }
    }

    return {
      present: Math.round(presentPoints),
      missing: Math.round(missingPoints),
      score: Math.round(presentPoints + missingPoints)
    };
  }

  /**
   * Evalúa la calidad de un header específico
   */
  private evaluateHeaderQuality(headerName: string, value: string): number {
    switch (headerName) {
      case 'content-security-policy':
        return this.evaluateCSPQuality(value);
      case 'strict-transport-security':
        return this.evaluateHSTSQuality(value);
      case 'x-frame-options':
        return value.includes('DENY') || value.includes('SAMEORIGIN') ? 1.0 : 0.7;
      default:
        return value ? 1.0 : 0.0;
    }
  }

  /**
   * Evalúa la calidad de la política CSP
   */
  private evaluateCSPQuality(cspValue: string): number {
    const goodPractices = ['default-src', 'script-src', 'style-src'];
    const hasNonces = cspValue.includes('nonce-') || cspValue.includes('sha256-');
    const hasUnsafeInline = cspValue.includes("'unsafe-inline'");

    let score = 0.5; // Base score

    goodPractices.forEach(directive => {
      if (cspValue.includes(directive)) score += 0.2;
    });

    if (!hasUnsafeInline) score += 0.3;
    if (hasNonces) score += 0.2;

    return Math.min(1.0, score);
  }

  /**
   * Evalúa la calidad de HSTS
   */
  private evaluateHSTSQuality(hstsValue: string): number {
    const hasMaxAge = hstsValue.includes('max-age=');
    const hasIncludeSubDomains = hstsValue.includes('includeSubDomains');
    const hasPreload = hstsValue.includes('preload');

    let score = 0.3;

    if (hasMaxAge) score += 0.3;
    if (hasIncludeSubDomains) score += 0.2;
    if (hasPreload) score += 0.2;

    return Math.min(1.0, score);
  }

  /**
   * Calcula penalización contextual para header faltante
   */
  private calculateMissingHeaderPenalty(headerName: string, criticality: string, context?: SiteContext): number {
    let penalty = 1.0; // Base penalty

    // Reducir penalización para headers menos críticos en ciertos contextos
    const contextModifiers = {
      'static-site': {
        'content-security-policy': 0.3,
        'referrer-policy': 0.5,
        'permissions-policy': 0.4,
        'x-xss-protection': 0.1
      },
      'api-only': {
        'content-security-policy': 0.0,
        'x-frame-options': 0.0,
        'referrer-policy': 0.2
      },
      'blog-portfolio': {
        'content-security-policy': 0.4,
        'x-frame-options': 0.3,
        'referrer-policy': 1.1
      }
    };

    if (context) {
      let modifiers = contextModifiers['static-site'];

      if (context.type === 'api' || context.type === 'enterprise') {
        modifiers = { ...modifiers, ...contextModifiers['api-only'] };
      }

      if (context.type === 'blog' || context.type === 'portfolio') {
        modifiers = { ...modifiers, ...contextModifiers['blog-portfolio'] };
      }

      const modifier = modifiers[headerName as keyof typeof modifiers];
      if (modifier !== undefined) {
        penalty *= modifier;
      }
    }

    return penalty;
  }

  /**
   * Evalúa vulnerabilidades con penalizaciones realistas
   */
  private evaluateVulnerabilitiesRealistically(vulns: VulnerabilityData): number {
    let totalPenalty = 0;

    // Penalización proporcional pero justa
    if (vulns.critical > 0) {
      totalPenalty += this.VULNERABILITY_PENALTIES.CRITICAL * Math.min(vulns.critical, 3);
    }

    if (vulns.high > 0) {
      totalPenalty += this.VULNERABILITY_PENALTIES.HIGH * Math.min(vulns.high, 5);
    }

    if (vulns.medium > 0) {
      totalPenalty += this.VULNERABILITY_PENALTIES.MEDIUM * Math.min(vulns.medium, 8);
    }

    if (vulns.low > 0) {
      totalPenalty += this.VULNERABILITY_PENALTIES.LOW * Math.min(vulns.low, 10);
    }

    return -Math.round(Math.min(totalPenalty, 30)); // Límite máximo de penalización
  }

  /**
   * Calcula bonificaciones contextuales
   */
  private calculateContextualBonus(headers: SecurityHeaders, vulnerabilities: VulnerabilityData, context?: SiteContext): number {
    let bonus = 0;

    // Bonificación por HTTPS enforcement
    if (headers['strict-transport-security']?.includes('max-age')) {
      bonus += 5;
    }

    // Bonificación por baja cantidad de vulnerabilidades
    const totalVulns = vulnerabilities.critical + vulnerabilities.high + vulnerabilities.medium + vulnerabilities.low;
    if (totalVulns === 0) {
      bonus += 3;
    } else if (totalVulns <= 2) {
      bonus += 1;
    }

    // Bonificación por sitio simple si no tiene contenido de riesgo
    if (context) {
      if ((context.type === 'blog' || context.type === 'portfolio') && !context.hasUserGeneratedContent) {
        bonus += 2;
      }

      if (!context.handlesFinancialData && !context.hasLoginSystem && !context.allowsFileUploads) {
        bonus += 3; // Sitio de bajo riesgo
      }
    }

    return bonus;
  }

  /**
   * Calcula la letra de calificación
   */
  private calculateGrade(score: number): string {
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
  }

  /**
   * Calcula el nivel de riesgo
   */
  private calculateRiskLevel(score: number, vulnerabilities: VulnerabilityData): string {
    const hasCriticalVulns = vulnerabilities.critical > 0;
    const hasHighVulns = vulnerabilities.high > 0;

    if (score >= 85 && !hasCriticalVulns && vulnerabilities.high <= 1) return 'Bajo';
    if (score >= 70 && !hasCriticalVulns) return 'Medio';
    if (score >= 50 || vulnerabilities.high > 2) return 'Alto';
    return 'Crítico';
  }

  /**
   * Determina el tipo de sitio basándose en el contexto
   */
  public determineSiteType(data: any): string {
    // Detectar tipo de sitio basándose en los datos analizados
    if (data.ecommerce && data.ecommerce.totalProducts > 0) {
      return data.ecommerce.totalProducts > 50 ? 'ecommerce-premium' : 'ecommerce-standard';
    }

    if (data.technologies.includes('React') || data.technologies.includes('Vue.js')) {
      return 'saas-platform';
    }

    if (data.usersDetected.hasUsers && data.usersDetected.accessPoints.length > 3) {
      return 'enterprise-corporate';
    }

    if (data.title && (data.title.includes('blog') || data.title.includes('portfolio'))) {
      return 'portfolio-professional';
    }

    return 'enterprise-smb';
  }

  /**
   * Genera contexto del sitio para análisis contextual
   */
  public generateSiteContext(data: any, siteType: string): SiteContext {
    return {
      type: this.mapSiteTypeToContext(siteType),
      hasUserGeneratedContent: data.usersDetected.hasUsers,
      handlesFinancialData: data.ecommerce.paymentMethods.length > 0,
      hasLoginSystem: data.usersDetected.hasUsers,
      allowsFileUploads: data.technologies.includes('PHP') || data.technologies.includes('Node.js'),
      usesExternalAPIs: data.securityAnalysis.externalLinks > 5,
      hasThirdPartyIntegrations: data.securityAnalysis.externalLinks > 3,
      isPublicFacing: true,
      usesHTTPS: data.securityAnalysis.sslAnalysis.httpsEnabled,
      technologyStack: data.technologies.map((t: any) => t.name),
      targetAudience: 'general'
    };
  }

  private mapSiteTypeToContext(siteType: string): SiteContext['type'] {
    const mapping: Record<string, SiteContext['type']> = {
      'ecommerce-standard': 'enterprise',
      'ecommerce-premium': 'enterprise',
      'enterprise-smb': 'enterprise',
      'enterprise-corporate': 'enterprise',
      'saas-platform': 'enterprise',
      'portfolio-professional': 'portfolio',
      'blog-influencer': 'blog'
    };

    return mapping[siteType] || 'enterprise';
  }
}

/**
 * Funciones de utilidad para integración con index.tsx
 */
export const SecurityIntegrationUtils = {
  /**
   * Filtra vulnerabilidades eliminando falsos positivos
   * Versión mejorada con análisis contextual avanzado basado en el ejemplo de Rebrandly
   */
  filterFalsePositives(vulnerabilities: any[]): any[] {
    return vulnerabilities.filter(vuln => {
      const vulnText = vuln.vulnerability.toLowerCase();
      const contextText = (vuln.context || '').toLowerCase();

      // 1. IGNORAR document.write() de servicios legítimos de terceros
      if (vulnText.includes('document.write')) {
        const vendorScripts = [
          'googletagmanager', 'gtm', 'tag manager',
          'intercom', 'widget.intercom.io',
          'google', 'maps.googleapis.com',
          'clarity.ms', 'analytics',
          'pendo', 'zapier', 'stripe'
        ];

        const isVendorScript = vendorScripts.some(vendor =>
          contextText.includes(vendor) || vulnText.includes(vendor)
        );

        if (isVendorScript) {
          return false; // Filtrar (es falso positivo)
        }
      }

      // 2. IGNORAR console.warn/log de librerías externas
      if (vulnText.includes('console.')) {
        const vendorConsole = [
          'google maps javascript api',
          'only loads once',
          'already loaded',
          'library',
          'vendor',
          'third-party'
        ];

        const isVendorConsole = vendorConsole.some(pattern =>
          contextText.includes(pattern) || vulnText.includes(pattern)
        );

        if (isVendorConsole) {
          return false; // Filtrar (es falso positivo)
        }
      }

      // 3. IGNORAR JSON.parse con try-catch (ya protegido)
      if (vulnText.includes('json.parse')) {
        const hasTryCatch = contextText.includes('try') && contextText.includes('catch');
        const hasErrorHandling = contextText.includes('catch (e)') || contextText.includes('catch(e)');

        if (hasTryCatch || hasErrorHandling) {
          return false; // Filtrar (ya está protegido)
        }
      }

      // 4. IGNORAR RegExp.exec() en código de parsing legítimo
      if (vulnText.includes('regexp') || vulnText.includes('.exec(')) {
        const isParsingCode =
          contextText.includes('getparametername') ||
          contextText.includes('getparameter') ||
          contextText.includes('parse') ||
          contextText.includes('extract') ||
          contextText.includes('match');

        if (isParsingCode) {
          return false; // Filtrar (uso legítimo de regex)
        }
      }

      // 5. IGNORAR APIs de Google y servicios legítimos
      const isGoogleSafe =
        vulnText.includes('google') ||
        vulnText.includes('gtm') ||
        vulnText.includes('tag manager') ||
        vulnText.includes('maps api') ||
        vulnText.includes('analytics') ||
        vulnText.includes('firebase') ||
        vulnText.includes('gapi');

      // 6. IGNORAR configuraciones de desarrollo seguras
      const isDevSafe =
        vulnText.includes('debug mode') ||
        vulnText.includes('development');

      // 7. IGNORAR innerHTML con contenido hardcodeado seguro
      const isSafeInnerHTML =
        vulnText.includes('innerhtml') && (
          vulnText.includes('hardcoded') ||
          vulnText.includes('safe') ||
          vulnText.includes('sanitized')
        );

      return !isGoogleSafe && !isDevSafe && !isSafeInnerHTML;
    });
  }
};

// Instancia singleton para usar en index.tsx
export const realisticSecurityCalculator = new RealisticSecurityCalculator();