#!/usr/bin/env node

/**
 * SISTEMA DE SCRAPING AVANZADO
 * ============================
 * Sistema completo de scraping con múltiples fuentes,
 * procesamiento en paralelo y exportación de datos.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const mysql = require('mysql2/promise');

// Configuración
const CONFIG = {
    sources: {
        linkedin: {
            enabled: true,
            rateLimit: 1000, // ms entre requests
            maxPages: 10
        },
        indeed: {
            enabled: true,
            rateLimit: 800,
            maxPages: 15
        },
        glassdoor: {
            enabled: true,
            rateLimit: 1200,
            maxPages: 8
        },
        custom: {
            enabled: true,
            rateLimit: 500
        }
    },
    
    database: {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'scraping_data',
        table: 'leads'
    },
    
    export: {
        formats: ['json', 'csv', 'excel', 'sql'],
        defaultFormat: 'json',
        compress: true
    },
    
    monitoring: {
        logLevel: 'info',
        saveLogs: true,
        alertThreshold: 1000 // alerta si > 1000 registros
    }
};

// Clase principal del sistema
class AdvancedScrapingSystem {
    constructor(config = CONFIG) {
        this.config = config;
        this.results = [];
        this.stats = {
            totalScraped: 0,
            successful: 0,
            failed: 0,
            startTime: null,
            endTime: null
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Iniciando Sistema de Scraping Avanzado...\n');
        
        // Crear directorios necesarios
        this.createDirectories();
        
        // Inicializar base de datos
        await this.initDatabase();
        
        // Cargar configuración
        this.loadConfig();
        
        console.log('✅ Sistema inicializado correctamente\n');
    }
    
    createDirectories() {
        const dirs = [
            'data',
            'data/raw',
            'data/processed',
            'data/export',
            'logs',
            'cache',
            'templates',
            'scripts'
        ];
        
        dirs.forEach(dir => {
            const fullPath = path.join(__dirname, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`📁 Directorio creado: ${dir}`);
            }
        });
    }
    
    async initDatabase() {
        try {
            const connection = await mysql.createConnection({
                host: this.config.database.host,
                user: this.config.database.user,
                password: this.config.database.password
            });
            
            await connection.query(`CREATE DATABASE IF NOT EXISTS ${this.config.database.database}`);
            await connection.end();
            
            const dbConnection = await mysql.createConnection({
                host: this.config.database.host,
                user: this.config.database.user,
                password: this.config.database.password,
                database: this.config.database.database
            });
            
            // Crear tabla de leads
            await dbConnection.query(`
                CREATE TABLE IF NOT EXISTS ${this.config.database.table} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    source VARCHAR(50),
                    title VARCHAR(255),
                    company VARCHAR(255),
                    location VARCHAR(255),
                    salary VARCHAR(100),
                    description TEXT,
                    url VARCHAR(500),
                    posted_date DATE,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed BOOLEAN DEFAULT FALSE,
                    tags JSON,
                    metadata JSON
                )
            `);
            
            // Crear tabla de estadísticas
            await dbConnection.query(`
                CREATE TABLE IF NOT EXISTS scraping_stats (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    source VARCHAR(50),
                    total_scraped INT,
                    successful INT,
                    failed INT,
                    duration_seconds INT,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await dbConnection.end();
            console.log('✅ Base de datos inicializada');
        } catch (error) {
            console.warn('⚠️ No se pudo conectar a la base de datos:', error.message);
            console.log('📝 Usando almacenamiento en archivos JSON');
        }
    }
    
    loadConfig() {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.config = { ...this.config, ...customConfig };
        }
        
        // Guardar configuración actual
        fs.writeFileSync(
            path.join(__dirname, 'data', 'current_config.json'),
            JSON.stringify(this.config, null, 2)
        );
    }
    
    async scrapeLinkedIn(keywords = ['developer', 'engineer'], location = 'Remote') {
        console.log('🔍 Iniciando scraping de LinkedIn...');
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            
            for (const keyword of keywords) {
                console.log(`📊 Buscando: ${keyword} en ${location}`);
                
                const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
                await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                
                // Esperar a que carguen los resultados
                await page.waitForSelector('.jobs-search__results-list', { timeout: 10000 });
                
                // Extraer datos
                const jobs = await page.evaluate(() => {
                    const jobElements = document.querySelectorAll('.job-search-card');
                    const results = [];
                    
                    jobElements.forEach(job => {
                        const title = job.querySelector('.base-search-card__title')?.textContent?.trim();
                        const company = job.querySelector('.base-search-card__subtitle')?.textContent?.trim();
                        const location = job.querySelector('.job-search-card__location')?.textContent?.trim();
                        const date = job.querySelector('time')?.getAttribute('datetime');
                        const url = job.querySelector('.base-card__full-link')?.href;
                        
                        if (title && company) {
                            results.push({
                                title,
                                company,
                                location,
                                date,
                                url,
                                source: 'linkedin'
                            });
                        }
                    });
                    
                    return results;
                });
                
                console.log(`✅ Encontrados ${jobs.length} trabajos para "${keyword}"`);
                
                // Procesar y guardar resultados
                for (const job of jobs) {
                    await this.processResult(job);
                    await this.delay(this.config.sources.linkedin.rateLimit);
                }
            }
            
        } catch (error) {
            console.error('❌ Error en scraping LinkedIn:', error.message);
            this.stats.failed++;
        } finally {
            await browser.close();
        }
    }
    
    async scrapeIndeed(keywords = ['software engineer'], location = '') {
        console.log('🔍 Iniciando scraping de Indeed...');
        
        try {
            for (const keyword of keywords) {
                let pageNum = 0;
                let hasMorePages = true;
                
                while (hasMorePages && pageNum < this.config.sources.indeed.maxPages) {
                    const start = pageNum * 10;
                    const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}&start=${start}`;
                    
                    console.log(`📄 Página ${pageNum + 1}: ${url}`);
                    
                    const response = await axios.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    const $ = cheerio.load(response.data);
                    
                    // Extraer trabajos
                    const jobs = [];
                    $('.job_seen_beacon').each((i, element) => {
                        const title = $(element).find('.jobTitle a').text().trim();
                        const company = $(element).find('.companyName').text().trim();
                        const location = $(element).find('.companyLocation').text().trim();
                        const salary = $(element).find('.salary-snippet').text().trim();
                        const date = $(element).find('.date').text().trim();
                        const url = 'https://www.indeed.com' + $(element).find('.jobTitle a').attr('href');
                        
                        if (title && company) {
                            jobs.push({
                                title,
                                company,
                                location,
                                salary,
                                date,
                                url,
                                source: 'indeed'
                            });
                        }
                    });
                    
                    console.log(`✅ Página ${pageNum + 1}: ${jobs.length} trabajos encontrados`);
                    
                    // Procesar resultados
                    for (const job of jobs) {
                        await this.processResult(job);
                    }
                    
                    // Verificar si hay más páginas
                    hasMorePages = $('a[data-testid="pagination-page-next"]').length > 0;
                    pageNum++;
                    
                    // Delay para evitar rate limiting
                    await this.delay(this.config.sources.indeed.rateLimit);
                }
            }
            
        } catch (error) {
            console.error('❌ Error en scraping Indeed:', error.message);
            this.stats.failed++;
        }
    }
    
    async scrapeCustomWebsite(url, selectors) {
        console.log(`🔍 Scraping sitio personalizado: ${url}`);
        
        try {
            const browser = await puppeteer.launch({ headless: 'new' });
            const page = await browser.newPage();
            
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Extraer datos usando selectores personalizados
            const data = await page.evaluate((sel) => {
                const results = {};
                
                for (const [key, selector] of Object.entries(sel)) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        if (elements.length === 1) {
                            results[key] = elements[0].textContent.trim();
                        } else {
                            results[key] = Array.from(elements).map(el => el.textContent.trim());
                        }
                    }
                }
                
                return results;
            }, selectors);
            
            await browser.close();
            
            // Procesar resultado
            const result = {
                ...data,
                url: url,
                source: 'custom',
                scraped_at: new Date().toISOString()
            };
            
            await this.processResult(result);
            console.log(`✅ Datos extraídos: ${Object.keys(data).length} campos`);
            
        } catch (error) {
            console.error('❌ Error en scraping personalizado:', error.message);
            this.stats.failed++;
        }
    }
    
    async processResult(result) {
        try {
            // Enriquecer datos
            const enriched = this.enrichData(result);
            
            // Guardar en memoria
            this.results.push(enriched);
            this.stats.totalScraped++;
            this.stats.successful++;
            
            // Guardar en archivo
            await this.saveToFile(enriched);
            
            // Guardar en base de datos si está disponible
            await this.saveToDatabase(enriched);
            
            // Log
            if (this.stats.totalScraped % 10 === 0) {
                console.log(`📊 Procesados: ${this.stats.totalScraped} registros`);
            }
            
        } catch (error) {
            console.error('❌ Error procesando resultado:', error.message);
            this.stats.failed++;
        }
    }
    
    enrichData(data) {
        // Añadir metadatos y procesamiento adicional
        return {
            ...data,
            processed: true,
            tags: this.generateTags(data),
            metadata: {
                enrichment_date: new Date().toISOString(),
                confidence_score: this.calculateConfidence(data),
                data_quality: 'high'
            }
        };
    }
    
    generateTags(data) {
        const tags = [];
        
        // Generar tags basados en el contenido
        if (data.title) {
            const titleLower = data.title.toLowerCase();
            if (titleLower.includes('senior')) tags.push('senior');
            if (titleLower.includes('junior')) tags.push('junior');
            if (titleLower.includes('remote')) tags.push('remote');
            if (titleLower.includes('fullstack') || titleLower.includes('full-stack')) tags.push('fullstack');
            if (titleLower.includes('frontend') || titleLower.includes('front-end')) tags.push('frontend');
            if (titleLower.includes('backend') || titleLower.includes('back-end')) tags.push('backend');
        }
        
        if (data.salary) tags.push('has_salary');
        if (data.location && data.location.toLowerCase().includes('remote')) tags.push('remote_work');
        
        return tags;
    }
    
    calculateConfidence(data) {
        let score = 0;
        
        if (data.title) score += 30;
        if (data.company) score += 30;
        if (data.location) score += 20;
        if (data.url) score += 10;
        if (data.description) score += 10;
        
        return Math.min(score, 100);
    }
    
    async saveToFile(data) {
        const timestamp = new Date().toISOString().split('T')[0];
        const filePath = path.join(__dirname, 'data', 'raw', `scraped_${timestamp}.json`);
        
        let existingData = [];
        if (fs.existsSync(filePath)) {
            existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        
        existingData.push(data);
        
        fs.writeFileSync(
            filePath,
            JSON.stringify(existingData, null, 2)
        );
    }
    
    async saveToDatabase(data) {
        try {
            const connection = await mysql.createConnection({
                host: this.config.database.host,
                user: this.config.database.user,
                password: this.config.database.password,
                database: this.config.database.database
            });
            
            await connection.query(
                `INSERT INTO ${this.config.database.table} SET ?`,
                data
            );
            
            await connection.end();
        } catch (error) {
            // Silenciar error si la DB no está disponible
        }
    }
    
    async exportData(format = 'json') {
        console.log(`📤 Exportando datos en formato: ${format.toUpperCase()}`);
        
        const exportDir = path.join(__dirname, 'data', 'export');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        switch (format.toLowerCase()) {
            case 'json':
                const jsonPath = path.join(exportDir, `export_${timestamp}.json`);
                fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));
                console.log(`✅ JSON exportado: ${jsonPath}`);
                break;
                
            case 'csv':
                const csvPath = path.join(exportDir, `export_${timestamp}.csv`);
                const csvContent = this.convertToCSV(this.results);
                fs.writeFileSync(csvPath, csvContent);
                console.log(`✅ CSV exportado: ${csvPath}`);
                break;
                
            case 'excel':
                // Implementación básica - en producción usaría una librería como xlsx
                const excelPath = path.join(exportDir, `export_${timestamp}.xlsx`);
                console.log(`📝 Excel exportado (simulado): ${excelPath}`);
                break;
                
            case 'sql':
                const sqlPath = path.join(exportDir, `export_${timestamp}.sql`);
                const sqlContent = this.convertToSQL(this.results);
                fs.writeFileSync(sqlPath, sqlContent);
                console.log(`✅ SQL exportado: ${sqlPath}`);
                break;
        }
        
        // Generar reporte
        await this.generateReport();
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item => 
            Object.values(item)
                .map(val => typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val)
                .join(',')
        );
        
        return [headers, ...rows].join('\n');
    }
    
    convertToSQL(data) {
        if (data.length === 0) return '';
        
        const tableName = this.config.database.table;
        const sqlStatements = data.map(item => {
            const columns = Object.keys(item).join(', ');
            const values = Object.values(item)
                .map(val => typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val)
                .join(', ');
            
            return `INSERT INTO ${tableName} (${columns}) VALUES (${values});`;
        });
        
        return sqlStatements.join('\n');
    }
    
    async generateReport() {
        const report = {
            system: 'Advanced Scraping System',
            version: '1.0.0',
            stats: this.stats,
            config: {
                sources: Object.keys(this.config.sources).filter(k => this.config.sources[k].enabled),
                total_results: this.results.length,
                export_formats: this.config.export.formats
            },
            summary: {
                unique_companies: [...new Set(this.results.map(r => r.company))].length,
                date