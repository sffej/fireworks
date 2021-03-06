var LIGHTS_PER_METER = 30;
var NUM_PIXELS = [
  5, 10,                // Circles
  5, 1, 2, 1,           // Lines
  5, 1, 2, 1,
  5, 1, 2, 1
].map(function (value) { return Math.floor(value * LIGHTS_PER_METER); });

// Explicit ordering for vertical sections to ensure they match with the right line in the circle
var VERTICAL_MAP = {
    0: -4,
    4: 4,
    8: 0
};

var NUM_CIRCLES = 2;
var NUM_LINES = NUM_PIXELS.length - NUM_CIRCLES;
var FULL_CIRCLE = 2 * Math.PI;
var PX_PER_METER = 200;
var OUTER_RADIUS = 2;
var OFFSET = OUTER_RADIUS * PX_PER_METER;
var FOLD_RADIUS = 0.02;
var ROTATE = Math.PI / 4.1;


var output = document.getElementById('output');
var context = output.getContext('2d');


var mapLine = function (line, pixelId) {

    // Circular components

    if (line < NUM_CIRCLES) {
        var radius = 5 * (line + 1) / FULL_CIRCLE,
            angle = FULL_CIRCLE * (pixelId / NUM_PIXELS[line]) + ROTATE;

        return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
    }

    // Straight lines

    var lineOffset = line - NUM_CIRCLES;
    var lineMod = lineOffset % 4;

    var angle = FULL_CIRCLE * lineOffset / NUM_LINES + ROTATE;
    var radius = OUTER_RADIUS - pixelId / LIGHTS_PER_METER;

    if (!lineMod &&
        radius < FOLD_RADIUS) {

        // Fake the depth for the components that are "folded over"

        return [
            1.5 * VERTICAL_MAP[lineOffset] / PX_PER_METER,
            -radius,
            1
        ];
    }

    return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
};


var lightPixelByLine = function (line, pixel, color) {
    var map = mapLine(line, pixel);
    context.fillStyle = color;
    context.fillRect(OFFSET + PX_PER_METER * map[0], OFFSET + PX_PER_METER * map[1], 4, 4);
};


var STRANDS = [
    [2, 12, 11, 13, 0],
    [10, 8, 7, 9, 1],
    [6, 4, 3, 5, 1]
];


var lightPixel = function (strandId, led, color) {

    var strand = STRANDS[strandId];
    var offset = led;

    var line;
    var px;

    for (var l = 0, ll = strand.length; l < ll; ++l) {
        line = strand[l];
        var length = NUM_PIXELS[line];

        if (line === 1) {
            if (strandId === 2) {
                length /= 2;
            }
        }

        px = length - offset - 1;
        if (px > -1) {
            break;
        }

        offset -= length;
    }

    lightPixelByLine(line, px, color);
};


var play = function (animation, fps) {

    var delay = 1000 / fps;

    var display = function (tick) {

        output.width = output.width;

        if (animation[3][tick]) {
            effect(animation[3][tick]);
        }

        for (var i = 0; i < 3; ++i) {
            var leds = animation[i][tick];
            for (var l = 0, ll = leds.length; l < ll; ++l) {
                if (leds[l]) {
                    lightPixel(i, l, toHex(leds[l]));
                }
            }
        }

        setTimeout(function () {

            ++tick;
            display(tick < animation[0].length ? tick : 0);
        }, delay);
    };

    display(0);
};


var toHex = function (number) {

    if (!number) {
        return;
    }

    var hex = number.toString(16);
    var pad = '000000';
    return '#' + pad.substring(0, pad.length - hex.length) + hex;
};


// Audio

var audioContext = new AudioContext();
var sounds = {};

var loadAudio = function (callback) {

    var load = function (url, next) {

        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';

        request.onload = function () {

            audioContext.decodeAudioData(request.response, next);
        };

        request.send();
    };

    load('/audio/launch.mp3', function (sound) {

        sounds.launch = sound;
        load('/audio/burst.mp3', function (sound) {

            sounds.burst = sound;
            load('/audio/sparkle.mp3', function (sound) {

                sounds.sparkle = sound;
                load('/audio/whirl.mp3', function (sound) {

                    sounds.whirl = sound;
                    callback();
                });
            });
        });
    });
};


var effect = function (track) {

    var source = audioContext.createBufferSource();
    source.buffer = sounds[track];
    source.connect(audioContext.destination);
    source.start(0);
};
