'use strict';

const moment = require('moment');

module.exports.getProduction = (req, res) => {

    let id = req.swagger.params.id.value;
    let range = req.swagger.params.range.value;
    let end = req.swagger.params.end.value;

    if ( end ){
        end = start.toUTCString().replace('GMT','');
        end = new Date( end );
    }

    if ( !end )
        end = new Date();

    getProductionBy[range]( id, end, res );

};

let getProductionBy = {};

getProductionBy['hour'] = (id, end, res) => {

    let ts1 = moment(end).format('YYYY-MM-DD');
    let ts2 = moment(end).add(1, 'd').format('YYYY-MM-DD');

    let q = `
    select 
        DATE_FORMAT(timestamp, "%H") as hour, 
        avg(generating) as kwh 
    from 
        sentinel.sunpower_samples 
    where id = ${id} and timestamp >= ' 00:00:00' and timestamp < '${ts2} 00:00:00' 
    group by hour`;

    global.module.getData(q)
        .then( (data) => {
            let r = { start : ts1, end : ts2, samples : data };
            res.json( { data: r, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

getProductionBy['day'] = (id, end, res) => {

    let ts1 = moment(end).subtract(1, 'd').format('YYYY-MM-DD');
    let ts2 = moment(end).format('YYYY-MM-DD');

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
            let r = { start : ts1, end : ts2, samples : data };
            res.json( { data: r, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

getProductionBy['week'] = (id, end, res) => {

    let ts1 = moment(end).subtract(1, 'w').format('YYYY-MM-DD');
    let ts2 = moment(end).format('YYYY-MM-DD');

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
            let r = { start : ts1, end : ts2, samples : data };
            res.json( { data: r, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

getProductionBy['month'] = (id, end, res) => {

    let ts1 = moment(end).subtract(1, 'm').format('YYYY-MM-DD');
    let ts2 = moment(end).format('YYYY-MM-DD');

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
            let r = { start : ts1, end : ts2, samples : data };
            res.json( { data: r, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

getProductionBy['year'] = (id, end, res) => {

    let ts1 = moment(end).subtract(1, 'y').format('YYYY-MM-DD');
    let ts2 = moment(end).format('YYYY-MM-DD');

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
            let r = { start : ts1, end : ts2, samples : data };
            res.json( { data: r, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};
