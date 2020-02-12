'use strict';
require('array.prototype.find');

function sunpower(config) {

    if ( !(this instanceof sunpower) ){
        return new sunpower(config);
    }

    const redis = require('redis');
    var moment = require('moment');

    let pub = redis.createClient(
        {
            host: process.env.REDIS || global.config.redis || '127.0.0.1' ,
            socket_keepalive: true,
            retry_unfulfilled_commands: true
        }
    );

    pub.on('end', function(e){
        console.log('Redis hung up, committing suicide');
        process.exit(1);
    });

    var NodeCache = require( "node-cache" );

    var deviceCache = new NodeCache();
    var statusCache = new NodeCache();

    var merge = require('deepmerge');

    var request = require('request');
    var https = require('https');

    const mysql = require('./mysql');

    let db;

    var keepAliveAgent = new https.Agent({ keepAlive: true });
/*
    require('request').debug = true
    require('request-debug')(request);
*/

    deviceCache.on( 'set', function( key, value ){
        let data = JSON.stringify( { module: 'sunpower', id : key, value : value });
        console.log( 'sentinel.device.insert => ' + data );
        pub.publish( 'sentinel.device.insert', data);
    });

    deviceCache.on( 'delete', function( key ){
        let data = JSON.stringify( { module: 'sunpower', id : key });
        console.log( 'sentinel.device.delete => ' + data );
        pub.publish( 'sentinel.device.delete', data);
    });

    statusCache.on( 'set', function( key, value ){
        let data = JSON.stringify( { module: 'sunpower', id : key, value : value });
        //console.log( 'sentinel.device.update => ' + data );
        pub.publish( 'sentinel.device.update', data);
    });

	var that = this;

    let server = 'elhapi.edp.sunpower.com';

    var api = {
            "login" : "/v1/elh/authenticate",
            "system" : "/v1/elh/address/{addressId}",
            "current" : "/v1/elh/address/{addressId}/energy/minute?async=false&endepm={endDate}&startepm={startDate}"
        };

    let userId;
    let addressId;

    let token;

    function login(){

        return new Promise( (fulfill, reject) =>{

            call( api.login, 'post',  { 'username': config.username, 'password': config.password, 'isPersistent': false }, 'application/json' )
                .then( (result) => {

                    if ( result.tokenID ){
                        token = result.tokenID;
                        userId = result.userId;
                        addressId = result.addressId;
                        fulfill(token);
                    }

                    reject( new Error( 'Unable to login') );

                })
                .catch( (err) =>{
                    reject(err);
                });

        });
    }

    function call(url, method, data, type){

        return new Promise( (fulfill, reject) => {

            if ( url !== api.login ) {
                if (userId === undefined) {

                    login()
                        .then(() => {
                            call(url, method, data)
                                .then((result) => {
                                    fulfill(result);
                                })
                                .catch((err) => {
                                    reject(err);
                                });
                        })
                        .catch((err) => {
                            reject(err);
                        });

                    return;
                }
            }

            url = url.replace('{userId}', userId);
            url = url.replace('{addressId}', addressId);

            let now = new Date();
            let day = now.getDate();
            let month = now.getMonth();
            let year = now.getFullYear();

            let epoch = new Date(year, month, day, 0, 0 ,0).getTime();

            let startDate = epoch;
            let endDate = startDate + (24*60*60*1000);

            url = url.replace('{startDate}', startDate);
            url = url.replace('{endDate}', endDate);

            let  options = {
                url : 'https://' + server + url,
                method : method,
                encoding : null,
                headers : {
                    'accept' : 'application/json',
                    'User-Agent' : 'Mozilla/5.0'
                },
                timeout : 90000,
                agent : keepAliveAgent,
                followRedirect: false
            };

            if ( token !== undefined ){
                options['headers']['Authorization'] = 'SP-CUSTOM ' + token;
            }

            if ( data === undefined )
                data = null;

            if ( data !== null ){
                if ( type === 'application/json' )
                    data = JSON.stringify(data);

                options['body'] = data;
                options['headers']['content-type'] = type;
            }

            try {

                console.log( options.url );
                //console.log( data );

                request(options, (err, response, body) => {

                    if (err){
                        return reject(err);
                    }

                    switch (response.statusCode ) {
                        case 200:
                            let result = JSON.parse(body);

                            fulfill(result);
                            return;
                        case 403:

                            login()
                                .then(() => {
                                    call(url, method, data)
                                        .then((result) => {
                                            fulfill(result);
                                        })
                                        .catch((err) => {
                                            reject(err);
                                        });
                                })
                                .catch((err) => {
                                    reject(err);
                                });

                            return;
                    }

                    console.error(body);

                    reject(body);

                });
            }catch(e){
                console.error(err);
                reject(e);
            }
        } );
    }

    this.getDevices = () => {

        return new Promise( (fulfill, reject) => {
            deviceCache.keys( ( err, ids ) => {
                if (err)
                    return reject(err);

                deviceCache.mget( ids, (err,values) =>{
                    if (err)
                        return reject(err);

                    statusCache.mget( ids, (err, statuses) => {
                        if (err)
                            return reject(err);

                        let data = [];

                        for (let key in values) {
                            let v = values[key];

                            if ( statuses[key] ) {
                                v.current = statuses[key];
                                data.push(v);
                            }
                        }

                        fulfill(data);
                    });

                });
            });
        });
    };

    this.getDeviceStatus = (id) => {

        return new Promise( (fulfill, reject) => {
            try {
                statusCache.get(id, (err, value) => {
                    if (err)
                        return reject(err);

                    fulfill(value);
                }, true);
            }catch(err){
                reject(err);
            }
        });

    };

    this.getData = (q) => {
        return new Promise( (fulfill, reject) => {
            try {
                db.query(q)
                    .then( (rows,fields) => {
                        fulfill(rows);
                    })
                    .catch((err) => {
                        console.error(err);
                        reject(err);
                    });
            }catch(err){
                reject(err);
            }
        });
    };

    function updateStatus() {
        return new Promise( ( fulfill, reject ) => {

            call( api.current )
                .then( (data) => {

                    let results = Array.isArray(data.Payload) ? data.Payload : [data.Payload];

                    for( var i in results ) {

                        let device = results[i];

                        let id = device.AddressId;

                        let current = {
                            generating : device.SystemList[0].Production,
                            timestamp : new Date( device.SystemList[0].DateTimeReceived )
                        };

                        db.insert('sunpower_samples',
                            {
                                id: id,
                                sample_ts: new Date(),
                                generating: current.generating,
                                timestamp: current.timestamp
                            })
                            .catch( (err) => {
                                console.error(err);
                            });

                        statusCache.set(id, current);
                    }

                    fulfill();
                })
                .catch( (err) =>{
                    reject(err);
                });
        });
    }

    this.Reload = () => {
        return new Promise( (fulfill,reject) => {
            fulfill([]);
        });
    };


    function processDevice( d ){
        var device = { 'system' : {}, 'current' : {} };
        device['name'] = d.OwnerName;
        device['id'] = d.id;
        device['type'] = 'power.generator.solar';
        device['system']['installed'] = new Date( d.CommissioningDate );
        device['system']['timestamp'] = new Date( d.SiteDateTime );
        device['system']['size'] = {};
        device['system']['size']['actual'] = d.SystemSizeKw * d.SystemSizeMultiplier;
        device['system']['size']['provisioned'] = parseFloat( d.SystemSizeKw );
        return device;
    }

    function loadSystem(){
        return new Promise( ( fulfill, reject ) => {

            global.schema = config.db.schema ||'sentinel';

            mysql.connect(config.db)
                .then((connection) => {
                    return connection.useDatabase(global.schema);
                })
                .then((schema) => {
                    db = schema;

                    return db.query(`
                    CREATE TABLE IF NOT EXISTS sunpower_samples
                    (
                        sample_ts    DATETIME PRIMARY KEY NOT NULL,
                        generating   FLOAT,
                        timestamp    DATETIME,
                        id           VARCHAR(60),
                        UNIQUE INDEX idx_timestamp (timestamp)
                    );
                    `);
                })
                .then(() => {
                    return call( api.system )
                })
                .then( (data) => {

                    let results = Array.isArray(data) ? data : [data];

                    let devices = [];

                    for( var i in results ) {
                        var device = results[i];

                        let d = processDevice (device);

                        deviceCache.set(d.id, d);
                        devices.push(d);
                    }

                    fulfill(devices);
                })
                .catch( (err) =>{
                    reject(err);
                });
        });
    }

    loadSystem()

        .then( () => {

            function pollSystem() {
                updateStatus()
                    .then(() => {
                        setTimeout(pollSystem, 60000);
                    })
                    .catch((err) => {
                        console.error(err);
                        setTimeout(pollSystem, 60000);
                    });

            }

            setTimeout(pollSystem, 100);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });

    return this;
}

module.exports = sunpower;