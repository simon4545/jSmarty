/*
 * jSmarty for Node.JS
 * https://github.com/simon4545/jSmarty
 *
 * Copyright (c) 2014 Simon4545
 * Licensed under the MIT license.
 */
;(function(factory) {
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        var target = module['exports'] || exports;
        factory(target, 'node');
    } else if (typeof define === 'function' && define['amd']) {
        define(['exports'], factory);
    } else {
        factory(window['NC'] = {});
    }
})(function(exports, env) {