'use strict';

var request = require('request');
var fs = require('fs');
var glob = require('glob');

function createIndex() {
  return new Promise((resolve, reject) => {
    request({
      method: 'DELETE',
      url: 'http://localhost:9200/enron',
      encoding: null
    }, function(err, response, body) {
      request({
        method: 'PUT',
        url: 'http://localhost:9200/enron',
        encoding: null,
        body: JSON.stringify({
          "settings": {
            "analysis": {
              "analyzer": {
                "email": {
                  "tokenizer": "uax_url_email"
                }
              }
            }
          },
          "mappings": {
            "mail": {
              "properties": {
                "from": {
                  "type": "string",
                  "analyzer": "email"
                },
                "to": {
                  "type": "string",
                  "analyzer": "email"
                }
              }
            }
          }
        })
      }, function(err, req, body) {
        if (err) {
          console.error('Error occured: ', err);
          return reject(err);
        }
        resolve();
      });
    });
  });
}

function importFile(files, index) {
  console.log(files, index)
  if (index >= files.length) {
    return;
  }

  console.log('[debug] Performing bulk request for file ' + files[index]);

  request({
    method: 'POST',
    url: 'http://localhost:9200/enron/mail/_bulk?pretty',
    encoding: null,
    body: fs.readFileSync(files[index], 'utf8')
  }, function(error, request, body){
    if (error) {
      console.error('[error] Error when performing bulk request for file ' + files[index] + ':', error);
    }
    console.log('[debug] Bulk request for letter ' + files[index] + ' performed');
    setTimeout(importFile(files, index + 1));
  });
}

createIndex()
  .then(() => {
    glob(process.cwd() + '/export/*.json', {}, function(err, files) {
      console.log(files)
      importFile(files, 0);
    });
  }).catch(err => console.log(err)) ;
