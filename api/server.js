const express  = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const { MongoClient } = require('mongodb');

dotenv.config();

MongoClient.connect(process.env.DATABASE_URL, (err, client) => {
  if (err) throw err;
  app.locals.db = client.db('mdc_jukebox');
});

const port = process.env.PORT || 3000;

const app = express();

app.set('port', port);
app.use(cookieParser())
  .use(cors())
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: false }))
  .use(express.static(path.resolve(__dirname, '../public')))
  .use('/', routes);

app.listen(app.get('port'), () => {
  console.log('Express server listening on port ' + app.get('port'));
});
