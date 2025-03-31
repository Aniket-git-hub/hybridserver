// src/utils/handlebarsHelpers.ts
import handlebars from 'handlebars';

// Register helper to get current year for copyright notices
handlebars.registerHelper('currentYear', () => {
    return new Date().getFullYear();
});

export default handlebars;