/**
 * @fileoverview Утилита для категоризации бизнес-планов по названию.
 */

/**
 * Словарь, сопоставляющий корневые части слов с тегами.
 * Это позволяет обрабатывать разные формы одного и того же слова.
 * @type {Object<string, string>}
 */
const KEYWORD_ROOTS_TO_TAGS = {
    'разработ': 'разработка',
    'создан': 'разработка',
    'веб': 'веб',
    'web': 'веб',
    'сайт': 'веб',
    'мобильн': 'мобильное',
    'mobile': 'мобильное',
    'ios': 'мобильное',
    'android': 'мобильное',
    'приложен': 'приложение',
    'сервис': 'сервис',
    'систем': 'система',
    'платформ': 'платформа',
    'планирован': 'планирование',
    'учет': 'учет',
    'анализ': 'аналитика',
    'магазин': 'e-commerce',
    'торговл': 'e-commerce',
    'доставк': 'логистика',
    'логистик': 'логистика',
    'микросервис': 'микросервис',
    'desktop': 'desktop',
    'десктоп': 'desktop',
    'корпоратив': 'корпоративная',
};

/**
 * Извлекает ключевые слова из названия проекта и возвращает массив тегов.
 * @param {string} name Название проекта.
 * @returns {string[]} Массив уникальных тегов.
 */
export function categorizePlanByName(name) {
    if (!name) return [];
    const words = name.toLowerCase().split(/[\s,.-]+/);
    const tags = new Set();
    words.forEach(word => {
        for (const root in KEYWORD_ROOTS_TO_TAGS) {
            if (word.startsWith(root)) {
                tags.add(KEYWORD_ROOTS_TO_TAGS[root]);
            }
        }
    });
    return Array.from(tags);
}