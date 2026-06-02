// assets/js/modules/config.js

/**
 * Configuration constants for Muñoz Burger website
 */
export const CONFIG = {
    ANIMATIONS: {
        TOAST_DURATION: 3000,
        BUTTON_FEEDBACK_DURATION: 1200
    },
    SCROLL: {
        THRESHOLD: 50,
        DEBOUNCE_DELAY: 10
    },
    BUSINESS: {
        OPEN_TIME: 13.00, // 1:00 PM
        CLOSE_TIME: 21.00,   // 9:00 PM
        ADDRESS: 'Prolongación Álvaro Obregón 4257, Villa Sonora, 84093 Heroica Nogales, Son'
    },
    SELECTORS: {
        BUSINESS: {
            STATUS_CONTAINER: '#business-status',
            STATUS_INDICATOR: '#status-indicator',
            STATUS_TEXT: '#status-text'
        }
    }
};

export const CONTACT_INFO = {
    phone: '+526311093226',
    phoneDisplay: '+52 631 109 3226',
    email: 'info@munozburger.com',
    whatsappUrl: 'https://wa.me/message/VE4RQVV7SXPSN1',
    address: {
        full: 'Prolongación Álvaro Obregón 4257, Villa Sonora, 84093 Heroica Nogales, Son',
        street: 'Prolongación Álvaro Obregón 4257',
        city: 'Villa Sonora, Heroica Nogales, Sonora',
        postalCode: '84093'
    },
    googleMapsUrl: 'https://maps.app.goo.gl/tumFtTnoojhrDaqt7'
};