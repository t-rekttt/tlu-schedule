module.exports = {
  devServer: {
    proxy: 'http://localhost:3000',
  },
  outputDir: __dirname + '/../backend/dist'
}