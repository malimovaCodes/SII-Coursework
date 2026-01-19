import { generateAndSavePdf } from './src/utils/pdf/pdfGenerator.js';
import { calculateDevelopmentEstimation, calculateTotalBudget } from './src/utils/calculator/costCalculator.js';
import { updateTechOptions } from './src/utils/calculator/techCompatibility.js';
import { categorizePlanByName } from './src/utils/categorization.js';

document.addEventListener('DOMContentLoaded', () => {

    let FEATURES = {}; 
    let ROLES = []; 
    let TECHNOLOGIES = {}; 
    const HOURLY_RATE = 2000; //ставка разработчика
    const HOURS_PER_DAY = 6; //среднее время работы в день

    let currentPlan = {
        general: {},
        functional: [],
        tech: {},
        team: [],
        financial: {},
        estimation: {}
    };
    let userPlans = []; 

    const screens = document.querySelectorAll('.screen');
    const wizardSteps = document.querySelectorAll('.wizard-step');
    const featuresListContainer = document.getElementById('features-list');

    function calculateEstimation() {
        const selectedFeatures = document.querySelectorAll('#features-list input[type="checkbox"]:checked');
        const featureKeys = [];
        selectedFeatures.forEach(checkbox => {
            featureKeys.push(checkbox.name);
        });

        const { totalHours, totalCost, totalDays } = calculateDevelopmentEstimation(
            featureKeys,
            currentPlan.team,
            FEATURES,
            HOURS_PER_DAY,
            HOURLY_RATE
        );

        document.getElementById('total-hours').textContent = totalHours;
        document.getElementById('total-cost').textContent = totalCost.toLocaleString('ru-RU');
        document.getElementById('total-days').textContent = totalDays;
        currentPlan.functional = featureKeys;
        currentPlan.estimation = { totalHours, totalCost, totalDays, features: featureKeys };
    }

    function renderFeatures() {
        featuresListContainer.innerHTML = '';
        for (const key in FEATURES) {
            const feature = FEATURES[key];
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = key;

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(feature.label));

            checkbox.addEventListener('change', calculateEstimation);
            featuresListContainer.appendChild(label);
        }
    }

    function saveStepData(stepNumber) {
        switch (stepNumber) {
            case 1:
                currentPlan.general.name = document.getElementById('project-name').value;
                currentPlan.general.type = document.getElementById('project-type').value;
                currentPlan.general.description = document.getElementById('project-description').value;
                currentPlan.general.tags = categorizePlanByName(currentPlan.general.name);
                break;
            case 3:
                currentPlan.tech.frontend = document.getElementById('tech-frontend').value;
                currentPlan.tech.backend = document.getElementById('tech-backend').value;
                currentPlan.tech.db = document.getElementById('tech-db').value;
                currentPlan.tech.infra = document.getElementById('tech-infra').value;
                break;
            case 4:
                const team = [];
                document.querySelectorAll('#team-recommendation-list .team-member').forEach(el => {
                    const role = el.querySelector('label').textContent;
                    const count = parseInt(el.querySelector('input').value);
                    if (count > 0) {
                        team.push({ role, count });
                    }
                });
                currentPlan.team = team;
                calculateEstimation(); 
                break;
            case 5:
                currentPlan.financial.marketingCost = parseInt(document.getElementById('financial-marketing').value) || 0;
                currentPlan.financial.supportCost = parseInt(document.getElementById('financial-support').value) || 0;
                currentPlan.financial.expectedIncome = parseInt(document.getElementById('financial-income').value) || 0;

                const devCost = currentPlan.estimation.totalCost || 0;
                const total = devCost + currentPlan.financial.marketingCost + currentPlan.financial.supportCost;
                currentPlan.financial.totalBudget = total;
                break;
        }
    }

    function recommendTeam() {
        const container = document.getElementById('team-recommendation-list');
        container.innerHTML = '';

        ROLES.forEach(role => {
            let count = 0; 
            let isDisabled = false; 

            switch (role.key) {
                case 'designer':
                case 'frontend_dev':
                    if (!currentPlan.tech.frontend || currentPlan.tech.frontend === 'no-frontend') {
                        isDisabled = true;
                        count = 0;
                    } else {
                        count = 1;
                    }
                    break;
                case 'backend_dev':
                    if (currentPlan.tech.backend) {
                        count = 1;
                    } else {
                        isDisabled = true; 
                        count = 0;
                    }
                    break;
                case 'analyst':
                    if (currentPlan.functional.includes('analytics')) count = 1;
                    break;
                case 'devops':
                    if (currentPlan.tech.infra === 'docker' || currentPlan.tech.infra === 'cloud' || currentPlan.tech.infra === 'kubernetes') {
                        count = 1;
                    } else {
                        isDisabled = true;
                        count = 0;
                    }
                    break;
            }

            const div = document.createElement('div');
            div.className = 'team-member flex items-center justify-between p-2 rounded-lg bg-background/20';
            div.innerHTML = `
                <label class="font-medium ${isDisabled ? 'text-gray-400' : ''}">${role.label}</label>
                <input type="number" value="${count}" min="0" class="w-20 text-center bg-dark-gray border border-light-purple rounded-md p-1" ${isDisabled ? 'disabled' : ''}>
            `;
            container.appendChild(div);

            div.querySelector('input').addEventListener('change', () => {
                saveStepData(4); 
            });
        });
    }

    function prepareFinancials() {
        const devCost = currentPlan.estimation.totalCost || 0;
        document.getElementById('financial-dev-cost').textContent = `${devCost.toLocaleString('ru-RU')} ₽`;
        updateFinalBudgetUI();
    }

    function updateFinalBudgetUI() {
        const devCost = currentPlan.estimation.totalCost || 0;
        const marketingCost = parseInt(document.getElementById('financial-marketing').value) || 0;
        const supportCost = parseInt(document.getElementById('financial-support').value) || 0;
        const total = calculateTotalBudget(devCost, marketingCost, supportCost);
        document.getElementById('final-budget').textContent = total.toLocaleString('ru-RU');
    }

    function generateFinalSummary() {
        const summaryContainer = document.getElementById('final-plan-summary');
        const { general, functional, tech, team, financial, estimation } = currentPlan;

        const getTechLabel = (category, key) => {
            if (!TECHNOLOGIES[category] || !key) return key || 'не указано';
            const techItem = TECHNOLOGIES[category].find(t => t.key === key);
            return techItem ? techItem.label : key;
        };

        summaryContainer.innerHTML = `
            <div class="summary-section">
                <h4>1. Общие сведения</h4>
                <p><strong>Название проекта:</strong> ${general.name || 'не указано'}</p>
                <p><strong>Тип проекта:</strong> ${general.type || 'не указан'}</p>
                <p><strong>Описание:</strong> ${general.description || 'нет описания'}</p>
            </div>
            <div class="summary-section">
                <h4>2. Функциональные требования</h4>
                <ul>${(functional || []).map(key => `<li>${FEATURES[key]?.label || key}</li>`).join('') || '<li>Не выбраны</li>'}</ul>
            </div>
            <div class="summary-section">
                <h4>3. Технологический стек</h4>
                <p><strong>Фронтенд:</strong> ${getTechLabel('frontend', tech.frontend)}</p>
                <p><strong>Бэкенд:</strong> ${getTechLabel('backend', tech.backend)}</p>
                <p><strong>База данных:</strong> ${getTechLabel('db', tech.db)}</p>
                <p><strong>Инфраструктура:</strong> ${getTechLabel('infra', tech.infra)}</p>
            </div>
            <div class="summary-section">
                <h4>4. Команда</h4>
                <ul>${(team || []).map(member => `<li>${member.role}: ${member.count} чел.</li>`).join('') || '<li>Не определена</li>'}</ul>
            </div>
            <div class="summary-section">
                <h4>5. Финансовый план и оценка</h4>
                <p><strong>Стоимость разработки:</strong> ${(estimation.totalCost || 0).toLocaleString('ru-RU')} ₽</p>
                <p><strong>Затраты на маркетинг:</strong> ${(financial.marketingCost || 0).toLocaleString('ru-RU')} ₽</p>
                <p><strong>Затраты на поддержку:</strong> ${(financial.supportCost || 0).toLocaleString('ru-RU')} ₽/мес.</p>
                <p><strong>Итоговый бюджет:</strong> ${(financial.totalBudget || estimation.totalCost || 0).toLocaleString('ru-RU')} ₽</p>
                <p><strong>Общие трудозатраты:</strong> ${estimation.totalHours || 0} часов</p>
                <p><strong>Примерный срок:</strong> ${estimation.totalDays || 0} дней</p>
            </div>
        `;
    }

    function populateWizard(planData) {
        // шаг 1: Общие сведения
        document.getElementById('project-name').value = planData.general.name || '';
        document.getElementById('project-type').value = planData.general.type || 'mobile';
        document.getElementById('project-description').value = planData.general.description || '';

        // шаг 2: Функционал (чекбоксы)
        document.querySelectorAll('#features-list input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = (planData.functional || []).includes(checkbox.name);
        });
        calculateEstimation(); 

        // шаг 3: Технологии
        document.getElementById('tech-frontend').value = planData.tech.frontend || 'react';
        document.getElementById('tech-backend').value = planData.tech.backend || 'nodejs';
        document.getElementById('tech-db').value = planData.tech.db || 'postgresql';
        document.getElementById('tech-infra').value = planData.tech.infra || 'docker';

        // шаг 5: Финансы
        document.getElementById('financial-marketing').value = planData.financial.marketingCost || 0;
        document.getElementById('financial-support').value = planData.financial.supportCost || 0;
        document.getElementById('financial-income').value = planData.financial.expectedIncome || 0;
    }

    function startEditingPlan(plan) {
        if (!plan || !plan.plan_data) return;

        currentPlan = JSON.parse(JSON.stringify(plan.plan_data));
        currentPlan.id = plan.id; 

        document.getElementById('wizard-screen').querySelector('form')?.reset(); // Если есть форма
        populateWizard(currentPlan);

        showScreen('wizard-screen');
        showWizardStep(1);
    }


    function showScreen(screenId) {
        screens.forEach(screen => {
            screen.classList.toggle('active', screen.id === screenId);
        });
    }

    function showWizardStep(stepNumber) {
        const currentStep = document.querySelector('.wizard-step.active');
        if (currentStep) {
            saveStepData(parseInt(currentStep.id.split('-')[1]));
        }

        wizardSteps.forEach(step => {
            step.classList.toggle('active', step.id === `step-${stepNumber}`);
        });

        const stepNum = parseInt(stepNumber);

        const prevBtn = document.querySelector('.wizard-navigation .prev-btn');
        const nextBtn = document.querySelector('.wizard-navigation .next-btn');
        
        prevBtn.style.visibility = stepNum === 1 ? 'hidden' : 'visible';
        nextBtn.textContent = stepNum === 6 ? 'Finish' : 'Next Step';

        prevBtn.dataset.prev = stepNum - 1;
        nextBtn.dataset.next = stepNum + 1;

        if (stepNum === 4) recommendTeam();
        if (stepNum === 5) prepareFinancials();
        if (stepNum === 3) updateTechOptions(currentPlan.general.type); // Обновляем опции при переходе на шаг 3
        if (stepNum === 6) generateFinalSummary();

        document.querySelectorAll('.progress-step').forEach(pStep => {
            const isActive = parseInt(pStep.dataset.step) <= stepNum;
            pStep.classList.toggle('active', isActive);
        });
    }

    document.body.addEventListener('click', (e) => {
        if (e.target.matches('.next-btn')) {
            const nextStep = e.target.dataset.next;
            showWizardStep(nextStep);
        }
        if (e.target.matches('.prev-btn')) {
            const prevStep = e.target.dataset.prev;
            showWizardStep(prevStep);
        }
    });

    document.querySelector('.wizard-progress').addEventListener('click', (e) => {
        const stepElement = e.target.closest('.progress-step');
        if (stepElement && stepElement.dataset.step) {
            showWizardStep(stepElement.dataset.step);
        }
    });

    document.getElementById('logo-link').addEventListener('click', (e) => {
        e.preventDefault();
        if (localStorage.getItem('token')) {
            showScreen('main-screen');
        } else {
            showScreen('auth-screen');
        }
    });

    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('register-screen');
    });
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('auth-screen');
    });

    document.getElementById('project-type').addEventListener('change', (e) => {
        currentPlan.general.type = e.target.value;
        updateTechOptions(currentPlan.general.type);
    });

    async function loadUserPlans() {
        const planListContainer = document.getElementById('plan-list');
        planListContainer.innerHTML = '<p>Загрузка планов...</p>'; // Показываем индикатор загрузки

        const token = localStorage.getItem('token');
        if (!token) {
            planListContainer.innerHTML = '<p>Для просмотра планов необходимо авторизоваться.</p>';
            return;
        }

        try {
            const response = await fetch('/api/plans', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Не удалось загрузить планы.');

            userPlans = await response.json(); 
            planListContainer.innerHTML = ''; 

            if (userPlans.length === 0) {
                planListContainer.innerHTML = '<p>У вас пока нет сохраненных бизнес-планов.</p>';
                return;
            }
            userPlans.forEach(plan => {
                const card = document.createElement('div');
                card.className = 'plan-card';

                const { totalCost, totalDays } = plan.plan_data.estimation || { totalCost: 0, totalDays: 0 };
                const tags = plan.plan_data.general?.tags || [];

                let tagsHTML = '';
                if (tags.length > 0) {
                    tagsHTML = `
                        <div class="plan-tags">
                            ${tags.map(tag => `<span class="plan-tag">${tag}</span>`).join('')}
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="plan-card-header">
                        <h3>${plan.project_name}</h3>
                        ${tagsHTML}
                    </div>
                    <p>Бюджет: ${totalCost.toLocaleString('ru-RU')} ₽, Срок: ${totalDays} дней</p>
                    <div class="plan-card-actions">
                        <button class="export-btn" data-plan-id="${plan.id}">Экспорт в PDF</button>
                        <button class="edit-btn" data-plan-id="${plan.id}">Редактировать</button>
                        <button class="delete-btn" data-plan-id="${plan.id}">Удалить</button>
                    </div>
                `;
                planListContainer.appendChild(card);
            });
        } catch (error) {
            planListContainer.innerHTML = `<p class="error">${error.message}</p>`;
        }
    }

    document.getElementById('plan-list').addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const planId = e.target.dataset.planId;
            const planToEdit = userPlans.find(p => p.id === planId);
            startEditingPlan(planToEdit);
        }

        if (e.target.classList.contains('export-btn')) {
            const planId = e.target.dataset.planId;
            const planToExport = userPlans.find(p => p.id === planId);
            if (planToExport) generateAndSavePdf(planToExport.plan_data, FEATURES, TECHNOLOGIES);
        }

        if (e.target.classList.contains('delete-btn')) {
            const planId = e.target.dataset.planId;
            const planToDelete = userPlans.find(p => p.id === planId);

            if (!planToDelete) return;

            Swal.fire({
                title: 'Вы уверены?',
                text: `Вы действительно хотите удалить бизнес-план "${planToDelete.project_name}"? Отменить это действие будет невозможно.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Да, удалить!',
                cancelButtonText: 'Отмена'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const token = localStorage.getItem('token');
                    try {
                        const response = await fetch(`/api/plans/${planId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        const data = await response.json();
                        if (!response.ok) {
                            throw new Error(data.message || 'Не удалось удалить план.');
                        }

                        Swal.fire('Удалено!', data.message, 'success');
                        loadUserPlans(); // Обновляем список планов
                    } catch (error) {
                        Swal.fire('Ошибка!', error.message, 'error');
                    }
                }
            });
        }
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.querySelector('input[type="text"]').value;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка регистрации');
            }

            Swal.fire({
                icon: 'success',
                title: 'Успешно!',
                text: 'Регистрация прошла успешно! Теперь вы можете войти.',
            });
            showScreen('auth-screen'); 

        } catch (error) {
            Swal.fire('Ошибка!', error.message, 'error');
        }
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка входа');
            }

            localStorage.setItem('token', data.token);
            document.getElementById('logout-btn').style.display = 'block';
            showScreen('main-screen');
            loadUserPlans(); 

        } catch (error) {
            Swal.fire('Ошибка!', error.message, 'error');
        }
    });

    document.getElementById('create-plan-btn').addEventListener('click', () => {
        currentPlan = { 
            id: null, 
            general: {},
            functional: [],
            tech: {},
            team: [],
            financial: {},
            estimation: {}
        };
        document.getElementById('wizard-screen').querySelectorAll('input, select, textarea').forEach(el => el.value = el.defaultValue);
        showScreen('wizard-screen');
        showWizardStep(1);
    });

    document.getElementById('save-plan-btn').addEventListener('click', async () => {
        saveStepData(6); 

        const token = localStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Ошибка аутентификации',
                text: 'Пожалуйста, войдите заново.',
            });
            showScreen('auth-screen');
            return;
        }

        try {
            const isEditing = !!currentPlan.id;
            const url = isEditing ? `/api/plans/${currentPlan.id}` : '/api/plans';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(currentPlan),
            });
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Не удалось ${isEditing ? 'обновить' : 'сохранить'} план.`);
            }
            Swal.fire({
                icon: 'success',
                title: 'Готово!',
                text: `Бизнес-план успешно ${isEditing ? 'обновлен' : 'сохранен'}!`,
            });
            showScreen('main-screen'); 
            loadUserPlans(); 
        } catch (error) {
            Swal.fire('Ошибка!', error.message, 'error');
        }
    });
    
    document.getElementById('export-pdf-btn').addEventListener('click', () => {
        saveStepData(6); 
        generateAndSavePdf(currentPlan, FEATURES, TECHNOLOGIES);
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token'); 
        document.getElementById('logout-btn').style.display = 'none';
        showScreen('auth-screen'); 
    });


    async function init() {
        try {
            const response = await fetch('/api/features');
            if (!response.ok) throw new Error('Не удалось загрузить список функций');
            FEATURES = await response.json();
            renderFeatures(); 

            const techResponse = await fetch('/api/technologies');
            if (!techResponse.ok) throw new Error('Не удалось загрузить список технологий');
            TECHNOLOGIES = await techResponse.json();
            renderTechnologies(TECHNOLOGIES);

            const rolesResponse = await fetch('/api/roles');
            if (!rolesResponse.ok) throw new Error('Не удалось загрузить список ролей');
            ROLES = await rolesResponse.json();
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Ошибка загрузки данных',
                text: `Не удалось загрузить необходимые для работы данные: ${error.message}`,
            });
            featuresListContainer.innerHTML = `<p class="error">${error.message}</p>`;
        }

        if (localStorage.getItem('token')) {
            document.getElementById('logout-btn').style.display = 'block';
            showScreen('main-screen');
            loadUserPlans(); 
        } else {
            showScreen('auth-screen'); 
        }
    }

    function renderTechnologies(techData) {
        const techMap = {
            frontend: document.getElementById('tech-frontend'),
            backend: document.getElementById('tech-backend'),
            db: document.getElementById('tech-db'),
            infra: document.getElementById('tech-infra'),
        };

        for (const category in techMap) {
            const selectElement = techMap[category];
            selectElement.innerHTML = '';
            (techData[category] || []).forEach(tech => {
                selectElement.innerHTML += `<option value="${tech.key}">${tech.label}</option>`;
            });
        }
    }
    document.getElementById('financial-marketing').addEventListener('input', updateFinalBudgetUI);
    document.getElementById('financial-support').addEventListener('input', updateFinalBudgetUI);

    init();
});
