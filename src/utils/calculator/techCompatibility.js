const COMPATIBILITY_MATRIX = {
    'mobile': {
        frontend: ['react-native', 'flutter', 'swift', 'kotlin', 'vanilla'],
        backend: ['nodejs', 'python', 'java', 'firebase', 'supabase'],
        db: ['sqlite', 'mongodb', 'firebase', 'realm'],
        infra: [] 
    },
    'web': {
        frontend: ['react', 'vue', 'vanilla'],
        backend: ['nodejs', 'python', 'php', 'java'],
        db: ['postgresql', 'mysql', 'mongodb'],
        infra: ['docker', 'vps', 'cloud', 'kubernetes']
    },
    'desktop': {
        frontend: ['electron', 'wpf', 'qt', 'javafx', 'vanilla'],
        backend: ['nodejs', 'python', 'java', 'csharp'],
        db: ['sqlite', 'postgresql', 'mysql'],
        infra: []
    },
    'microservice': {
        frontend: ['no-frontend'], 
        backend: ['nodejs', 'python', 'java', 'go'],
        db: ['postgresql', 'mongodb', 'redis'],
        infra: ['docker', 'cloud', 'kubernetes']
    },
    'corp': { 
        frontend: ['react', 'vue', 'angular'],
        backend: ['java', 'csharp', 'nodejs', 'spring'],
        db: ['postgresql', 'mysql', 'mssql', 'oracle'],
        infra: ['docker', 'vps', 'cloud', 'kubernetes']
    }
};

export function updateTechOptions(projectType) {
    const compatibleTechs = COMPATIBILITY_MATRIX[projectType || 'web']; 

    if (!compatibleTechs) return;

    const techSelects = {
        frontend: document.getElementById('tech-frontend'),
        backend: document.getElementById('tech-backend'),
        db: document.getElementById('tech-db'),
        infra: document.getElementById('tech-infra')
    };

    for (const category in techSelects) {
        const select = techSelects[category];
        const allowedKeys = compatibleTechs[category] || [];

        Array.from(select.options).forEach(option => {
            const isDisabled = allowedKeys.length === 0 || !allowedKeys.includes(option.value);
            option.disabled = isDisabled;
            if (isDisabled && option.selected) {
                select.value = '';
            }
        });
    }
}