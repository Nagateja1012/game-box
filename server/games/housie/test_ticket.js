const crypto = require('crypto');

function generateTicket() {
    const ticket = Array(3).fill(null).map(() => Array(9).fill(null));
    const colRanges = [
        { min: 1, max: 9 },
        { min: 10, max: 19 },
        { min: 20, max: 29 },
        { min: 30, max: 39 },
        { min: 40, max: 49 },
        { min: 50, max: 59 },
        { min: 60, max: 69 },
        { min: 70, max: 79 },
        { min: 80, max: 90 }
    ];

    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
        attempts++;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) ticket[r][c] = null;
        for (let r = 0; r < 3; r++) {
            let count = 0;
            while (count < 5) {
                let c = crypto.randomInt(0, 9);
                if (ticket[r][c] === null) {
                    ticket[r][c] = true;
                    count++;
                }
            }
        }
        let columnsOk = true;
        for (let c = 0; c < 9; c++) {
            if (ticket[0][c] === null && ticket[1][c] === null && ticket[2][c] === null) {
                columnsOk = false;
                break;
            }
        }
        if (columnsOk) valid = true;
    }

    for (let c = 0; c < 9; c++) {
        const range = colRanges[c];
        const countInCol = (ticket[0][c] ? 1 : 0) + (ticket[1][c] ? 1 : 0) + (ticket[2][c] ? 1 : 0);
        if (countInCol > 0) {
            const available = [];
            for (let n = range.min; n <= range.max; n++) available.push(n);
            for (let i = available.length - 1; i > 0; i--) {
                const j = crypto.randomInt(0, i + 1);
                [available[i], available[j]] = [available[j], available[i]];
            }
            const nums = available.slice(0, countInCol).sort((a, b) => a - b);
            let numIdx = 0;
            for (let r = 0; r < 3; r++) {
                if (ticket[r][c]) {
                    ticket[r][c] = nums[numIdx++];
                }
            }
        }
    }
    return ticket;
}

const ticket = generateTicket();
console.table(ticket);

// Validation
console.log("Validation:");
let allOk = true;
for (let r = 0; r < 3; r++) {
    const rowCount = ticket[r].filter(n => n !== null).length;
    console.log(`Row ${r} count: ${rowCount} (Expected: 5)`);
    if (rowCount !== 5) allOk = false;
}

for (let c = 0; c < 9; c++) {
    const col = [ticket[0][c], ticket[1][c], ticket[2][c]].filter(n => n !== null);
    if (col.length === 0) {
        console.log(`Column ${c} is EMPTY! (Error)`);
        allOk = false;
    } else {
        const min = c === 0 ? 1 : c * 10;
        const max = c === 8 ? 90 : (c * 10) + 9;
        const outOfRange = col.filter(n => n < min || n > max);
        if (outOfRange.length > 0) {
            console.log(`Column ${c} has OUT OF RANGE numbers: ${outOfRange} (Range: ${min}-${max})`);
            allOk = false;
        }
    }
}

console.log("Overall validation:", allOk ? "PASSED" : "FAILED");
