# 🦊 Scrapii - Scraping Ético con Análisis de Ciberseguridad

[![GitHub](https://img.shields.io/badge/GitHub-loiz1%2Fscrapii-blue?style=flat-square&logo=github)](https://github.com/loiz1/scrapii)
[![Docker](https://img.shields.io/badge/Docker-✓-2496ED?style=flat-square&logo=docker)](https://hub.docker.com/r/loizzz/web-scrapi)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.2.2-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

---

## 📋 Descripción del Proyecto

**Scrapii** es una aplicación web avanzada de scraping ético que integra análisis profundo de ciberseguridad. Diseñada para desarrolladores, analistas de seguridad y profesionales DevSecOps, la herramienta proporciona un enfoque responsable y técnicamente robusto para el análisis de sitios web.

### 🎯 Características Principales

#### 🔍 Scraping Ético
- **Modo ético activado por defecto**: Respeta robots.txt y términos de servicio
- **Análisis de políticas web**: Validación automática de robots.txt
- **Scraping responsable**: Control de velocidad y límites automáticos
- **Historial de consultas**: Almacenamiento local inteligente con historial optimizado

#### 🛡️ Análisis de Ciberseguridad Avanzado
- **Sistema de scoring inteligente**: Algoritmo de evaluación contextual realista
- **Detección de vulnerabilidades**: Identificación de tecnologías vulnerables por versión
- **Análisis de headers de seguridad**: CSP, HSTS y X-Frame-Options
- **Evaluación SSL/TLS**: Validación de certificados y protocolos de seguridad
- **Detección de credenciales hardcodeadas**: Patrones seguros sin falsos positivos
- **Análisis de código JavaScript**: Identificación de vulnerabilidades comunes

#### 📊 Análisis Técnico Completo
- **Detección de tecnologías**: Frameworks, CMS, librerías, y herramientas
- **Análisis e-commerce**: Productos, métodos de pago, características de tienda
- **Exploración de subdominios**: Descubrimiento automático de subdominios accesibles
- **Análisis de imágenes**: Detección de contenido sin texto alternativo
- **Evaluación de accesibilidad**: Puntos de acceso de usuario detectados

---

## 🏗️ Stack Tecnológico

### Frontend
- **React 19.2.0**: Biblioteca de interfaz de usuario moderna
- **TypeScript**: Tipado estático para mayor robustez
- **Vite 6.2.0**: Build tool ultrarrápido para desarrollo moderno


### Backend/DevOps
- **Node.js 18-alpine**: Runtime JavaScript eficiente
- **Nginx**: Servidor web de alto rendimiento
- **Docker**: Containerización para deployment consistente

### Seguridad
- **Algoritmo de scoring personalizado**: Sistema de evaluación contextual
- **Scanner de vulnerabilidades**: Detección avanzada de patrones de seguridad
- **Headers de seguridad**: Configuración robusta de CSP y HSTS
- **Validación de entrada**: Sanitización y validación de URLs
- **CORS Proxy**: Manejo seguro de peticiones cross-origin
---


---
## 📦 Estructura del Proyecto

```
Scrapii/
├── 📁 docs/                      # Documentación completa
│   └── 📄 README.md              # Este archivo
├── 📁 src/                       # Código fuente React/TypeScript
│   ├── 📄 App.tsx                # Componente principal
│   ├── 📄 main.tsx               # Punto de entrada
│   ├── 📄 types.ts               # Definiciones TypeScript
│   └── 📁 utils/                 # Utilidades de seguridad
│       ├── 📄 security_scanner.ts    # Scanner de vulnerabilidades
│       ├── 📄 security_scorer.ts     # Sistema de scoring
│       ├── 📄 security_integrator.ts # Integrador de análisis
│       ├── 📄 contextual_analyzer.ts # Analizador contextual
│       ├── 📄 baseline_scoring.ts    # Scoring baseline
│       ├── 📄 security_headers_generator.ts # Generador de headers
│       ├── 📄 header_classifier.ts   # Clasificador de headers
│       ├── 📄 logger.ts             # Sistema de logging
│       ├── 📄 security.ts           # Funciones de seguridad
│       └── 📄 vite_security_config.ts # Configuración de seguridad Vite
├── 📁 scripts/                   # Scripts de utilidad
│   ├── 📄 integrated_security_scanner.js # Scanner integrado
│   ├── 📄 security_scan_improved.js      # Scanner mejorado
│   ├── 📄 test_false_positive_detection.cjs # Test de falsos positivos
│   └── 📄 test_security_headers.cjs      # Test de headers
├── 📄 Dockerfile                 # Configuración Docker
├── 📄 nginx.conf                 # Configuración Nginx
├── 📄 dockerignore               # Exclusiones Docker
├── 📄 package.json               # Dependencias Node.js
├── 📄 vite.config.ts             # Configuración Vite
├── 📄 tsconfig.json              # Configuración TypeScript
├── 📄 eslint.config.js           # Configuración ESLint
└── 📄 .gitignore                 # Exclusiones Git
```

---

## 🛠️ Instalación y Desarrollo

### Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Docker (para containerización)

### Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/loiz1/scrapii.git
cd scrapii

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview

# Ejecutar linter
npm run lint
```

---

## 🐳 Construcción de Imagen Docker

### Proceso de Construcción y Subida a Docker Hub

```bash
# 1. Iniciar sesión en Docker Hub
docker login

# 2. Construir imagen con tag oficial
docker build -t loizzz/web-scrapi:latest .

# 3. Taggear versión específica (opcional)
docker tag loizzz/web-scrapi:latest loizzz/web-scrapi:v2.1.0

# 4. Subir a Docker Hub
docker push loizzz/web-scrapi:latest
docker push loizzz/web-scrapi:v2.1.0

# 5. Verificar publicación
docker search loizzz/web-scrapi
```


## Consumo de la Imagen Docker
```bash
### Ejecutar desde Docker Hub

docker pull loizzz/web-scrapi:latest

# Descargar y ejecutar la imagen más reciente
docker run -d -p 80:80 --name web-scrapi loizzz/web-scrapi:latest

# Con volumen para persistencia
docker run -d \
  -p 80:80 \
  -v scrapii-data:/app/data \
  --name scrapii-persistent \
  loizzz/web-scrapi:latest
```

---

## 🔒 Seguridad del Proyecto

### Medidas de Seguridad Implementadas

#### 1. **Protección de Código**
- Sanitización de entradas de usuario
- Validación de URLs antes del scraping
- Prevención de inyección de código
- Headers de seguridad HTTP completos

#### 2. **Configuración Docker Segura**
- Usuario no-root en contenedor
- Exposición mínima de puertos
- Sin herramientas de debugging en producción

#### 3. **Scraping Ético**
- Respeto automático a robots.txt
- Validación de términos de servicio
- Rate limiting incorporado

---


## 📝 Changelog

### v2.1.0 - Release Inicial (2025-11-29)

#### ✨ Nuevas Funcionalidades
- 🦊 Aplicación completa de scraping ético
- 🛡️ Sistema de análisis de ciberseguridad avanzado
- 📊 Dashboard de métricas y scoring
- 🔒 Headers de seguridad implementados
- 📱 Interfaz responsive y moderna

---


## 📞 Contacto y Soporte

### Desarrollador Principal
- **GitHub**: [@loiz1 ](https://github.com/loiz1)
- **Repositorio**: [scrapii](https://github.com/loiz1/scrapii)

### Docker Hub
- **Imagen**: [loizzz/web-scrapi](https://hub.docker.com/r/loizzz/web-scrapi)
- **Tags**: `latest`, `v2.1.0`

---

**¡Scrapii está listo para transformar tu análisis de ciberseguridad!** 

---
