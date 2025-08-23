function getDataGradient(X: number[], Y: number[]): { w: number; b: number } {
    const n = X.length;
    const meanX = X.reduce((sum, x) => sum + x, 0) / n;
    const meanY = Y.reduce((sum, y) => sum + y, 0) / n;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
        const dx = X[i] - meanX;
        numerator += dx * (Y[i] - meanY);
        denominator += dx * dx;
    }

    const w = numerator / denominator;
    const b = meanY - w * meanX;

    return { w, b };
}

export default getDataGradient;
