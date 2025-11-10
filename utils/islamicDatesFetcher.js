// islamicDatesFetcher.js
const fs = require('fs').promises;
const path = require('path');

class IslamicDatesFetcher {
    constructor(apiKey, useMongoDb = false, mongoConnection = null) {
        this.apiKey = process.env.CALENDARIFIC_API_KEY || apiKey;
        this.useMongoDb = useMongoDb;
        this.mongoConnection = mongoConnection;
        this.cacheFilePath = path.join(__dirname, 'islamic_dates_cache.json');
        this.baseUrl = 'https://calendarific.com/api/v2/holidays';
        
        // Islamic holidays to fetch from API
        this.islamicHolidays = [
            'Muharram', 
            'Ashura', 
            'Mawlid al-Nabi', 
            'Ramadan', 
            'Eid al-Fitr', 
            'Eid al-Adha',
            'Laylat al-Qadr'
        ];
    }

    /**
     * Initialize the fetcher - call this when server starts
     */
    async initialize() {
        try {
            console.log('🕌 Initializing Islamic dates fetcher...');
            
            const cachedData = await this.getCachedData();
            const currentYear = new Date().getFullYear();
            
            // Check if we need to fetch new data
            if (!cachedData || this.shouldRefreshCache(cachedData, currentYear)) {
                console.log('📅 Fetching fresh Islamic dates from API...');
                await this.fetchAndCacheIslamicDates(currentYear);
            } else {
                console.log('✅ Using cached Islamic dates');
            }
            
            // Set up monthly refresh
            this.setupMonthlyRefresh();
            
        } catch (error) {
            console.error('❌ Error initializing Islamic dates fetcher:', error);
            // Continue with hardcoded fallback dates
            await this.createFallbackCache();
        }
    }

    /**
     * Fetch Islamic holidays from Calendarific API
     */
    async fetchIslamicHolidays(year, country = 'PK') {
        const url = `${this.baseUrl}?api_key=${this.apiKey}&country=${country}&year=${year}&type=religious`;
        
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.response || !data.response.holidays) {
                throw new Error('Invalid API response format');
            }
            
            return this.parseIslamicHolidays(data.response.holidays);
            
        } catch (error) {
            console.error(`Error fetching Islamic holidays for ${year}:`, error);
            throw error;
        }
    }

    /**
     * Parse and filter Islamic holidays from API response
     */
    parseIslamicHolidays(holidays) {
        const islamicDates = {};
        
        holidays.forEach(holiday => {
            const holidayName = holiday.name.toLowerCase();
            const date = new Date(holiday.date.iso);
            
            // Map API holiday names to our theme names
            if (holidayName.includes('muharram') || holidayName.includes('ashura')) {
                islamicDates.muharram = {
                    month: date.getMonth() + 1,
                    day: date.getDate(),
                    year: date.getFullYear(),
                    name: 'Muharram',
                    apiName: holiday.name
                };
            } else if (holidayName.includes('mawlid') || holidayName.includes('milad')) {
                islamicDates.mawlid = {
                    month: date.getMonth() + 1,
                    day: date.getDate(),
                    year: date.getFullYear(),
                    name: '12 Rabi ul-Awal (Mawlid)',
                    apiName: holiday.name
                };
            } else if (holidayName.includes('ramadan') && !holidayName.includes('eid')) {
                islamicDates.ramadanStart = {
                    month: date.getMonth() + 1,
                    day: date.getDate(),
                    year: date.getFullYear(),
                    name: 'Ramadan Start',
                    apiName: holiday.name
                };
            } else if (holidayName.includes('eid al-fitr') || holidayName.includes('eid ul-fitr')) {
                islamicDates.eidFitr = {
                    month: date.getMonth() + 1,
                    day: date.getDate(),
                    year: date.getFullYear(),
                    name: 'Eid ul-Fitr',
                    apiName: holiday.name
                };
            } else if (holidayName.includes('eid al-adha') || holidayName.includes('eid ul-adha')) {
                islamicDates.eidAdha = {
                    month: date.getMonth() + 1,
                    day: date.getDate(),
                    year: date.getFullYear(),
                    name: 'Eid ul-Adha',
                    apiName: holiday.name
                };
            }
        });
        
        return islamicDates;
    }

    /**
     * Fetch and cache Islamic dates for current and next year
     */
    async fetchAndCacheIslamicDates(currentYear) {
        try {
            const currentYearDates = await this.fetchIslamicHolidays(currentYear);
            const nextYearDates = await this.fetchIslamicHolidays(currentYear + 1);
            
            const cacheData = {
                lastUpdated: new Date().toISOString(),
                lastUpdatedMonth: new Date().getMonth() + 1,
                lastUpdatedYear: currentYear,
                currentYear: {
                    year: currentYear,
                    holidays: currentYearDates
                },
                nextYear: {
                    year: currentYear + 1,
                    holidays: nextYearDates
                }
            };
            
            await this.saveCacheData(cacheData);
            console.log(`✅ Successfully cached Islamic dates for ${currentYear} and ${currentYear + 1}`);
            
        } catch (error) {
            console.error('Error fetching and caching Islamic dates:', error);
            throw error;
        }
    }

    /**
     * Get cached data from file or MongoDB
     */
    async getCachedData() {
        try {
            if (this.useMongoDb && this.mongoConnection) {
                return await this.getCachedDataFromMongo();
            } else {
                return await this.getCachedDataFromFile();
            }
        } catch (error) {
            console.log('No cached data found or error reading cache');
            return null;
        }
    }

    /**
     * Get cached data from JSON file
     */
    async getCachedDataFromFile() {
        try {
            const data = await fs.readFile(this.cacheFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get cached data from MongoDB
     */
    async getCachedDataFromMongo() {
        if (!this.mongoConnection) return null;
        
        try {
            const db = this.mongoConnection.db('islamic_calendar');
            const collection = db.collection('cached_dates');
            return await collection.findOne({ type: 'islamic_holidays' });
        } catch (error) {
            console.error('Error reading from MongoDB:', error);
            return null;
        }
    }

    /**
     * Save cache data to file or MongoDB
     */
    async saveCacheData(data) {
        if (this.useMongoDb && this.mongoConnection) {
            await this.saveCacheDataToMongo(data);
        } else {
            await this.saveCacheDataToFile(data);
        }
    }

    /**
     * Save cache data to JSON file
     */
    async saveCacheDataToFile(data) {
        try {
            await fs.writeFile(this.cacheFilePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('Error writing cache file:', error);
            throw error;
        }
    }

    /**
     * Save cache data to MongoDB
     */
    async saveCacheDataToMongo(data) {
        if (!this.mongoConnection) throw new Error('MongoDB connection not available');
        
        try {
            const db = this.mongoConnection.db('islamic_calendar');
            const collection = db.collection('cached_dates');
            
            await collection.replaceOne(
                { type: 'islamic_holidays' },
                { type: 'islamic_holidays', ...data },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error saving to MongoDB:', error);
            throw error;
        }
    }

    /**
     * Check if cache needs refresh
     */
    shouldRefreshCache(cachedData, currentYear) {
        if (!cachedData.lastUpdatedYear || !cachedData.lastUpdatedMonth) {
            return true;
        }
        
        const currentMonth = new Date().getMonth() + 1;
        
        // Refresh if year changed or if it's a new month
        return (
            cachedData.lastUpdatedYear < currentYear ||
            cachedData.lastUpdatedMonth < currentMonth ||
            !cachedData.currentYear ||
            !cachedData.nextYear
        );
    }

    /**
     * Get Islamic festival dates for a specific year
     */
    async getIslamicFestivalDates(year = new Date().getFullYear()) {
        const cachedData = await this.getCachedData();
        
        if (!cachedData) {
            console.warn('No cached Islamic dates available, using fallback');
            return this.getFallbackDates();
        }
        
        // Return appropriate year data
        if (cachedData.currentYear && cachedData.currentYear.year === year) {
            return cachedData.currentYear.holidays;
        } else if (cachedData.nextYear && cachedData.nextYear.year === year) {
            return cachedData.nextYear.holidays;
        }
        
        console.warn(`No cached data for year ${year}, using fallback`);
        return this.getFallbackDates();
    }

    /**
     * Setup monthly refresh - runs on 1st of each month
     */
    setupMonthlyRefresh() {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 2, 0, 0); // 2 AM on 1st of next month
        const timeUntilNextMonth = nextMonth.getTime() - now.getTime();
        
        setTimeout(async () => {
            console.log('🔄 Monthly refresh of Islamic dates...');
            try {
                const currentYear = new Date().getFullYear();
                await this.fetchAndCacheIslamicDates(currentYear);
            } catch (error) {
                console.error('Error in monthly refresh:', error);
            }
            
            // Set up next month's refresh
            this.setupMonthlyRefresh();
        }, timeUntilNextMonth);
        
        console.log(`⏰ Next Islamic dates refresh scheduled for: ${nextMonth.toLocaleString()}`);
    }

    /**
     * Create fallback cache with approximate dates
     */
    async createFallbackCache() {
        const currentYear = new Date().getFullYear();
        const fallbackData = {
            lastUpdated: new Date().toISOString(),
            lastUpdatedMonth: new Date().getMonth() + 1,
            lastUpdatedYear: currentYear,
            currentYear: {
                year: currentYear,
                holidays: this.getFallbackDates()
            },
            nextYear: {
                year: currentYear + 1,
                holidays: this.getFallbackDates(currentYear + 1)
            }
        };
        
        await this.saveCacheData(fallbackData);
        console.log('📝 Created fallback cache with approximate dates');
    }

    /**
     * Fallback approximate dates when API is not available
     */
    getFallbackDates(year = new Date().getFullYear()) {
        // These are approximate and will shift each year
        const baseYear = 2024;
        const yearDiff = year - baseYear;
        const islamicYearShift = Math.floor(yearDiff * 11); // Approximate 11-day shift per year
        
        return {
            muharram: {
                month: 8,
                day: Math.max(1, 10 - islamicYearShift % 30),
                year: year,
                name: 'Muharram',
                apiName: 'Ashura (approximate)'
            },
            eidFitr: {
                month: 4,
                day: Math.max(1, 10 - islamicYearShift % 30),
                year: year,
                name: 'Eid ul-Fitr',
                apiName: 'Eid al-Fitr (approximate)'
            },
            eidAdha: {
                month: 6,
                day: Math.max(1, 16 - islamicYearShift % 30),
                year: year,
                name: 'Eid ul-Adha',
                apiName: 'Eid al-Adha (approximate)'
            },
            mawlid: {
                month: 10,
                day: Math.max(1, 19 - islamicYearShift % 30),
                year: year,
                name: '12 Rabi ul-Awal (Mawlid)',
                apiName: 'Mawlid al-Nabi (approximate)'
            }
        };
    }

    /**
     * Manual refresh method for testing or forced updates
     */
    async forceRefresh() {
        const currentYear = new Date().getFullYear();
        await this.fetchAndCacheIslamicDates(currentYear);
        console.log('✅ Manual refresh completed');
    }
}

module.exports = IslamicDatesFetcher;