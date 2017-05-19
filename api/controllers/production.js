'use strict';

const moment = require('moment');

module.exports.getProduction = (req, res) => {

    let id = req.swagger.params.id.value;
    let range = req.swagger.params.range.value;
    let start = req.swagger.params.start.value;

    if ( start ){
        start = start.toUTCString().replace('GMT','');
        start = new Date( start );
    }

    if ( !start )
        start = new Date();

    getProductionBy[range]( id, start, res );

};

let getProductionBy = {};

getProductionBy['now'] = (id, start, res) => {

    let ts1 = moment(start).add(1, 'd').format('YYYY-MM-DD');
    let ts2 = moment(start).format('YYYY-MM-DD');

    let q = `
    select 
        DATE_FORMAT(timestamp, "%H") as hour, 
        avg(generating) as kwh 
    from 
        sentinel.sunpower_samples 
    where id = ${id} and timestamp >= '${ts1} 00:00:00' and timestamp < '${ts2} 00:00:00' 
    group by hour`;

    global.module.getData(q)
        .then( (data) => {
            res.json( { data: data, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

getProductionBy['day'] = (id, start, res) => {

    let ts1 = moment(start).format('YYYY-MM-DD');
    let ts2 = moment(start).add(1, 'd').format('YYYY-MM-DD');

    let q = `
    select left( t1.d, 10) as date,
           sum(t1.kwh) as kwh
    from (
        select 
            DATE_FORMAT(timestamp, "%Y-%m-%d %H") as d, 
            avg(generating) as kwh 
        from 
            sentinel.sunpower_samples 
        where id = ${id} and timestamp >= '${ts1} 00:00:00' and timestamp < '${ts2} 00:00:00' 
        group by d
    ) as t1
    group by date`;

    global.module.getData(q)
        .then( (data) => {
            res.json( { data: data, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

getProductionBy['week'] = (id, start, res) => {

    let ts1 = moment(start).format('YYYY-MM-DD');
    let ts2 = moment(start).add(1, 'w').format('YYYY-MM-DD');

    let q = `
    select left( t1.d, 10) as date,
           sum(t1.kwh) as kwh
    from (
        select 
            DATE_FORMAT(timestamp, "%Y-%m-%d %H") as d, 
            avg(generating) as kwh 
        from 
            sentinel.sunpower_samples 
        where id = ${id} and timestamp >= '${ts1} 00:00:00' and timestamp < '${ts2} 00:00:00' 
        group by d
    ) as t1
    group by date`;


    global.module.getData(q)
        .then( (data) => {
            res.json( { data: data, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

getProductionBy['month'] = (id, start, res) => {

    let ts1 = moment(start).format('YYYY-MM-DD');
    let ts2 = moment(start).add(1, 'M').format('YYYY-MM-DD');

    let q = `
    select left( t1.d, 10) as date,
           sum(t1.kwh) as kwh
    from (
        select 
            DATE_FORMAT(timestamp, "%Y-%m-%d %H") as d, 
            avg(generating) as kwh 
        from 
            sentinel.sunpower_samples 
        where id = ${id} and timestamp >= '${ts1} 00:00:00' and timestamp < '${ts2} 00:00:00' 
        group by d
    ) as t1
    group by date`;


    global.module.getData(q)
        .then( (data) => {
            res.json( { data: data, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

getProductionBy['year'] = (id, start, res) => {

    let ts1 = moment(start).format('YYYY-MM-DD');
    let ts2 = moment(start).add(1, 'y').format('YYYY-MM-DD');

    let q = `
    select left( t1.d, 7) as date,
           sum(t1.kwh) as kwh
    from (
        select 
            DATE_FORMAT(timestamp, "%Y-%m-%d %H") as d, 
            avg(generating) as kwh 
        from 
            sentinel.sunpower_samples 
        where id = ${id} and timestamp >= '${ts1} 00:00:00' and timestamp < '${ts2} 00:00:00' 
        group by d
    ) as t1
    group by date`;


    global.module.getData(q)
        .then( (data) => {
            res.json( { data: data, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};
