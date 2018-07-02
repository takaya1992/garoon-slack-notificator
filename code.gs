var GAROON_SUBDOMANIN_CELL = 'C2';
var GAROON_USER_ID_CELL    = 'C3';
var GAROON_PASSWORD_CELL   = 'C4';
var SLACK_WEBHOOK_URL_CELL = 'C5';
var SLACK_CHANNEL_CELL     = 'C6';
var INTERVAL_MINUTES_CELL  = 'C8';


function main () {
  var config = getConfig();

  var schedules = getGaroonSchedules(config);
  var notAllDayEvent = function (event) {
    return event.eventType !== 'ALL_DAY' && event.isAllDay !== true;
  };
  var withinTimeEvent = function (event) {
    var now = new Date();
    var date = new Date();
    date.setMinutes(date.getMinutes() + config.intervalMinutes);
    var startDate = dateParser(event.start.dateTime);
    return now <= startDate && startDate <= date;
  };
  var events = schedules.events.filter(notAllDayEvent).filter(withinTimeEvent);
  events.forEach(function (event) {
    var startDate = dateParser(event.start.dateTime);
    startDateString = Utilities.formatDate(startDate, 'JST', "HH:mm");
    message = startDateString + 'から「' + event.subject + '」' + 'が始まります';
    slackNotification(config.slack.webhookUrl, {text: message, channel: config.slack.channel});
  });
}

function getConfig () {
  var sheet = SpreadsheetApp.getActive().getSheetByName('設定');
  var config = {
    garoon: {
      subdomain: sheet.getRange(GAROON_SUBDOMANIN_CELL).getValue(),
      userId:    sheet.getRange(GAROON_USER_ID_CELL).getValue(),
      password:  sheet.getRange(GAROON_PASSWORD_CELL).getValue()
    },
    slack: {
      webhookUrl: sheet.getRange(SLACK_WEBHOOK_URL_CELL).getValue(),
      channel:    sheet.getRange(SLACK_CHANNEL_CELL).getValue()
    },
    intervalMinutes: sheet.getRange(INTERVAL_MINUTES_CELL).getValue()
  };
  return config;
}

function getGaroonSchedules (config) {
  var nowString = garoonDateFormatter(new Date());
  var paramsArray = [
    'rangeStart=' + encodeURIComponent(nowString),
    'orderBy=' + encodeURIComponent('start asc')
  ];
  var paramsString = paramsArray.join('&');
  var token = generateGaroonToken(config.garoon.userId, config.garoon.password);
  var response = garoonAPI(config.garoon.subdomain, 'get', token, '/schedule/events?' + paramsString);
  return JSON.parse(response);
}

function garoonDateFormatter (date) {
  return Utilities.formatDate(date, 'JST', "yyyy-MM-dd'T'HH:mm:ssXXX");;
}

function dateParser (dateString) {
  return new Date(Date.parse(dateString));
}

function garoonAPI (subdomain, method, token, api) {
  var url = 'https://' + subdomain + '.cybozu.com/g/api/v1' + api;
  var requestOptions = {
    method: method,
    headers: {
      'X-Cybozu-Authorization': token
    }
  };
  return UrlFetchApp.fetch(url, requestOptions);
}

function generateGaroonToken (userId, password) {
  return Utilities.base64Encode(userId + ':' + password);
}

function slackNotification (webhookUrl, messageOption) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(messageOption),
  };
  UrlFetchApp.fetch(webhookUrl, options);
}

function setUp () {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.getRange('B2').activate();
  spreadsheet.getCurrentCell().setValue('ガルーン サブドメイン');
  spreadsheet.getRange('B3').activate();
  spreadsheet.getCurrentCell().setValue('ガルーン ユーザID');
  spreadsheet.getRange('B4').activate();
  spreadsheet.getCurrentCell().setValue('ガルーン パスワード');
  spreadsheet.getRange('B5').activate();
  spreadsheet.getCurrentCell().setValue('Slack Webhook URL');
  spreadsheet.getRange('B6').activate();
  spreadsheet.getCurrentCell().setValue('Slack Channel');
  spreadsheet.getRange('B8').activate();
  spreadsheet.getCurrentCell().setValue('取得間隔（分）');
  spreadsheet.getRange('C8').setDataValidation(SpreadsheetApp.newDataValidation()
  .setAllowInvalid(false)
  .requireValueInList(['1', '5', '10', '15', '30'], true)
  .build());
  spreadsheet.getCurrentCell().setValue('5');
  spreadsheet.getRange('C3').activate();
  spreadsheet.getActiveSheet().setColumnWidth(3, 507);
  spreadsheet.getActiveSheet().setColumnWidth(2, 144);
  spreadsheet.getRange('B2:C6').activate();
  spreadsheet.getActiveRangeList().setBorder(true, true, true, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM)
  .setBorder(null, null, null, null, true, true, '#000000', SpreadsheetApp.BorderStyle.DOTTED);
  spreadsheet.getRange('B5:C5').activate();
  spreadsheet.getActiveRangeList().setBorder(true, null, null, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  spreadsheet.getRange('B2:B6').activate();
  spreadsheet.getActiveRangeList().setBorder(null, null, null, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  spreadsheet.getRange('B8:C8').activate();
  spreadsheet.getActiveRangeList().setBorder(true, true, true, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  spreadsheet.getRange('B8').activate();
  spreadsheet.getActiveRangeList().setBorder(null, null, null, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  spreadsheet.getRange('C4').activate();
  spreadsheet.getActiveRangeList().setFontColor('#ffffff');
  spreadsheet.getActiveSheet().setName('設定');
  spreadsheet.getActiveSheet().setHiddenGridlines(true);
}
