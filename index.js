const express = require('express');
const app = express();

let PORT = process.env.PORT || 3000;

app.get('/test', (req, res) => {
  res.send('It works');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});