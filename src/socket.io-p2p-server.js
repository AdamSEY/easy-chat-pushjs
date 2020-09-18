const debug = require('debug')('socket')
const clients = {}

module.exports.clients = clients
module.exports.Server = p2pSocket

function p2pSocket (socket, next, room,channelName) {
    clients[socket.id] = socket;
    let connectedClients;
    if (typeof room === 'object') {
         connectedClients = socket.adapter.rooms[room.name]
    } else {
        connectedClients = clients
    }
    socket.emit(channelName, {'type': 'numbClinets', 'value': Object.keys(connectedClients).length - 1})

    socket.on('disconnect', function () {
        delete clients[socket.id]
        Object.keys(connectedClients).forEach(function (clientId, i) {
            const client = clients[clientId]
            client.emit(channelName, {'type': 'peer-disconnect', 'value': {peerId: socket.id}})
        })
        debug('Client gone (id=' + socket.id + ').')
    })

    socket.on(channelName, function (data) {
        if (data.type === 'offers'){
            Object.keys(connectedClients).forEach(function (clientId, i) {
                const client = clients[clientId]
                if (client !== socket) {
                    const offerObj = data.offers[i]
                    const emittedOffer = {fromPeerId: socket.id, offerId: offerObj.offerId, offer: offerObj.offer}
                    debug('Emitting offer: %s', JSON.stringify(emittedOffer))
                    client.emit(channelName, {'type': 'offers', 'value': emittedOffer})
                }
            })
        }
        // send offers to everyone in a given room

        if (data.type === 'peer-signal'){
            const toPeerId = data.value.toPeerId
            debug('Signal peer id %s', toPeerId);
            const client = clients[toPeerId]
            client.emit(channelName, data);
        }

    })
    typeof next === 'function' && next()
}
