import { PTSansBase64 } from '../../assets/fonts/base64.js';

/**
 * @param {object} planData 
 * @param {object} FEATURES 
 * @param {object} TECHNOLOGIES 
 */
export function generateAndSavePdf(planData, FEATURES, TECHNOLOGIES) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    try {
        doc.addFileToVFS("PTSans.ttf", PTSansBase64);
        doc.addFont("PTSans.ttf", "PTSans", "normal");
        doc.setFont("PTSans");

        const { general, functional, tech, team, financial, estimation } = planData;
        const projectName = general.name || "Безымянный проект";
        let y = 20;

        doc.setFontSize(20);
        doc.text(`Бизнес-план: ${projectName}`, 10, y);
        y += 15;

        const addSection = (title, data) => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(16);
            doc.text(title, 10, y);
            y += 8;
            doc.setFontSize(12);
            data.forEach(item => {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(`- ${item}`, 15, y);
                y += 7;
            });
            y += 5;
        };

        const getTechLabel = (category, key) => {
            if (!TECHNOLOGIES[category] || !key) return key || 'не указано';
            const techItem = TECHNOLOGIES[category].find(t => t.key === key);
            return techItem ? techItem.label : key;
        };

        addSection("1. Общие сведения", [
            `Тип проекта: ${general.type || 'не указан'}`,
            `Описание: ${general.description || 'нет описания'}`
        ]);

        addSection("2. Функциональные требования", (functional || []).map(key => FEATURES[key]?.label || key));
        
        addSection("3. Технологический стек", [
            `Фронтенд: ${getTechLabel('frontend', tech.frontend)}`,
            `Бэкенд: ${getTechLabel('backend', tech.backend)}`,
            `База данных: ${getTechLabel('db', tech.db)}`,
            `Инфраструктура: ${getTechLabel('infra', tech.infra)}`
        ]);

        addSection("4. Рекомендуемая команда", (team || []).map(member => `${member.role}: ${member.count} чел.`));

        addSection("5. Финансовый план", [
            `Стоимость разработки: ${(estimation.totalCost || 0).toLocaleString('ru-RU')} ₽`,
            `Затраты на маркетинг: ${(financial.marketingCost || 0).toLocaleString('ru-RU')} ₽`,
            `Затраты на поддержку: ${(financial.supportCost || 0).toLocaleString('ru-RU')} ₽/мес.`,
            `Итоговый бюджет: ${(financial.totalBudget || estimation.totalCost || 0).toLocaleString('ru-RU')} ₽`
        ]);
        
        doc.save(`${projectName.replace(/[^a-zа-яё0-9\s]/gi, '_').replace(/\s+/g, '_')}_business_plan.pdf`);
    } catch (error) {
        console.error("Ошибка генерации PDF:", error);
        Swal.fire({
            icon: 'error',
            title: 'Ошибка генерации PDF',
            text: 'Не удалось создать PDF. Проверьте консоль браузера для получения подробной информации.',
        });
    }
}