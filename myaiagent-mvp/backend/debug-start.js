import fs from 'fs';
console.log('Attempting to import src/server.js...');
import('./src/server.js')
    .then(() => console.log('Import success!'))
    .catch(err => {
        const errorLog = `
CAUGHT IMPORT ERROR:
Message: ${err.message}
Code: ${err.code}
Stack: ${err.stack}
    `;
        fs.writeFileSync('import-error.txt', errorLog);
        console.log('Error written to import-error.txt');
    });
