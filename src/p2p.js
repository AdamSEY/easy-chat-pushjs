let clients = {};
module.exports.Server = p2pSocket

function p2pSocket (socket,roomName,io) {

    socket.join(roomName);
    clients[socket.id] = socket;
    // console.log(Object.getOwnPropertyNames(clients));
    const connectedClients = io.sockets.adapter.rooms.get(roomName) ? Array.from(io.sockets.adapter.rooms.get(roomName)) : { length: 0 }
    let numberOfClients = connectedClients.length;
    console.log(connectedClients,numberOfClients);

    socket.emit('numClients', numberOfClients)

    socket.on('disconnect', function () {
        delete clients[socket.id];
        // console.log(clients, Object.getOwnPropertyNames(clients), Object.keys(connectedClients).length);

        Object.keys(clients).forEach(function (clientId, i) {
            console.log({clientId});
            var client = clients[clientId]
            client.emit('peer-disconnect', {peerId: socket.id})
            socket.emit('numClients', numberOfClients -1)
        })
      //  debug('Client gone (id=' + socket.id + ').')
    })

    socket.on('offers', function (data) {
        // send offers to everyone in a given room
        Object.keys(clients).forEach(function (clientId, i) {
            var client = clients[clientId]
            if (client !== socket) {
                var offerObj = data.offers[i]
                var emittedOffer = {fromPeerId: socket.id, offerId: offerObj.offerId, offer: offerObj.offer}
              //  debug('Emitting offer: %s', JSON.stringify(emittedOffer))
                client.emit('offer', emittedOffer)
            }
        })
    })

    socket.on('peer-signal', function (data) {
        var toPeerId = data.toPeerId
       // debug('Signal peer id %s', toPeerId);
        var client = clients[toPeerId]
        console.log(Object.keys(clients));
        client.emit('peer-signal', data)
    })

}
