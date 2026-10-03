const { PDFParse } = require('pdf-parse');
const fs = require('fs');

const data = fs.readFileSync('C:\\Users\\wilqu\\Downloads\\Documento de Wilquer Figueiredo.pdf');

async function extract() {
  try {
    const result = await PDFParse(data);
    console.log(result.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

extract();