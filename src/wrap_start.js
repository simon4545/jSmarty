(function(factory) {
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        var target = module['exports'] || exports;
        factory(target, 'node');
    } else if (typeof define === 'function' && define['amd']) {
        define(['exports'], factory);
    } else {
        factory(window['NC'] = {});
    }
})(function(exports, env) {