const pakistaniFestivals = [
    {
        name: 'Pakistan Independence Day',
        dates: [{ month: 8, day: 14 }],
        theme: 'independence',
        colors: {
            '--bg-primary': '#0d4a1f',
            '--bg-secondary': '#1a7030',
            '--bg-tertiary': '#28a745',
            '--text-primary': '#ffffff',
            '--text-secondary': '#f0f9f2',
            '--text-muted': '#c8e6c9',
            '--border-color': '#45c663',
            '--accent-primary': '#5ddb73',
            '--accent-secondary': '#2e8b57',
            '--success': '#28a745',
            '--warning': '#ffc107',
            '--danger': '#dc3545',
            '--info': '#17a2b8',
            '--shadow': 'rgba(45, 167, 69, 0.4)',
            '--shadow-lg': 'rgba(45, 167, 69, 0.6)',
            '--bg-overlay': 'rgba(26, 112, 48, 0.9)'
        },
        description: 'Rich emerald green theme celebrating Pakistan Independence Day'
    },
    {
        name: 'Pakistan Day',
        dates: [{ month: 3, day: 23 }],
        theme: 'pakistan-day',
        colors: {
            '--bg-primary': '#ffffff',
            '--bg-secondary': '#f8f9fa',
            '--bg-tertiary': '#e9ecef',
            '--text-primary': '#1a5f1a',
            '--text-secondary': '#2d4a2d',
            '--text-muted': '#5a7a5a',
            '--border-color': '#28a745',
            '--accent-primary': '#28a745',
            '--accent-secondary': '#34ce57',
            '--success': '#28a745',
            '--warning': '#fd7e14',
            '--danger': '#dc3545',
            '--info': '#17a2b8',
            '--shadow': 'rgba(40, 167, 69, 0.2)',
            '--shadow-lg': 'rgba(40, 167, 69, 0.3)',
            '--bg-overlay': 'rgba(255, 255, 255, 0.95)'
        },
        description: 'Clean white and green theme for Pakistan Day'
    },
    {
        name: 'Kashmir Solidarity Day',
        dates: [{ month: 2, day: 5 }],
        theme: 'kashmir-day',
        colors: {
            '--bg-primary': '#0a0a0a',
            '--bg-secondary': '#1f1f1f',
            '--bg-tertiary': '#343434',
            '--text-primary': '#ffffff',
            '--text-secondary': '#e0e0e0',
            '--text-muted': '#a0a0a0',
            '--border-color': '#4a4a4a',
            '--accent-primary': '#ffffff',
            '--accent-secondary': '#d0d0d0',
            '--success': '#28a745',
            '--warning': '#ffc107',
            '--danger': '#dc3545',
            '--info': '#17a2b8',
            '--shadow': 'rgba(255, 255, 255, 0.3)',
            '--shadow-lg': 'rgba(255, 255, 255, 0.5)',
            '--bg-overlay': 'rgba(10, 10, 10, 0.95)'
        },
        description: 'Stark black and white theme for Kashmir Solidarity Day'
    },
    {
        name: 'Defence Day',
        dates: [{ month: 9, day: 6 }],
        theme: 'defence-day',
        colors: {
            '--bg-primary': '#2d4a22',
            '--bg-secondary': '#3c5c31',
            '--bg-tertiary': '#4b6e40',
            '--text-primary': '#f5f8f5',
            '--text-secondary': '#e8f2e8',
            '--text-muted': '#d0e0d0',
            '--border-color': '#5a804f',
            '--accent-primary': '#7cb342',
            '--accent-secondary': '#689f38',
            '--success': '#8bc34a',
            '--warning': '#ff9800',
            '--danger': '#f44336',
            '--info': '#2196f3',
            '--shadow': 'rgba(124, 179, 66, 0.4)',
            '--shadow-lg': 'rgba(124, 179, 66, 0.6)',
            '--bg-overlay': 'rgba(60, 92, 49, 0.9)'
        },
        description: 'Military olive green theme for Defence Day'
    },
    {
        name: 'Quaid-e-Azam Birthday',
        dates: [{ month: 12, day: 25 }],
        theme: 'quaid-birthday',
        colors: {
            '--bg-primary': '#1a2332',
            '--bg-secondary': '#2c3e50',
            '--bg-tertiary': '#34495e',
            '--text-primary': '#ecf0f1',
            '--text-secondary': '#d5dbdb',
            '--text-muted': '#aeb6bf',
            '--border-color': '#5d6d7e',
            '--accent-primary': '#3498db',
            '--accent-secondary': '#5dade2',
            '--success': '#27ae60',
            '--warning': '#f39c12',
            '--danger': '#e74c3c',
            '--info': '#85c1e9',
            '--shadow': 'rgba(52, 152, 219, 0.4)',
            '--shadow-lg': 'rgba(52, 152, 219, 0.6)',
            '--bg-overlay': 'rgba(44, 62, 80, 0.9)'
        },
        description: 'Distinguished navy blue theme for Quaid-e-Azam Birthday'
    },
    {
        name: 'Muharram',
        dates: [{ month: 8, day: 10 }], // 10th Muharram (Ashura) - approximate
        theme: 'muharram',
        colors: {
            '--bg-primary': '#1a0d1a',
            '--bg-secondary': '#2d1b2d',
            '--bg-tertiary': '#402940',
            '--text-primary': '#f8f0f8',
            '--text-secondary': '#e6d6e6',
            '--text-muted': '#d0c0d0',
            '--border-color': '#533753',
            '--accent-primary': '#8e44ad',
            '--accent-secondary': '#9b59b6',
            '--success': '#27ae60',
            '--warning': '#f39c12',
            '--danger': '#e74c3c',
            '--info': '#3498db',
            '--shadow': 'rgba(142, 68, 173, 0.5)',
            '--shadow-lg': 'rgba(142, 68, 173, 0.7)',
            '--bg-overlay': 'rgba(45, 27, 45, 0.95)'
        },
        description: 'Solemn deep purple theme for Muharram'
    },
    {
        name: 'Eid ul-Fitr',
        dates: [{ month: 4, day: 10 }], // Approximate - varies each year
        theme: 'eid-fitr',
        colors: {
            '--bg-primary': '#0f3460',
            '--bg-secondary': '#16537e',
            '--bg-tertiary': '#1e729b',
            '--text-primary': '#ffd700',
            '--text-secondary': '#ffe55c',
            '--text-muted': '#ffeb99',
            '--border-color': '#2591b8',
            '--accent-primary': '#ffd700',
            '--accent-secondary': '#ffcc00',
            '--success': '#28a745',
            '--warning': '#ffc107',
            '--danger': '#dc3545',
            '--info': '#17a2b8',
            '--shadow': 'rgba(255, 215, 0, 0.5)',
            '--shadow-lg': 'rgba(255, 215, 0, 0.7)',
            '--bg-overlay': 'rgba(21, 83, 126, 0.9)'
        },
        description: 'Festive blue and gold theme for Eid ul-Fitr'
    },
    {
        name: 'Eid ul-Adha',
        dates: [{ month: 6, day: 16 }], // Approximate - varies each year
        theme: 'eid-adha',
        colors: {
            '--bg-primary': '#4a1a1a',
            '--bg-secondary': '#6b2c2c',
            '--bg-tertiary': '#8c3e3e',
            '--text-primary': '#ffd700',
            '--text-secondary': '#ffe55c',
            '--text-muted': '#ffeb99',
            '--border-color': '#ad5050',
            '--accent-primary': '#ffd700',
            '--accent-secondary': '#cd853f',
            '--success': '#28a745',
            '--warning': '#ffc107',
            '--danger': '#dc3545',
            '--info': '#17a2b8',
            '--shadow': 'rgba(205, 133, 63, 0.5)',
            '--shadow-lg': 'rgba(205, 133, 63, 0.7)',
            '--bg-overlay': 'rgba(107, 44, 44, 0.9)'
        },
        description: 'Warm maroon and gold theme for Eid ul-Adha'
    },
    {
        name: '12 Rabi ul-Awal (Mawlid)',
        dates: [{ month: 10, day: 19 }], // Approximate - varies each year
        theme: 'mawlid',
        colors: {
            '--bg-primary': '#1a4d3a',
            '--bg-secondary': '#2d6b4d',
            '--bg-tertiary': '#408960',
            '--text-primary': '#ffffff',
            '--text-secondary': '#f0fff0',
            '--text-muted': '#e0f0e0',
            '--border-color': '#53a773',
            '--accent-primary': '#66c586',
            '--accent-secondary': '#4caf50',
            '--success': '#4caf50',
            '--warning': '#ff9800',
            '--danger': '#f44336',
            '--info': '#2196f3',
            '--shadow': 'rgba(102, 197, 134, 0.4)',
            '--shadow-lg': 'rgba(102, 197, 134, 0.6)',
            '--bg-overlay': 'rgba(45, 107, 77, 0.9)'
        },
        description: 'Sacred green theme for 12 Rabi ul-Awal (Mawlid)'
    },
    {
        name: 'New Year',
        dates: [{ month: 1, day: 1 }],
        theme: 'new-year',
        colors: {
            '--bg-primary': '#1a0d33',
            '--bg-secondary': '#2d1b4d',
            '--bg-tertiary': '#402966',
            '--text-primary': '#ffd700',
            '--text-secondary': '#ffe55c',
            '--text-muted': '#ffeb99',
            '--border-color': '#533780',
            '--accent-primary': '#ff6b35',
            '--accent-secondary': '#ff8c42',
            '--success': '#28a745',
            '--warning': '#ffc107',
            '--danger': '#dc3545',
            '--info': '#17a2b8',
            '--shadow': 'rgba(255, 107, 53, 0.5)',
            '--shadow-lg': 'rgba(255, 107, 53, 0.7)',
            '--bg-overlay': 'rgba(45, 27, 77, 0.95)'
        },
        description: 'Celebratory purple, gold and orange theme for New Year'
    },
    {
        name: 'Founder Birthday (September 8)',
        dates: [{ month: 9, day: 8 }],
        theme: 'founder-birthday',
        colors: {
            '--bg-primary': '#2a2a2a',
            '--bg-secondary': '#3d3d3d',
            '--bg-tertiary': '#505050',
            '--text-primary': '#ffffff',
            '--text-secondary': '#e6e6e6',
            '--text-muted': '#cccccc',
            '--border-color': '#636363',
            '--accent-primary': '#808080',
            '--accent-secondary': '#969696',
            '--success': '#6a6a6a',
            '--warning': '#a9a9a9',
            '--danger': '#7a7a7a',
            '--info': '#8d8d8d',
            '--shadow': 'rgba(128, 128, 128, 0.4)',
            '--shadow-lg': 'rgba(128, 128, 128, 0.6)',
            '--bg-overlay': 'rgba(61, 61, 61, 0.95)'
        },
        description: 'Pure grayscale theme for Founder Birthday'
    }
];

// Ramadan dates (approximate, varies each year)
const getRamadanDates = (year) => {
    // Ramadan dates shift approximately 11 days earlier each year
    const ramadanStart2024 = new Date(2024, 2, 11); // March 11, 2024
    const ramadanEnd2024 = new Date(2024, 3, 9);    // April 9, 2024

    // Calculate offset from 2024
    const yearDiff = year - 2024;
    const dayShift = yearDiff * -11; // Approximately 11 days earlier each year

    const startDate = new Date(ramadanStart2024);
    startDate.setDate(startDate.getDate() + dayShift);

    const endDate = new Date(ramadanEnd2024);
    endDate.setDate(endDate.getDate() + dayShift);

    return { start: startDate, end: endDate };
};

const ramadanTheme = {
    name: 'Ramadan',
    theme: 'ramadan',
    colors: {
        '--bg-primary': '#1a1a4d',
        '--bg-secondary': '#2d2d66',
        '--bg-tertiary': '#404080',
        '--text-primary': '#ffd700',
        '--text-secondary': '#ffe55c',
        '--text-muted': '#ffeb99',
        '--border-color': '#535399',
        '--accent-primary': '#ffd700',
        '--accent-secondary': '#daa520',
        '--success': '#28a745',
        '--warning': '#ffc107',
        '--danger': '#dc3545',
        '--info': '#17a2b8',
        '--shadow': 'rgba(255, 215, 0, 0.5)',
        '--shadow-lg': 'rgba(255, 215, 0, 0.7)',
        '--bg-overlay': 'rgba(45, 45, 102, 0.9)'
    },
    description: 'Deep indigo and gold theme for the holy month of Ramadan'
};

// Weather-based themes with completely different color schemes
const weatherThemes = {
    sunny: {
        name: 'Sunny Weather',
        theme: 'sunny',
        colors: {
            '--bg-primary': '#ff4500',
            '--bg-secondary': '#ff6347',
            '--bg-tertiary': '#ff7f50',
            '--text-primary': '#ffffff',
            '--text-secondary': '#fff8dc',
            '--text-muted': '#ffe4b5',
            '--border-color': '#ff6347',
            '--accent-primary': '#ffa500',
            '--accent-secondary': '#ffb347',
            '--success': '#32cd32',
            '--warning': '#ffd700',
            '--danger': '#dc143c',
            '--info': '#1e90ff',
            '--shadow': 'rgba(255, 69, 0, 0.4)',
            '--shadow-lg': 'rgba(255, 69, 0, 0.6)',
            '--bg-overlay': 'rgba(255, 99, 71, 0.85)'
        },
        description: 'Vibrant orange-red theme for sunny weather'
    },
    rainy: {
        name: 'Rainy Weather',
        theme: 'rainy',
        colors: {
            '--bg-primary': '#1e3a8a',
            '--bg-secondary': '#3b82f6',
            '--bg-tertiary': '#60a5fa',
            '--text-primary': '#f0f9ff',
            '--text-secondary': '#dbeafe',
            '--text-muted': '#bfdbfe',
            '--border-color': '#2563eb',
            '--accent-primary': '#06b6d4',
            '--accent-secondary': '#0891b2',
            '--success': '#10b981',
            '--warning': '#f59e0b',
            '--danger': '#ef4444',
            '--info': '#3b82f6',
            '--shadow': 'rgba(6, 182, 212, 0.4)',
            '--shadow-lg': 'rgba(6, 182, 212, 0.6)',
            '--bg-overlay': 'rgba(30, 58, 138, 0.85)'
        },
        description: 'Deep blue cyan theme for rainy weather'
    },
    stormy: {
        name: 'Stormy Weather',
        theme: 'stormy',
        colors: {
            '--bg-primary': '#18181b',
            '--bg-secondary': '#27272a',
            '--bg-tertiary': '#3f3f46',
            '--text-primary': '#fbbf24',
            '--text-secondary': '#fcd34d',
            '--text-muted': '#fed7aa',
            '--border-color': '#52525b',
            '--accent-primary': '#dc2626',
            '--accent-secondary': '#ef4444',
            '--success': '#059669',
            '--warning': '#d97706',
            '--danger': '#dc2626',
            '--info': '#0284c7',
            '--shadow': 'rgba(220, 38, 38, 0.5)',
            '--shadow-lg': 'rgba(220, 38, 38, 0.7)',
            '--bg-overlay': 'rgba(39, 39, 42, 0.9)'
        },
        description: 'Dark zinc with red accents theme for stormy weather'
    },
    cloudy: {
        name: 'Cloudy Weather',
        theme: 'cloudy',
        colors: {
            '--bg-primary': '#475569',
            '--bg-secondary': '#64748b',
            '--bg-tertiary': '#94a3b8',
            '--text-primary': '#f8fafc',
            '--text-secondary': '#e2e8f0',
            '--text-muted': '#cbd5e0',
            '--border-color': '#6b7280',
            '--accent-primary': '#06b6d4',
            '--accent-secondary': '#0891b2',
            '--success': '#10b981',
            '--warning': '#f59e0b',
            '--danger': '#ef4444',
            '--info': '#3b82f6',
            '--shadow': 'rgba(6, 182, 212, 0.3)',
            '--shadow-lg': 'rgba(6, 182, 212, 0.5)',
            '--bg-overlay': 'rgba(100, 116, 139, 0.8)'
        },
        description: 'Cool slate grey theme for cloudy weather'
    }
};

const getThemeForDate = (date = new Date(), weather = null) => {
    // PRIORITY 1: Pakistani festivals and special occasions (HIGHEST PRIORITY)
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    // Check Ramadan first
    const ramadanDates = getRamadanDates(year);
    if (date >= ramadanDates.start && date <= ramadanDates.end) {
        return ramadanTheme;
    }

    // Check fixed festivals
    for (const festival of pakistaniFestivals) {
        for (const festivalDate of festival.dates) {
            if (month === festivalDate.month && day === festivalDate.day) {
                return {
                    name: festival.name,
                    theme: festival.theme,
                    colors: festival.colors,
                    description: festival.description
                };
            }
        }
    }

    // PRIORITY 2: Weather-based theme (if weather provided and no festival)
    if (weather) {
        const weatherTheme = getCurrentWeatherTheme(weather);
        if (weatherTheme) return weatherTheme;
    }

    // PRIORITY 3: Seasonal themes (fallback)
    return getSeasonalTheme(month);
};

// Get seasonal theme based on month - completely redesigned
const getSeasonalTheme = (month) => {
    if (month >= 12 || month <= 2) {
        // Winter - Icy blue theme
        return {
            name: 'Winter Season',
            theme: 'winter',
            colors: {
                '--bg-primary': '#0c4a6e',
                '--bg-secondary': '#0284c7',
                '--bg-tertiary': '#0ea5e9',
                '--text-primary': '#f0f9ff',
                '--text-secondary': '#e0f2fe',
                '--text-muted': '#bae6fd',
                '--border-color': '#0369a1',
                '--accent-primary': '#38bdf8',
                '--accent-secondary': '#0ea5e9',
                '--success': '#10b981',
                '--warning': '#f59e0b',
                '--danger': '#ef4444',
                '--info': '#3b82f6',
                '--shadow': 'rgba(56, 189, 248, 0.3)',
                '--shadow-lg': 'rgba(56, 189, 248, 0.5)',
                '--bg-overlay': 'rgba(2, 132, 199, 0.8)'
            },
            description: 'Crisp icy blue winter theme'
        };
    } else if (month >= 3 && month <= 5) {
        // Spring - Fresh lime green
        return {
            name: 'Spring Season',
            theme: 'spring',
            colors: {
                '--bg-primary': '#365314',
                '--bg-secondary': '#4d7c0f',
                '--bg-tertiary': '#65a30d',
                '--text-primary': '#f7fee7',
                '--text-secondary': '#ecfccb',
                '--text-muted': '#d9f99d',
                '--border-color': '#84cc16',
                '--accent-primary': '#a3e635',
                '--accent-secondary': '#84cc16',
                '--success': '#22c55e',
                '--warning': '#eab308',
                '--danger': '#ef4444',
                '--info': '#3b82f6',
                '--shadow': 'rgba(163, 230, 53, 0.3)',
                '--shadow-lg': 'rgba(163, 230, 53, 0.5)',
                '--bg-overlay': 'rgba(77, 124, 15, 0.8)'
            },
            description: 'Vibrant lime green spring theme'
        };
    } else if (month >= 6 && month <= 8) {
        // Summer - Bright coral/pink
        return {
            name: 'Summer Season',
            theme: 'summer',
            colors: {
                '--bg-primary': '#be185d',
                '--bg-secondary': '#e11d48',
                '--bg-tertiary': '#f43f5e',
                '--text-primary': '#fdf2f8',
                '--text-secondary': '#fce7f3',
                '--text-muted': '#fbcfe8',
                '--border-color': '#ec4899',
                '--accent-primary': '#f472b6',
                '--accent-secondary': '#ec4899',
                '--success': '#10b981',
                '--warning': '#f59e0b',
                '--danger': '#ef4444',
                '--info': '#3b82f6',
                '--shadow': 'rgba(244, 114, 182, 0.4)',
                '--shadow-lg': 'rgba(244, 114, 182, 0.6)',
                '--bg-overlay': 'rgba(225, 29, 72, 0.8)'
            },
            description: 'Bright coral pink summer theme'
        };
    } else {
        // Autumn - Rich amber/brown
        return {
            name: 'Autumn Season',
            theme: 'autumn',
            colors: {
                '--bg-primary': '#92400e',
                '--bg-secondary': '#c2410c',
                '--bg-tertiary': '#ea580c',
                '--text-primary': '#fffbeb',
                '--text-secondary': '#fef3c7',
                '--text-muted': '#fed7aa',
                '--border-color': '#f97316',
                '--accent-primary': '#fb923c',
                '--accent-secondary': '#f97316',
                '--success': '#16a34a',
                '--warning': '#eab308',
                '--danger': '#dc2626',
                '--info': '#0891b2',
                '--shadow': 'rgba(251, 146, 60, 0.4)',
                '--shadow-lg': 'rgba(251, 146, 60, 0.6)',
                '--bg-overlay': 'rgba(194, 65, 12, 0.8)'
            },
            description: 'Rich amber autumn theme'
        };
    }
};

// Get weather-based theme
const getCurrentWeatherTheme = (weather) => {
    const weatherCondition = weather.toLowerCase();

    if (weatherCondition.includes('sun') || weatherCondition.includes('clear')) {
        return weatherThemes.sunny;
    } else if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle')) {
        return weatherThemes.rainy;
    } else if (weatherCondition.includes('storm') || weatherCondition.includes('thunder')) {
        return weatherThemes.stormy;
    } else if (weatherCondition.includes('cloud')) {
        return weatherThemes.cloudy;
    }

    return null; // No specific weather theme found
};

// Helper function to check if a date falls within Ramadan
const isRamadan = (date = new Date()) => {
    const year = date.getFullYear();
    const ramadanDates = getRamadanDates(year);
    return date >= ramadanDates.start && date <= ramadanDates.end;
};

// Get upcoming festivals
const getUpcomingFestivals = (days = 30) => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);

    const upcoming = [];

    // Check each day in the range
    for (let d = new Date(today); d <= futureDate; d.setDate(d.getDate() + 1)) {
        const theme = getThemeForDate(new Date(d));
        if (theme && theme.name !== 'Winter Season' && theme.name !== 'Spring Season' &&
            theme.name !== 'Summer Season' && theme.name !== 'Autumn Season') {
            upcoming.push({
                date: new Date(d),
                festival: theme.name,
                theme: theme.theme
            });
        }
    }

    return upcoming;
};

module.exports = {
    getThemeForDate,
    getCurrentWeatherTheme,
    isRamadan,
    getUpcomingFestivals,
    pakistaniFestivals,
    weatherThemes
};