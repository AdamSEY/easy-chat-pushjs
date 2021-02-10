var debug = require('debug')('socket')
var clients = {}

module.exports.clients = clients
module.exports.Server = p2pSocket

function p2pSocket (socket, next, roomName,io) {

  if (!clients.hasOwnProperty(roomName)){
    clients[roomName] = {};
  }

  clients[roomName][socket.id] = socket
  let connectedClients = io.sockets.adapter.rooms.get(roomName);
  connectedClients = [...connectedClients]; // convert to array because offers[i] -- [i] undefinded with 'set'.
  console.log({connectedClients});

  // io.in(roomName).clients((err, clients) => {
  //   console.log('getting total users and connected users');
  //   // clients will be array of socket ids , currently available in given room
  //   const clientsInfo = clients.map((value) => {
  //     // value:socketId
  //     return io.sockets.connected[value].userInfo;
  //   });
  //   // const users = { total: clientsInfo.length, users: clientsInfo };
  //   console.log('Total Connected:', clientsInfo.length);
  //   io.to(roomName).emit('numClients', clientsInfo.length);
  // });

  const _clients = io.sockets.adapter.rooms.get(roomName);

  //to get the number of clients in this room
  const numClients = _clients ? _clients.size : 0;

  socket.to(roomName).emit('numClients', numClients)

  socket.on('disconnect', function () {

    delete clients[roomName][socket.id]
    socket.to(roomName).emit('peer-disconnect', {peerId: socket.id})
    debug('Client gone (id=' + socket.id + ').')
  })

  socket.on('offers', function (data) {
    // send offers to everyone in a given room

    connectedClients.forEach(function (clientId, i) {
      var client = clients[roomName][clientId]
      if (client !== socket) {
        var offerObj = data.offers[i]
        console.log(i, offerObj);
        var emittedOffer = {fromPeerId: socket.id, offerId: offerObj.offerId, offer: offerObj.offer}
        debug('Emitting offer: %s', JSON.stringify(emittedOffer))
        socket.to(roomName).emit('offer', emittedOffer)
      }else{
        debug('client === socket')
      }
    })

  })

  socket.on('peer-signal', function (data) {
    var toPeerId = data.toPeerId
    debug('Signal peer id %s', toPeerId);
    socket.to(toPeerId).emit('peer-signal', data)
  })
  typeof next === 'function' && next()
}
