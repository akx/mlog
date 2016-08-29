require('whatwg-fetch');
require('./style.styl');
const Promise = require('bluebird');
const m = require('mithril');
const R = require('ramda');

const sources = [
    'http://sandbox.6aika.fi/mqttlogs/13876791.json',
    'http://sandbox.6aika.fi/mqttlogs/14706760.json',
    'http://sandbox.6aika.fi/mqttlogs/14708486.json',
    'http://sandbox.6aika.fi/mqttlogs/14709399.json',
    'http://sandbox.6aika.fi/mqttlogs/14709453.json',
];

const dataBySensor = {};

function measure(measurements, prop, formatter = R.toString) {
    const values = R.pipe(R.pluck(prop), R.filter((v) => typeof v == 'number'))(measurements);
    const calculated = {
        min: Math.min.apply(null, values),
        max: Math.max.apply(null, values),
        avg: R.sum(values) / values.length,
        latest: R.last(values),
    };
    return {
        values,
        calculated,
        formatted: R.pipe(
            R.toPairs,
            R.map(([key, value]) => [key, formatter(value)]),
            R.fromPairs
        )(calculated),
    };
}

function formatSparkline(meas) {
    const width = 600;
    const height = 100;
    const {min, max} = meas.calculated;
    var path = meas.values.map((value, i) => {
        const x = (i / meas.values.length) * width;
        const y = (1 - (value - min) / (max - min)) * height;
        return `${i ? 'L' : 'M'}${x} ${y}`;
    }).join(' ');
    return m(
        'svg',
        {width, height},
        m('path', {d: path})
    );
}

function formatMeas(className, title, meas) {
    return m(`.meas.${className}`,
        m('h2', title),
        m('.values', [
            ['latest', 'Now'],
            ['min', 'Min'],
            ['max', 'Max'],
            ['avg', 'Avg'],
        ].map(([dp, title]) => m(`span.m.${dp}`, m('label', title), m('span.value', meas.formatted[dp])))),
        m('.sparkline', formatSparkline(meas))
    );
}

function view() {
    return m('.main',
        R.sortBy(R.prop(0), R.toPairs(dataBySensor)).map(([chipid, measurements]) => {
            const humi = measure(measurements, 'dht22_humi', (val) => `${val.toFixed(1)}%`);
            const temp = measure(measurements, 'dht22_temp', (val) => `${val.toFixed(1)}\u00B0C`);
            const lastEvents = R.pipe(
                R.filter(R.prop('event')),
                R.reverse,
                R.slice(0, 10)
            )(measurements);
            return m('div.node', [
                m('h1', chipid),
                formatMeas('humi', 'Humidity', humi),
                formatMeas('temp', 'Temperature', temp),
                m('.events', lastEvents.map((ev) => m('.event', `${ev.event} at ${ev.timestamp}`))),
            ]);
        })
    );
}

function update() {
    Promise.map(
        sources,
        (url) => fetch(url).then((r) => r.json())
    ).then((datas) => {
        return R.pipe(
            R.flatten,
            R.sortBy(R.prop('timestamp')),
            R.groupBy(R.prop('chipid'))
        )(datas);
    }).then((bySensor) => {
        Object.keys(bySensor).forEach((sid) => {
            dataBySensor[sid] = bySensor[sid];
        });
        m.redraw();
    });
}

function init() {
    m.mount(document.body, {view});
    update();
    setInterval(update, 5000);
}

init();
