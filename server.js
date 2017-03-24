var http = require('http');
var fs = require('fs');
var url = require('url');
var info = require('./js/info');
var jsonfile = require('jsonfile');
var file = './json/events.json';
var eventsfromJSON = JSON.parse(fs.readFileSync('./json/events.json', 'utf8'));

http.createServer(function(req, res) {
  var urlParsed = url.parse(req.url);

  switch (urlParsed.pathname) {
    case '/':
      sendFile("index.html", res);
      break;

      case '/js/main.js':
      sendFile("./js/main.js", res);
      break;
      case '/css/main.css':
      sendFile("./css/main.css", res);
      break;
      case '/img/logo.png':
      sendFile("./img/logo.png", res);
      break;

    case '/subscribe':
      info.subscribe(req, res);
      break;

      case '/loadevents':
      jsonfile.readFile(file, function(err, obj) {
        return (function() {
          info.publish(obj);
          res.end(JSON.stringify(obj));
        })();
      });
        break;

      case '/publish':
      var body = '';

      req
        .on('readable', function() {
          body += req.read();

          if (body.length > 1e4) {
            res.statusCode = 413;
            res.end("Your message is too big!");
          }
        })
        .on('end', function() {
          try {
            body = JSON.parse(body);
          } catch (e) {
            res.statusCode = 400;
            res.end("Bad Request");
            return;
          }

          info.publish({typeEvent: body.typeEvent, eventStatus: body.eventStatus, date: body.date, methodist: body.methodist, theme: body.theme, additionaltheme: body.additionaltheme, school: body.school, time: body.time, place: body.place, manager: body.manager, comment: body.comment, id: body.id/*calendar: eventsfromJSON.events[0].date*/});
          res.end("ok");
        });

      break;


      case '/sendevent':
        var sendBody = '';
        req
          .on('readable', function() {
            sendBody += req.read();

            if (sendBody.length > 1e4) {
              res.statusCode = 413;
              res.end("Your message is too big!");
            }
          })
          .on('end', function() {
            try {
              sendBody = JSON.parse(sendBody);
            } catch (e) {
              res.statusCode = 400;
              res.end("Bad Request");
              return;
            }
            jsonfile.readFile(file, function(err, obj) {

              if (obj.events.length === 0) {
              obj.events.push(sendBody);
            } else {
              console.log(obj.events.length);
              for (var y = 0; y < obj.events.length; y++) {
                  if (obj.events[y].id === sendBody.id) {
                  obj.events[y].typeEvent = sendBody.typeEvent;
                  obj.events[y].statusEvent = sendBody.statusEvent;
                  obj.events[y].theme = sendBody.theme;
                  obj.events[y].additionaltheme = sendBody.additionaltheme;
                  obj.events[y].school = sendBody.school;
                  obj.events[y].time = sendBody.time;
                  obj.events[y].place = sendBody.place;
                  obj.events[y].manager = sendBody.manager;
                  obj.events[y].comment = sendBody.comment;
                  break;
                } else if (y == (+(obj.events.length) - 1)) {
                  //читаем id для новой записи с базы и обновляем id в базе
                  var compareId = obj.next_id;
                  sendBody.id = compareId.toString();
                  obj.events.push(sendBody);
                  obj.next_id = (+obj.next_id)+1;
                }
              }
            }
              return (function() {
                jsonfile.writeFile(file, obj, function (err) {
                  console.error(err);
                });
              })();
            });

            jsonfile.readFile(file, function(err, obj) {
              return (function() {
                info.publish(obj);
                res.end("ok");
              })();
            });
          });

        break;

        case '/deleteevent':
          var sendBodyDel = '';
          req
            .on('readable', function() {
              sendBodyDel += req.read();

              if (sendBodyDel.length > 1e4) {
                res.statusCode = 413;
                res.end("Your message is too big!");
              }
            })
            .on('end', function() {
              try {
                sendBodyDel = JSON.parse(sendBodyDel);
              } catch (e) {
                res.statusCode = 400;
                res.end("Bad Request");
                return;
              }
              jsonfile.readFile(file, function(err, obj) {
                //если файл пустой записать запись
                if (obj.events.length === 0) {
                obj.events.push(sendBodyDel);
              } else {
                for (var y = 0; y < obj.events.length; y++) {
                  if (obj.events[y].id === sendBodyDel.id) {

                    obj.events[y].date += '-DEL';
                    obj.events[y].methodist += '-DEL';

                  }
                }
              }
                return (function() {
                  jsonfile.writeFile(file, obj, function (err) {
                    console.error(err);
                  });
                })();
              });

              jsonfile.readFile(file, function(err, obj) {
                return (function() {
                  info.publish(obj);
                  res.end("ok");
                })();
              });
            });

          break;


    default:
      res.statusCode = 404;
      res.end("Not found");
  }


}).listen(2000);


function sendFile(fileName, res) {
  var fileStream = fs.createReadStream(fileName);
  fileStream
    .on('error', function() {
      res.statusCode = 500;
      res.end("Server error");
    })
    .pipe(res)
    .on('close', function() {
      fileStream.destroy();
    });
}
