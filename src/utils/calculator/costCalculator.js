/**
 * @param {string[]} selectedFeatureKeys 
 * @param {object[]} team
 * @param {object} featuresData 
 * @param {number} hoursPerDay 
 * @param {number} hourlyRate
 * @returns {{totalHours: number, totalCost: number, totalDays: number}}
 */
export function calculateDevelopmentEstimation(selectedFeatureKeys, team, featuresData, hoursPerDay, hourlyRate) {
    let totalDevHours = 0;
    let totalDesignHours = 0;

    selectedFeatureKeys.forEach(key => {
        totalDevHours += featuresData[key]?.devHours || 0;
        totalDesignHours += featuresData[key]?.designHours || 0;
    });

    const totalHours = totalDevHours + totalDesignHours;

    const devCount = (team || []).filter(m => m.role.includes('разработчик')).reduce((sum, m) => sum + m.count, 0) || 1;
    const designerCount = (team || []).filter(m => m.role.includes('дизайнер')).reduce((sum, m) => sum + m.count, 0) || 1;

    const devDays = Math.ceil(totalDevHours / (devCount * hoursPerDay));
    const designDays = Math.ceil(totalDesignHours / (designerCount * hoursPerDay));
    const totalDays = Math.max(devDays, designDays);

    const totalCost = (devDays * devCount * hoursPerDay * hourlyRate) + (designDays * designerCount * hoursPerDay * hourlyRate);

    return { totalHours, totalCost, totalDays };
}

/**
 * @param {number} devCost 
 * @param {number} marketingCost 
 * @param {number} supportCost
 * @returns {number} 
 */
export function calculateTotalBudget(devCost = 0, marketingCost = 0, supportCost = 0) {
    return devCost + marketingCost + supportCost;
}
