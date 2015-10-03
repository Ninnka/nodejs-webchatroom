var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

app.set('port', process.env.PORT || 8000);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var users = {};
var clientsId = {};
app.get('/', function (req, res){
  if(req.cookies.user == null){
    res.redirect('/signin');
  }else{
    var options = {
      root: __dirname + '/views/',
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      }
    };
    res.sendFile('index.html', options, function(err){
      if(err){
        console.log(err);
        res.status(err.status).end();
      }else{
        console.log('sent index.html successfully');
      }
    });
  }
});

app.get('/signin', function (req, res){
  var options = {
      root: __dirname + '/views/',
      dotfiles: 'deny',
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      }
    };
    res.sendFile('signin.html', options, function(err){
      if(err){
        console.log(err);
        res.status(err.status).end();
      }else{
        console.log('sent signin.html successfully');
      }
    });
});

app.post('/signin', function (req, res){
  if(users[req.body.name]){
    //已存在的用户名
    res.redirect('/signin');
  }else{
    res.cookie('user', req.body.name, {
      maxAge: 1000*60*60*24*30
    });
    res.redirect('/');
  }
});

var server = http.createServer(app);
var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket){
  //有人上线
  socket.on('online', function (data){
    //将上线的用户名存储为 socket 对象的属性，以区分每个 socket 对象，方便后面使用
    socket.name = data.user;
    //加入test room
    socket.join('text room');
    //users 对象中不存在该用户名则插入该用户名
    if(!users[data.user]){
      users[data.user] = data.user;
      var temp;
      for(var i in io.sockets.adapter.rooms['text room']){
        temp = i;
      }
      clientsId[data.user] = temp;
    }
    ////向所有用户广播该用户上线信息
    io.sockets.emit('online', {
      users: users,
      user: data.user
    })
  });
  //转发某人的信息
  socket.on('say', function (data){
    if (data.to == 'all') {
      //向其他所有用户广播该用户发话信息
      socket.broadcast.emit('say', data);
    } else {
        var clients = io.sockets.adapter.rooms['text room'];
        //console.log(clients);
        for (var clientId in clients) {
          for(var c in clientsId){
            if(clientsId[c] == clientId){
              io.sockets.connected[clientId].emit('say', data);
            }
            //console.log(clientsId[c]);
          }
          //console.log(io.sockets.connected[clientId]);
          //console.log(clientId);
        }
      }
  });
  //用户下线
  socket.on('disconnect', function(){
    //若 users 对象中保存了该用户名
    if(users[socket.name]){
      //从users对象中删除该用户
      delete users[socket.name];
      //从clientsId对象中删除该用户
      delete clientsId[socket.name];
      //通知其他用户该用户已下线
      socket.broadcast.emit('offline', {
        users: users,
        user: socket.name
      });
    }
  })
});

//服务器监听端口
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});