'use strict';

var fs = require('fs');
var path = require('path');
var camelCase = require('camel-case');
var glob = require('glob');
var moment = require('moment');
var dir = process.argv.splice(2)[0];
//dir = process.mainModule.paths[0];

var flags = [
  'Message-ID',
  'Date',
  'From',
  'Subject',
  'Cc',
  'Mime-Version',
  'Content-Type',
  'Content-Transfer-Encoding',
  'Bcc',
  'X-From',
  'X-To',
  'X-cc',
  'X-bcc',
  'X-Folder',
  'X-Origin',
  'X-FileName'
];

var counter = 0;
var data = [];

function parseFile(filename) {

  if (!fs.lstatSync(filename).isFile()) {
    return;
  }

  var content = fs.readFileSync(filename, 'utf-8');
  var parsedMail = {};

  // Match raw content
  var matchedContent = content.match(new RegExp('[\r\n]{3}((.|\r|\n)+)'));
  if (matchedContent) {
    content = content.substring(0, matchedContent.index);
    parsedMail.rawContent = matchedContent[1];
  }

  parsedMail.content = parsedMail.rawContent;

  // Match content without forwarded, replies etc..
  if (parsedMail.rawContent && parsedMail.rawContent.length) {
    let matchedCleanContent = parsedMail.rawContent.match(new RegExp('^((([^\-]|\-[^\-]))+)-{6,}(.|\r|\n)*'));
    if (matchedCleanContent) {
      parsedMail.content = matchedCleanContent[1];
    }
  }

  // Match other data
  flags.forEach(flag => {
    var matchedFlag = content.match(new RegExp(flag + ': (.+)'));
    if (matchedFlag) {
      parsedMail[camelCase(flag)] = matchedFlag[1];
    }
  });

  // Match To field
  var matchedToField = content.match(new RegExp('To: ((.|\r|\n)+)Subject:'));
  if (matchedToField) {
    parsedMail.to = matchedToField[1].replace(/\s/g, '');
  }

  // Format date to ISO
  parsedMail.date = moment(parsedMail.date).format();

  return parsedMail;
}

function saveFile(letter) {
  var exportString = '';
  counter++;

  // Data to elastic json format
  data.forEach((item, index) => {
    exportString += '{"index":{"_id":"' + letter + '_' + counter + '_' + index + '"}}\n';
    exportString += JSON.stringify(item) + '\n';
  });
  data = [];

  fs.writeFile(process.cwd() + '\\export\\' + letter + '_' + counter + '.json', exportString, (err) => {

    if (err) console.log(err)

  });
}

'abcdefghijklmnopqrstuvwxyz'.split('').forEach(letter => {
  console.log('[debug] dir:', dir);
  var pattern = path.join(dir, letter + '*/*/*');
  console.log('[debug] Pattern:', pattern);

  glob(pattern, {}, function(err, files) {
    if (err) {
      return console.error('Error occured: ', err);
    }
    

    files.forEach(file => {
      data.push(parseFile(file));
      if (data.length > 3000) {
        saveFile(letter);
      }
    });

    if (data.length) {
      saveFile(letter);
    }

    console.log('[debug] Data written for pattern: ', letter);
  });
});
