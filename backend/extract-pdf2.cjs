const { PdfReader } = require('pdfreader');
const fs = require('fs');

const filePath = 'C:\\Users\\wilqu\\Downloads\\Documento de Wilquer Figueiredo.pdf';

new PdfReader().parseFileItems(filePath, function(err, item) {
  if (err) {
    console.error('Error:', err);
    return;
  }
  if (!item) {
    console.log('Done');
    return;
  }
  if (item.text) {
    console.log(item.text);
  }
});