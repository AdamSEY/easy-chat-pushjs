let clients = {};
module.exports.Server = p2pSocket

function p2pSocket (socket,roomName,io) {
    console.log('p2psocket reached');
    const privateSocketRoom = `${roomName}:${socket.id}`;
    // because by default every users joined socket.id. so we're limiting it to webrtc only. to prevent users from sending private messages outside this.
    socket.join(roomName);
    socket.join(privateSocketRoom);// to send direct message to socket users.

    clients[socket.id] = socket;
    // console.log(Object.getOwnPropertyNames(clients));
    const connectedClients = io.sockets.adapter.rooms.get(roomName) ? Array.from(io.sockets.adapter.rooms.get(roomName)) : { length: 0 }
    let numberOfClients = connectedClients.length;
    console.log(connectedClients,numberOfClients);

  //  socket.emit('numClients', numberOfClients)

    socket.on('disconnect', function () {
        delete clients[socket.id];
        // socket.emit('peer-disconnect', {peerId: socket.id})
        // socket.emit('numClients', numberOfClients -1)

    })
    // connected
    socket.to(roomName).emit('webrtc_communication', {
        type: "newConnection",
        userId: socket.id
    })
    socket.on('webrtc_communication', function (data) {
        // send offers to everyone in a given room
        console.log(data);
        // io.to(roomName).emit('webrtc_communication', data); // to everyone including the sender.
        if (data.userId) { // it must be always there.
            // send directly to this userID. newly connected on. we don't have to share info with all the other peers.
            socket.to(`${roomName}:${data.userId}`).emit('webrtc_communication', data);
        }else{
            socket.to(roomName).emit('webrtc_communication', data);
        }

        // if (data.type === 'webrtc_offer') {
        //
        // } else if (data.type === 'webrtc_answer') {
        //
        // } else if (data.type === 'webrtc_candidate') {
        //
        // }

    });

}
