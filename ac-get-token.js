#!/usr/bin/env node

const AirConditionerApi = require('./air-conditioner-api').AirConditionerApi;
const tls = require('tls');
const carrier = require('carrier');
const fs = require('fs');
const path = require('path');

const [, , ...args] = process.argv;
const ipAddress = args[0];

console.log('IP: ', ipAddress);

function getToken(callback) {
    var token;

    const pfxPath = path.join(__dirname, 'ac14k_m.pfx')
    const socket = tls.connect({ pfx: fs.readFileSync(pfxPath), port: 2878, host: ipAddress, rejectUnauthorized: false }, function () {
        socket.setEncoding('utf8');
        carrier.carry(socket, function (line) {
            if (line == '<?xml version="1.0" encoding="utf-8" ?><Update Type="InvalidateAccount"/>') {
                return socket.write('<Request Type="GetToken" />' + "\r\n");
            }

            if (line == '<?xml version="1.0" encoding="utf-8" ?><Response Type="GetToken" Status="Ready"/>') {
                console.log('Power on the device within the next 30 seconds');
            }

            if (line == '<?xml version="1.0" encoding="utf-8" ?><Response Status="Fail" Type="Authenticate" ErrorCode="301" />') {
                return callback(new Error('Failed authentication'));
            }

            const matches = line.match(/Token="(.*)"/);
            if (matches) {
                token = matches[1];
                return callback(null, token);
            }
        });
    }).on('end', function () {
        if (!token) callback(new Error('premature eof'));
    }).on('error', function (err) {
        if (!token) callback(err);
    });
}

getToken(function(error, token) {
    if (!!error) {
        console.log(error);
    }
    if (!!token) {
        console.log('Device token: ', token);
    }

    process.exit();
})