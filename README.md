
## 📋 Resumen del Proyecto

**Scrapii** es una aplicación web moderna de web scraping desarrollada con React y TypeScript que permite extraer, analizar y visualizar información de sitios web de manera eficiente. La aplicación incluye herramientas de auditoría SEO, detección de tecnologías y análisis de contenido.

### 🚀 Características Principales

- ✅ **Extracción de contenido web** con proxy CORS integrado
- ✅ **Auditoría SEO automática** con métricas de calidad
- ✅ **Detección de tecnologías** utilizadas en sitios web
- ✅ **Galería de imágenes** con análisis de texto alternativo
- ✅ **Historial de consultas** con persistencia local
- ✅ **Exportación de datos** en formato JSON
- ✅ **Diseño responsive** para múltiples dispositivos

## 🛠️ Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | ^19.2.0 | Framework principal de UI |
| **TypeScript** | ~5.8.2 | Tipado estático y mejor experiencia de desarrollo |
| **Vite** | ^6.2.0 | Herramienta de construcción rápida |


## 📁 Estructura del Proyecto

```
Scrapii/
├── index.html          # Archivo HTML principal con estilos embebidos
├── index.tsx           # Componente React principal y lógica de la aplicación
├── tsconfig.json       # Configuración de TypeScript
├── vite.config.ts      # Configuración de Vite
├── package.json        # Dependencias y scripts del proyecto
├── metadata.json       # Metadatos de la aplicación
├── .gitignore          # Archivos ignorados por Git
├── .dockerignore       # Archivos ignorados por Docker
├── Dockerfile          # Configuración del contenedor Docker
├── nginx.conf          # Configuración de nginx para producción
├── docker-build.sh     # Script de automatización para Linux/Mac
├── docker-build.bat    # Script de automatización para Windows
└── README.md           # Documentación del proyecto.
```

## 🎯 Funcionalidades Detalladas

### 1. **Extracción de Contenido Web**
- **URL Input**: Campo de entrada para URLs con validación
- **Proxy CORS**: Utiliza `https://corsproxy.io/?` para evitar restricciones CORS
- **Extracción automática** de:
  - Título de la página
  - Meta descripciones
  - Encabezados (H1, H2, H3)
  - Enlaces y sus textos
  - Imágenes con atributos alt

### 2. **Auditoría SEO Automática**
- **Análisis de título**: Longitud óptima (10-60 caracteres)
- **Análisis de meta descripción**: Longitud óptima (50-160 caracteres)
- **Análisis de encabezados H1**: Verificación de cantidad única
- **Análisis de texto alternativo**: Imágenes sin alt detectadas

### 3. **Detección de Tecnologías**
Identifica automáticamente tecnologías utilizadas:
- **React** - Mediante selectores data-reactroot
- **Vue.js** - Por selectores data-v-app
- **AngularJS** - Por presencia de angular.js
- **jQuery** - Por scripts que contengan jquery
- **WordPress** - Por meta generator
- **Shopify** - Por meta generator
- **Next.js** - Por selector #__next

### 4. **Interfaz de Usuario**
- **Sidebar**: Historial de últimas 10 consultas
- **Tabs**: Resumen, SEO, Galería, Tecnologías, JSON
- **Exportación**: Descarga de datos en JSON
- **Responsive**: Adaptación a móviles y tablets

## 🚀 Instalación y Ejecución

### Prerrequisitos
- **Node.js** (versión LTS recomendada) o **Docker**

#### Pre-requisitos
- **Docker Desktop** instalado y ejecutándose

#### Ejecutar WebScrapii desde Docker Hub:

```bash
# Descargar y ejecutar directamente desde Docker Hub

docker pull loizzz/web-scrapii:latest

docker run -d -p 80:80 --name web-scrapii loizzz/web-scrapii:latest
```
**Acceder a la aplicación:**
- Abre tu navegador y ve a: http://localhost

```bash
# Ver contenedores ejecutándose
docker ps

# Ver logs del contenedor
docker logs web-scrapii

# Detener el contenedor
docker stop web-scrapii

# Eliminar el contenedor
docker rm web-scrapii

# Eliminar la imagen
docker rmi loizzz/web-scrapii:latest
```


## 👥 Créditos

**Desarrollado por**: Grupo 5 - DevSecOps  
**Institución**: Uniminuto 2025  
**Desarrollador**: [Loizzz 🦊](https://github.com/loiz1/loiz1)  

---
