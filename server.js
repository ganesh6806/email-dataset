var express = require('express');
var elasticsearch = require('elasticsearch');
var moment = require('moment');
const cors = require("cors");
var bodyParser = require('body-parser');
var app = express();

var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace',
  Origin: '*'
});

app.set('view engine', 'jade');

app.use(bodyParser.json({ limit: '50mb' }));

app.get('/', function(req, res) {
  res.render('index', {});
});

app.post('/search', cors({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With",
  "Access-Control-Allow-Methods": "GET, PUT, POST"
}), function(req, res) {

  console.log(req.body);

  var body = {
    query: {
      bool: {
        must: []
      }
    },
    highlight: {
      fields: {}
    }
  }

  if (req.body.text) {
    if (req.body.searchRaw) {
      body.query.bool.must.push({ match: { rawContent: req.body.text } });
      body.highlight.fields.rawContent = {
        highlight_query: {
          bool: {
            must: {
              match: {
                rawContent: {
                  query: req.body.text
                }
              }
            }
          }
        }
      };
    } else {
      body.query.bool.must.push({ match: { content: req.body.text } });
      body.highlight.fields.content = {
        highlight_query: {
          bool: {
            must: {
              match: {
                content: {
                  query: req.body.text
                }
              }
            }
          }
        }
      };
    }
  }

  if (req.body.name1) {
    body.query.bool.must.push({ prefix: { from: req.body.name1 } });
  }

  if (req.body.name2) {
    body.query.bool.must.push({ prefix: { to: req.body.name2 } });
  }

  if (req.body.dateFrom || req.body.dateTo) {
    body.filter = {
      range: {
        date: {
          gte: req.body.dateFrom ? req.body.dateFrom : null,
          lte: req.body.dateTo ? req.body.dateTo : null
        }
      }
    };
  }

  client.search({
    index: 'enron',
    type: 'mail',
    body: body
  }).then(function(resp) {
    res.json(resp.hits.hits.slice(0, 10));
  }, function(err) {
    res.status(400).send(err);
  });
});

app.use(express.static('public'));

var server = app.listen(process.env.PORT || 3000, function() {
  console.log('Email search app listening at http://localhost:' + server.address().port);
});
