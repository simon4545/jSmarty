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
function escapeRegExp(string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

/**
 * 移除不安全代码
 * @param html
 * @returns {*|void}
 */
function removeUnsafe(html) {
    var _templ = html.replace(/([\r\n])/ig, '\\n').replace(/\s{2,}/ig, ' ').replace(/\'/ig, "\\\'");
    return _templ;
}

function removeQuote(html) {
    var _templ = html.replace(/[\"|\']/ig, '');
    return _templ;
}

function strtotime(text, now) {
    //  discuss at: http://phpjs.org/functions/strtotime/
    //     version: 1109.2016
    // original by: Caio Ariede (http://caioariede.com)
    // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // improved by: Caio Ariede (http://caioariede.com)
    // improved by: A. Matías Quezada (http://amatiasq.com)
    // improved by: preuter
    // improved by: Brett Zamir (http://brett-zamir.me)
    // improved by: Mirko Faber
    //    input by: David
    // bugfixed by: Wagner B. Soares
    // bugfixed by: Artur Tchernychev
    //        note: Examples all have a fixed timestamp to prevent tests to fail because of variable time(zones)
    //   example 1: strtotime('+1 day', 1129633200);
    //   returns 1: 1129719600
    //   example 2: strtotime('+1 week 2 days 4 hours 2 seconds', 1129633200);
    //   returns 2: 1130425202
    //   example 3: strtotime('last month', 1129633200);
    //   returns 3: 1127041200
    //   example 4: strtotime('2009-05-04 08:30:00 GMT');
    //   returns 4: 1241425800

    var parsed, match, today, year, date, days, ranges, len, times, regex, i, fail = false;

    if (!text) {
        return fail;
    }

    // Unecessary spaces
    text = text.replace(/^\s+|\s+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/[\t\r\n]/g, '')
        .toLowerCase();

    // in contrast to php, js Date.parse function interprets:
    // dates given as yyyy-mm-dd as in timezone: UTC,
    // dates with "." or "-" as MDY instead of DMY
    // dates with two-digit years differently
    // etc...etc...
    // ...therefore we manually parse lots of common date formats
    match = text.match(
        /^(\d{1,4})([\-\.\/\:])(\d{1,2})([\-\.\/\:])(\d{1,4})(?:\s(\d{1,2}):(\d{2})?:?(\d{2})?)?(?:\s([A-Z]+)?)?$/);

    if (match && match[2] === match[4]) {
        if (match[1] > 1901) {
            switch (match[2]) {
                case '-':
                { // YYYY-M-D
                    if (match[3] > 12 || match[5] > 31) {
                        return fail;
                    }

                    return new Date(match[1], parseInt(match[3], 10) - 1, match[5],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
                }
                case '.':
                { // YYYY.M.D is not parsed by strtotime()
                    return fail;
                }
                case '/':
                { // YYYY/M/D
                    if (match[3] > 12 || match[5] > 31) {
                        return fail;
                    }

                    return new Date(match[1], parseInt(match[3], 10) - 1, match[5],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
                }
            }
        } else if (match[5] > 1901) {
            switch (match[2]) {
                case '-':
                { // D-M-YYYY
                    if (match[3] > 12 || match[1] > 31) {
                        return fail;
                    }

                    return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
                }
                case '.':
                { // D.M.YYYY
                    if (match[3] > 12 || match[1] > 31) {
                        return fail;
                    }

                    return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
                }
                case '/':
                { // M/D/YYYY
                    if (match[1] > 12 || match[3] > 31) {
                        return fail;
                    }

                    return new Date(match[5], parseInt(match[1], 10) - 1, match[3],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
                }
            }
        } else {
            switch (match[2]) {
                case '-':
                { // YY-M-D
                    if (match[3] > 12 || match[5] > 31 || (match[1] < 70 && match[1] > 38)) {
                        return fail;
                    }

                    year = match[1] >= 0 && match[1] <= 38 ? +match[1] + 2000 : match[1];
                    return new Date(year, parseInt(match[3], 10) - 1, match[5],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
                }
                case '.':
                { // D.M.YY or H.MM.SS
                    if (match[5] >= 70) { // D.M.YY
                        if (match[3] > 12 || match[1] > 31) {
                            return fail;
                        }

                        return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
                            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
                    }
                    if (match[5] < 60 && !match[6]) { // H.MM.SS
                        if (match[1] > 23 || match[3] > 59) {
                            return fail;
                        }

                        today = new Date();
                        return new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                            match[1] || 0, match[3] || 0, match[5] || 0, match[9] || 0) / 1000;
                    }

                    return fail; // invalid format, cannot be parsed
                }
                case '/':
                { // M/D/YY
                    if (match[1] > 12 || match[3] > 31 || (match[5] < 70 && match[5] > 38)) {
                        return fail;
                    }

                    year = match[5] >= 0 && match[5] <= 38 ? +match[5] + 2000 : match[5];
                    return new Date(year, parseInt(match[1], 10) - 1, match[3],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000;
                }
                case ':':
                { // HH:MM:SS
                    if (match[1] > 23 || match[3] > 59 || match[5] > 59) {
                        return fail;
                    }

                    today = new Date();
                    return new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                        match[1] || 0, match[3] || 0, match[5] || 0) / 1000;
                }
            }
        }
    }

    // other formats and "now" should be parsed by Date.parse()
    if (text === 'now') {
        return now === null || isNaN(now) ? new Date()
            .getTime() / 1000 | 0 : now | 0;
    }
    if (!isNaN(parsed = Date.parse(text))) {
        return parsed / 1000 | 0;
    }

    date = now ? new Date(now * 1000) : new Date();
    days = {
        'sun': 0,
        'mon': 1,
        'tue': 2,
        'wed': 3,
        'thu': 4,
        'fri': 5,
        'sat': 6
    };
    ranges = {
        'yea': 'FullYear',
        'mon': 'Month',
        'day': 'Date',
        'hou': 'Hours',
        'min': 'Minutes',
        'sec': 'Seconds'
    };

    function lastNext(type, range, modifier) {
        var diff, day = days[range];

        if (typeof day !== 'undefined') {
            diff = day - date.getDay();

            if (diff === 0) {
                diff = 7 * modifier;
            } else if (diff > 0 && type === 'last') {
                diff -= 7;
            } else if (diff < 0 && type === 'next') {
                diff += 7;
            }

            date.setDate(date.getDate() + diff);
        }
    }

    function process(val) {
        var splt = val.split(' '), // Todo: Reconcile this with regex using \s, taking into account browser issues with split and regexes
            type = splt[0],
            range = splt[1].substring(0, 3),
            typeIsNumber = /\d+/.test(type),
            ago = splt[2] === 'ago',
            num = (type === 'last' ? -1 : 1) * (ago ? -1 : 1);

        if (typeIsNumber) {
            num *= parseInt(type, 10);
        }

        if (ranges.hasOwnProperty(range) && !splt[1].match(/^mon(day|\.)?$/i)) {
            return date['set' + ranges[range]](date['get' + ranges[range]]() + num);
        }

        if (range === 'wee') {
            return date.setDate(date.getDate() + (num * 7));
        }

        if (type === 'next' || type === 'last') {
            lastNext(type, range, num);
        } else if (!typeIsNumber) {
            return false;
        }

        return true;
    }

    times = '(years?|months?|weeks?|days?|hours?|minutes?|min|seconds?|sec' +
        '|sunday|sun\\.?|monday|mon\\.?|tuesday|tue\\.?|wednesday|wed\\.?' +
        '|thursday|thu\\.?|friday|fri\\.?|saturday|sat\\.?)';
    regex = '([+-]?\\d+\\s' + times + '|' + '(last|next)\\s' + times + ')(\\sago)?';

    match = text.match(new RegExp(regex, 'gi'));
    if (!match) {
        return fail;
    }

    for (i = 0, len = match.length; i < len; i++) {
        if (!process(match[i])) {
            return fail;
        }
    }

    // ECMAScript 5 only
    // if (!match.every(process))
    //    return false;

    return (date.getTime() / 1000);
}
/**
 * 实现PHP strftime
 * @param format 日期格式化
 * @returns {string} 格式化后的日期
 */
var strftime = (function () {
    function strftime(date, format) {
        return (format + "").replace(/%([a-zA-Z ])/g,
            function (m, f) {
                var formatter = formats && formats[f];

                if (typeof formatter == "function") {
                    return formatter.call(formats, date);
                } else if (typeof formatter == "string") {
                    return strftime(formatter);
                }
                return f;
            });
    }

    //Internal helper
    function zeroPad(num) {
        return (+num < 10 ? "0" : "") + num;
    }

    var formats = {
        //Formatting methods
        d: function (date) {
            return zeroPad(date.getDate());
        },

        m: function (date) {
            return zeroPad(date.getMonth() + 1);
        },

        y: function (date) {
            return date.getYear() % 100;
        },

        Y: function (date) {
            return date.getFullYear();
        },

        //Format shorthands
        F: "%Y-%m-%d",
        D: "%m/%d/%y"
    };
    return strftime;
}());

/**
 * 实现PHP数字格式化
 * number_format(1234.56);
 * number_format(1234.56, 2, ',', ' ')
 * number_format(1000)
 * number_format('1 000,50', 2, '.', ' ')
 * @param number
 * @param decimals
 * @param dec_point
 * @param thousands_sep
 * @returns {string}
 * @reference http://phpjs.org/functions/number_format/
 */
function number_format(number, decimals, dec_point, thousands_sep) {
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}
function rawurlencode(str) {
    //       discuss at: http://phpjs.org/functions/rawurlencode/
    //      original by: Brett Zamir (http://brett-zamir.me)
    //         input by: travc
    //         input by: Brett Zamir (http://brett-zamir.me)
    //         input by: Michael Grier
    //         input by: Ratheous
    //      bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    //      bugfixed by: Brett Zamir (http://brett-zamir.me)
    //      bugfixed by: Joris
    // reimplemented by: Brett Zamir (http://brett-zamir.me)
    // reimplemented by: Brett Zamir (http://brett-zamir.me)
    //             note: This reflects PHP 5.3/6.0+ behavior
    //             note: Please be aware that this function expects to encode into UTF-8 encoded strings, as found on
    //             note: pages served as UTF-8
    //        example 1: rawurlencode('Kevin van Zonneveld!');
    //        returns 1: 'Kevin%20van%20Zonneveld%21'
    //        example 2: rawurlencode('http://kevin.vanzonneveld.net/');
    //        returns 2: 'http%3A%2F%2Fkevin.vanzonneveld.net%2F'
    //        example 3: rawurlencode('http://www.google.nl/search?q=php.js&ie=utf-8&oe=utf-8&aq=t&rls=com.ubuntu:en-US:unofficial&client=firefox-a');
    //        returns 3: 'http%3A%2F%2Fwww.google.nl%2Fsearch%3Fq%3Dphp.js%26ie%3Dutf-8%26oe%3Dutf-8%26aq%3Dt%26rls%3Dcom.ubuntu%3Aen-US%3Aunofficial%26client%3Dfirefox-a'

    str = (str + '')
        .toString();

    // Tilde should be allowed unescaped in future versions of PHP (as reflected below), but if you want to reflect current
    // PHP behavior, you would need to add ".replace(/~/g, '%7E');" to the following.
    return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .
        replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
}
function sprintf() {
    //  discuss at: http://phpjs.org/functions/sprintf/
    // original by: Ash Searle (http://hexmen.com/blog/)
    // improved by: Michael White (http://getsprink.com)
    // improved by: Jack
    // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // improved by: Dj
    // improved by: Allidylls
    //    input by: Paulo Freitas
    //    input by: Brett Zamir (http://brett-zamir.me)
    //   example 1: sprintf("%01.2f", 123.1);
    //   returns 1: 123.10
    //   example 2: sprintf("[%10s]", 'monkey');
    //   returns 2: '[    monkey]'
    //   example 3: sprintf("[%'#10s]", 'monkey');
    //   returns 3: '[####monkey]'
    //   example 4: sprintf("%d", 123456789012345);
    //   returns 4: '123456789012345'
    //   example 5: sprintf('%-03s', 'E');
    //   returns 5: 'E00'

    var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
    var a = arguments;
    var i = 0;
    var format = a[i++];

    // pad()
    var pad = function(str, len, chr, leftJustify) {
        if (!chr) {
            chr = ' ';
        }
        var padding = (str.length >= len) ? '' : new Array(1 + len - str.length >>> 0)
            .join(chr);
        return leftJustify ? str + padding : padding + str;
    };

    // justify()
    var justify = function(value, prefix, leftJustify, minWidth, zeroPad, customPadChar) {
        var diff = minWidth - value.length;
        if (diff > 0) {
            if (leftJustify || !zeroPad) {
                value = pad(value, minWidth, customPadChar, leftJustify);
            } else {
                value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
            }
        }
        return value;
    };

    // formatBaseX()
    var formatBaseX = function(value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
        // Note: casts negative numbers to positive ones
        var number = value >>> 0;
        prefix = prefix && number && {
            '2': '0b',
            '8': '0',
            '16': '0x'
        }[base] || '';
        value = prefix + pad(number.toString(base), precision || 0, '0', false);
        return justify(value, prefix, leftJustify, minWidth, zeroPad);
    };

    // formatString()
    var formatString = function(value, leftJustify, minWidth, precision, zeroPad, customPadChar) {
        if (precision != null) {
            value = value.slice(0, precision);
        }
        return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
    };

    // doFormat()
    var doFormat = function(substring, valueIndex, flags, minWidth, _, precision, type) {
        var number, prefix, method, textTransform, value;

        if (substring === '%%') {
            return '%';
        }

        // parse flags
        var leftJustify = false;
        var positivePrefix = '';
        var zeroPad = false;
        var prefixBaseX = false;
        var customPadChar = ' ';
        var flagsl = flags.length;
        for (var j = 0; flags && j < flagsl; j++) {
            switch (flags.charAt(j)) {
                case ' ':
                    positivePrefix = ' ';
                    break;
                case '+':
                    positivePrefix = '+';
                    break;
                case '-':
                    leftJustify = true;
                    break;
                case "'":
                    customPadChar = flags.charAt(j + 1);
                    break;
                case '0':
                    zeroPad = true;
                    customPadChar = '0';
                    break;
                case '#':
                    prefixBaseX = true;
                    break;
            }
        }

        // parameters may be null, undefined, empty-string or real valued
        // we want to ignore null, undefined and empty-string values
        if (!minWidth) {
            minWidth = 0;
        } else if (minWidth === '*') {
            minWidth = +a[i++];
        } else if (minWidth.charAt(0) == '*') {
            minWidth = +a[minWidth.slice(1, -1)];
        } else {
            minWidth = +minWidth;
        }

        // Note: undocumented perl feature:
        if (minWidth < 0) {
            minWidth = -minWidth;
            leftJustify = true;
        }

        if (!isFinite(minWidth)) {
            throw new Error('sprintf: (minimum-)width must be finite');
        }

        if (!precision) {
            precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type === 'd') ? 0 : undefined;
        } else if (precision === '*') {
            precision = +a[i++];
        } else if (precision.charAt(0) == '*') {
            precision = +a[precision.slice(1, -1)];
        } else {
            precision = +precision;
        }

        // grab value using valueIndex if required?
        value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

        switch (type) {
            case 's':
                return formatString(String(value), leftJustify, minWidth, precision, zeroPad, customPadChar);
            case 'c':
                return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
            case 'b':
                return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
            case 'o':
                return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
            case 'x':
                return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
            case 'X':
                return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad)
                    .toUpperCase();
            case 'u':
                return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
            case 'i':
            case 'd':
                number = +value || 0;
                number = Math.round(number - number % 1); // Plain Math.round doesn't just truncate
                prefix = number < 0 ? '-' : positivePrefix;
                value = prefix + pad(String(Math.abs(number)), precision, '0', false);
                return justify(value, prefix, leftJustify, minWidth, zeroPad);
            case 'e':
            case 'E':
            case 'f': // Should handle locales (as per setlocale)
            case 'F':
            case 'g':
            case 'G':
                number = +value;
                prefix = number < 0 ? '-' : positivePrefix;
                method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
                textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
                value = prefix + Math.abs(number)[method](precision);
                return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
            default:
                return substring;
        }
    };

    return format.replace(regex, doFormat);
}

var op=['+','-','*','/','%'];
function wrapModifier(idx,item,arr){
    var exprString=[item];
    var swap=item;
    for(var i=idx+1;i<arr.length;i++){
        if(arr[i]=='|'){
            //送下一位和下两位的数据
            if(arr[i+1]=='default'){
                //对default要单独处理，有时default传入的参数前提前可能就会报错
                swap='((typeof({_value_})==="undefined"|| {_value_}===null)?{_replace_}:{_value_})'.replace(/\{_value_\}/ig,exprString[exprString.length-1]);
                swap=swap.replace('{_replace_}',_attr(i + 1));
            }else{
                swap = '$util.' + arr[i+1] + '(' + exprString[exprString.length-1] + _attr(i + 1,true) + ')';
            }
            exprString.pop();
            exprString.push(swap);
        }
        else {
            break;
        }
    }

    arr.idx=i;
    function _attr(start,isParams) {
        //没有更多的参数，直接返回
        if (arr[start+1]!=':') {
            i++;
            return '';
        }
        var _attri = [];

        for (var k = start+1; k < arr.length; k++) {
            if (arr[k]==':') {
                _attri.push(arr[k+1]);
                k=k+1;
            } else {
                break;
            }
        }
        i=k-1;
        //如果是有属性的在前面补一个逗号
        if (isParams && _attri.length != 0) {
            _attri.unshift('');
        }
        return _attri.join(',');
    }
    return exprString.join('');
}

function findArray(item,arr,start){
    start=start||0;
    for(var i =start;i<arr.length;i++){
        if(arr[i]==item){
            arr.idx=i;
            return arr.slice(start,i).join(' ');
        }
    }
    arr.idx=arr.length;
    return arr.slice(start).join(' ');
}
var nc = typeof exports !== 'undefined' ? exports : {};
var fs, path, filter, util;
if (env == 'node') {
    fs = require('./file'), path = require('path');
    filter = require('./pages'), util = require('./util');
}

var ObjProto = Object.prototype;
var toString = ObjProto.toString;
var reMarker = function () {
    this._tokens = [];
    this._included = [];
    this._basePath = '';
    this._vars = {};
};
reMarker.prototype.startTag = '{';
reMarker.prototype.endTag = '}';
reMarker.prototype.setBasePath = function (basePath) {
    this._basePath = basePath;
    return this;
}
reMarker.prototype.setIncluded = function (val) {
    this._included.push(val);
    return this;
}
reMarker.prototype.getIncluded = function () {
    return this._included;
}
reMarker.prototype.parse = function (templ) {
    var TAG_REGEX = escapeRegExp(this.startTag) + '(?:\\s*)((?:[\\\/\\$"\\\'])*[\\w\\*"\\\']+)(?:\\s*)(.*?)(?:\\1*)(?:\\s*)' + escapeRegExp(this.endTag);
    var matchRegexp = new RegExp(TAG_REGEX, 'gim');
    var _nodeToken = [],
        _matched, _lastIndex = 0;
    while (_matched = matchRegexp.exec(templ)) {
        if (_lastIndex != _matched.index) {
            _nodeToken.push({
                type: 'text',
                value: templ.substring(_lastIndex, _matched.index),
                matched: templ.substring(_lastIndex, _matched.index),
                index: _lastIndex
            });
        }
        _nodeToken.push({
            type: 'expression',
            expr: _matched[1],
            value: _matched[2],
            matched: _matched[0],
            index: _matched.index
        });
        _lastIndex = _matched.index + _matched[0].length;
    }
    //得到所有的token
    _nodeToken.push({
        type: 'text',
        value: templ.substring(_lastIndex),
        matched: templ.substring(_lastIndex),
        index: _lastIndex
    });
    this.parser = new Parser(_nodeToken, this._vars);
    return this.parser.parse(this);
};
reMarker.prototype.proc = function (templ, data) {
    var that = this,
        _complied, content;
    try {
        this._vars = data;
        content = this.parse(templ);
        _complied = new Function('$data', '$util', content + ';return _out.join("");');
    } catch (ex) {
        throw new Error('模板解析出错' + ex.message);
    }
    if (!data) {
        return function ($data) {
            var $util = $smarty;
            return _complied($data, $util);
        };
    }
    //todo:以后要删除这段，这段方式没有{script}好
    var _html = _complied.call(this, data, $smarty);
    /*var _temp='';
     for(var i=0;i<this._included.length;i++){
     var _path=path.dirname(this._included[i]);
     _path=_path.replace(this._basePath,'/');
     var _fileName=path.join(_path,'index.js');
     _temp += '<script src="'+util.formatUrlSplit(_fileName)+'"></script>\r\n';
     }
     if(_html.match(/<\/body>([\s|\S]*?)<\/html>/i)){
     _html=_html.replace(/(<\/body>([\s|\S]*?)<\/html>)/ig,_temp+'$1');
     }else{
     _html+=_temp;
     }*/
    return _html;
}
var $smarty = {
    'date_format': function (value, format, default_date) {
        if (!value && !default_date) {
            return 'date_format语法错误';
        }
        var t = (value || default_date);
        if (typeof t !== "number") {
            t = strtotime(t);
        }
        var result = strftime(new Date(t), (format || '%Y/%m/%d'));
        return result;
    },
    'truncate': function (s, length, etc, breakWords, middle) {
        length = length ? length : 80;
        etc = (etc != null) ? etc : '...';

        if (s.length <= length) {
            return s;
        }

        length -= Math.min(length, etc.length);
        if (middle) {
            //one of floor()'s should be replaced with ceil() but it so in Smarty
            return s.slice(0, Math.floor(length / 2)) + etc + s.slice(s.length - Math.floor(length / 2));
        }

        if (!breakWords) {
            s = s.slice(0, length + 1).replace(/\s+?(\S+)?$/, '');
        }

        return s.slice(0, length) + etc;
    },
    'default': function (value, default_value) {
        return value || default_value || '';
    },
    'spacify': function (s, space) {
        if (!space) {
            space = ' ';
        }
        return s.replace(/(\n|.)(?!$)/g, '$1' + space);
    },
    'nl2br': function (s) {
        return s.replace(/\n/g, '<br />\n');
    },
    'capitalize': function (s, withDigits) {
        var re = new RegExp(withDigits ? '[\\W\\d]+' : '\\W+');
        var found = null;
        var res = '';
        for (found = s.match(re); found; found = s.match(re)) {
            var word = s.slice(0, found.index);
            if (word.match(/\d/)) {
                res += word;
            }
            else {
                res += word.charAt(0).toUpperCase() + word.slice(1);
            }
            res += s.slice(found.index, found.index + found[0].length);
            s = s.slice(found.index + found[0].length);
        }
        if (s.match(/\d/)) {
            return res + s;
        }
        return res + s.charAt(0).toUpperCase() + s.slice(1);
    },
    'upper': function (s) {
        return s.toUpperCase();
    },
    'wordwrap': function (s, width, wrapWith, breakWords) {
        width = width || 80;
        wrapWith = wrapWith || '\n';

        var lines = s.split('\n');
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            var parts = ''
            while (line.length > width) {
                var pos = 0;
                var found = line.slice(pos).match(/\s+/);
                for (; found && (pos + found.index) <= width; found = line.slice(pos).match(/\s+/)) {
                    pos += found.index + found[0].length;
                }
                pos = pos || (breakWords ? width : (found ? found.index + found[0].length : line.length));
                parts += line.slice(0, pos).replace(/\s+$/, '');// + wrapWith;
                if (pos < line.length) {
                    parts += wrapWith;
                }
                line = line.slice(pos);
            }
            lines[i] = parts + line;
        }
        return lines.join('\n');
    },
    'cat': function (s, value) {
        value = value ? value : '';
        return s + value;
    },
    'count_paragraphs': function (s) {
        var found = s.match(/\n+/g);
        if (found) {
            return found.length + 1;
        }
        return 1;
    },
    'strlen': function (s) {
        return s.length;
    },
    'count_sentences': function (s) {
        var found = s.match(/[^\s]\.(?!\w)/g);
        if (found) {
            return found.length;
        }
        return 0;
    },
    'lower': function (s) {
        return s.toLowerCase();
    },
    'count_words': function (s) {
        var found = s.match(/\w+/g);
        if (found) {
            return found.length;
        }
        return 0;
    },
    'indent': function (s, repeat, indentWith) {
        repeat = repeat ? repeat : 4;
        indentWith = indentWith ? indentWith : ' ';

        var indentStr = '';
        while (repeat--) {
            indentStr += indentWith;
        }

        var tail = s.match(/\n+$/);
        return indentStr + s.replace(/\n+$/, '').replace(/\n/g, '\n' + indentStr) + (tail ? tail[0] : '');
    },
    'replace': function (s, search, replaceWith) {
        if (!search) {
            return s;
        }
        s = new String(s);
        search = new String(search);
        replaceWith = new String(replaceWith);
        var res = '';
        var pos = -1;
        for (pos = s.indexOf(search); pos >= 0; pos = s.indexOf(search)) {
            res += s.slice(0, pos) + replaceWith;
            pos += search.length;
            s = s.slice(pos);
        }
        return res + s;
    },
    'regex_replace': function (s, re, replaceWith) {
        var pattern = re.match(/^ *\/(.*)\/(.*) *$/);
        return (new String(s)).replace(new RegExp(pattern[1], 'g' + (pattern.length > 1 ? pattern[2] : '')), replaceWith);
    },
    'noprint': function (s) {
        return '';
    },
    'strip': function (s, replaceWith) {
        replaceWith = replaceWith ? replaceWith : ' ';
        return (new String(s)).replace(/[\s]+/g, replaceWith);
    },
    'strip_tags': function (s, addSpace) {
        addSpace = (addSpace == null) ? true : addSpace;
        return (new String(s)).replace(/<[^>]*?>/g, addSpace ? ' ' : '');
    },
    'string_format': function (s, fmt) {
        return sprintf(fmt, s);
    },
    'escape': function (s, esc_type, char_set, double_encode) {
        s = new String(s);
        esc_type = esc_type || 'html';
        char_set = char_set || 'UTF-8';
        double_encode = (typeof double_encode != 'undefined') ? Boolean(double_encode) : true;

        switch (esc_type) {
            case 'html':
                if (double_encode) {
                    s = s.replace(/&/g, '&amp;');
                }
                return s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#039;').replace(/"/g, '&quot;');
            case 'url':
                return rawurlencode(s);
            case 'urlpathinfo':
                return rawurlencode(s).replace(/%2F/g, '/');
            case 'quotes':
                return s.replace(/(^|[^\\])'/g, "$1\\'");

            case 'javascript':
                return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/<\//g, '<\/');
        }
        ;
        return s;
    },
    'fsize_format': function (size, format, precision) {
        // Defaults
        format = format || '';
        precision = precision || 2;
        // Sizes
        var sizes = {
            'TB': 1099511627776,
            'GB': 1073741824,
            'MB': 1048576,
            'KB': 1024,
            'B': 1
        };
        // Get "human" filesize
        var result = '';
        for (var s in sizes) {
            if (size > sizes[s] || s == this.upper(format)) {
                result = number_format(size / sizes[s], precision) + ' ' + s;
                break;
            }
        }
        return result;
    }
};
$smarty.expr = function (variable, localVar) {
    var _var = new TextReader(variable);
    var words = _var.read();
    if (words.length < 1) {
        return variable;
    }

    //var exprString= words[0];
    var value='';
    words.idx=0;
    for(;words.idx<words.length;){
        if(words[words.idx+1]=='|'){
            value+=wrapModifier(words.idx,words[words.idx],words);
        }else{
            value+=words[words.idx];
            words.idx++;
        }
    }
    return value;
}
$smarty.value = function (variable) {
    //variable=$smarty.expr(variable);
    if (toString.call(variable) === '[object Object]' || toString.call(variable) === '[object Array]') {
        return JSON.stringify(variable);
    } else {
        return variable;
    }
}
nc.reMarker = reMarker;

var TextReader = function (inChars) {
    this.inChars = inChars || '';
    this.words = [];
}
TextReader.prototype = {
    start: 0,
    end: 0,
    VAR_REGEXP: /[\w\-]/i,

    read: function () {
        var l = this.inChars.length, cs = 0;
        for (; this.start <= l;) {
            var c = this.inChars.charAt(this.start);
            cs++;
            if (cs > 100) {
                console.log('%s,%d', this.inChars, this.start);
                break;
            }
            switch (c) {
                // 过滤空白字符
                case '\t':
                case '\r':
                case ' ':
                    this.start++;
                    break;
                case '$':
                    // 识别变量表达式
                    this.start = this.findVariable(this.start + 1, this.words);
                    continue;
                // 识别符号
                case 'A':
                case 'B':
                case 'C':
                case 'D':
                case 'E':
                case 'F':
                case 'G':
                case 'H':
                case 'I':
                case 'J':
                case 'K':
                case 'L':
                case 'M':
                case 'N':
                case 'O':
                case 'P':
                case 'Q':
                case 'R':
                case 'S':
                case 'T':
                case 'U':
                case 'V':
                case 'W':
                case 'X':
                case 'Y':
                case 'Z':
                case 'a':
                case 'b':
                case 'c':
                case 'd':
                case 'e':
                case 'f':
                case 'g':
                case 'h':
                case 'i':
                case 'j':
                case 'k':
                case 'l':
                case 'm':
                case 'n':
                case 'o':
                case 'p':
                case 'q':
                case 'r':
                case 's':
                case 't':
                case 'u':
                case 'v':
                case 'w':
                case 'x':
                case 'y':
                case 'z':
                case '_':
                case '@':
                    this.start = this.findIdentifier(this.start, this.words);
                    continue;
                // 识别符号
                case '!':
                case '=':
                case '>':
                case '<':
                case '|':
                case '&':
                    // 识别符号
                    this.start = this.findOperation(this.start + 1, c, this.words);
                    continue;
                case '"':
                case '\'':
                    this.start = this.findString(this.start + 1, this.words);
                    continue;
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    this.start = this.findNumber(this.start, this.words);
                    continue;
                case '+':
                case '-':
                case '*':
                case '/':
                case '%':
                case '(':
                case ')':
                    this.start++;
                    this.words.push(c);
                    break;
                case ':':
                    this.start++;
                    this.words.push(':');
                    continue;
                default:
                    this.start++
                    continue;
            }
            //break;

        }
        console && console.log(this.inChars);
        console && console.log(JSON.stringify(this.words));
        return this.words;
    },
    skip: function (l) {

    },
    checkVariable: function (char) {
        return char.match(this.VAR_REGEXP);
    },
    checkModifier: function (char) {
        return char != ':';
    },
    findNumber: function (idx, container) {
        var l = this.inChars.length;
        var _string = '';
        for (var i = idx; i < l; i++) {
            var char = this.inChars.charAt(i);
            if ((_string.length > 0 && char === '.') || parseInt(char) == char) {
                _string += char;
            } else {
                break;
            }
        }
        //console.log('idx' + idx);
        //console.log(i);
        container && (container.push(_string));
        return i;
    },
    findIdentifier: function (idx, container) {
        var l = this.inChars.length;
        var _string = '';
        for (var i = idx; i < l; i++) {
            var char = this.inChars.charAt(i);
            if (this.checkVariable(char)) {
                _string += char;
            } else {
                break;
            }
        }
        container && (container.push(_string));
        return i;
    },
    findVariable: function (idx, container) {
        var l = this.inChars.length;
        var _string = '';
        for (var i = idx; i < l; i++) {
            var char = this.inChars.charAt(i);
            if (this.checkVariable(char)) {
                _string += char;
            } else if (char == '.') {
                var _i = this.findIdentifier(i + 1);
                //后面不接任何属性
                if (_i == (i + 1)) {
                    throw new Error('属性写法不正确:' + this.inChars);
                }
                _string += this.inChars.substring(i, _i);
                //findX方法都会返回下一个索引位置，这里需要再回滚,因为for循环会再加+
                i = _i - 1;
            } else if (char == '[') {
                //['asdfasdf']
                var _content = this.inChars.substring(i);//'asdfasdf']
                _content = _content.substring(1, _content.indexOf(']'));//'asdfasdf'
                if (!_content) {
                    throw new Error('属性写法不正确:' + this.inChars);
                }
                var _tr = new TextReader(_content);
                var _split = _tr.read();
                //var _i=this.findString(i+1);
                //后面不接任何属性
                if (_split.length == 0) {
                    throw new Error('属性写法不正确:' + this.inChars);
                }
                _string += this.inChars.substr(i, _content.length + 2);
                //索引加字符长度减1
                i = i + _content.length + 1;
            }
            else {
                //i++;
                break;
            }
        }
        container && (container.push(_string));
        return i;
    },
    findString: function (idx, container) {
        var l = this.inChars.length;
        var _string = '';
        for (var i = idx; i < l; i++) {
            var char = this.inChars.charAt(i);
            if (char != '\'' && char != '"') {
                _string += char;
            } else if (char == '\\' && (this.inChars.charAt(i + 1) == '\'' || this.inChars.charAt(i + 1) == '"')) {
                _string += '\\\'';
                i++;
            } else {
                //已经结束字符表达示,把最后一个符号的位置补上
                i++;
                break;
            }
        }
        container && (container.push('\'' + _string + '\''));
        return i;
    },
    findOperation: function (idx, op, container) {
        var l = this.inChars.length;
        for (var i = idx; i < l; i++) {
            var char = this.inChars.charAt(i);
            if (char == '=' || char == '|' || char == '&') {
                op += char;
                i++;//要break出去了
                if (this.inChars.charAt(i) == '=') {
                    op += char;
                    i++;
                }
                break;
            } else {
                //i--;
                break;

            }
        }

        container && container.push(op);

        //console.log(i);
        return i;
    }
}
//var ATTRI_REGEX = /(?:[\s]*(?:([^=\s]+?)=)?((?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|[^\s'"]+)+))+?/ig;
var ATTRI_REGEX = /(?:[\s]*(?:([^=\s]+?)\s*=\s*)?(?:(?:"([^"\\]*)"|'([^'\\]*)'|([^\s'"]+)+)))+?/ig;
/**
 * 取到模板文件并渲染mock数据
 * @param url
 * @returns {string}
 */
function fetch(url, basePath, preparedData) {
    var data, _html = '';
    data = fs.getContentText(url);
    var TEMPLATE_REGEX = /<!--\s*template\s*-->([\s|\S]*?)<!--\s*\/template\s*-->/ig;
    var match = data.match(TEMPLATE_REGEX);
    while (match = TEMPLATE_REGEX.exec(data)) {
        _html += match[1];
    }
    var _html = filter.HTMLFilter(_html, url, basePath, preparedData);
    return _html;
}

function Parser(tokens, vars) {
    this._tokens = tokens;
    this._output = '';
    this._vars = vars || {};
}

Parser.openEachTag = 0;
Parser.openLiteralTag = 0;
Parser.prototype.parse = function(reMarker) {
    var _matched;
    this._reMarker = reMarker || {};
    //with($data){
    this._output = 'var _out=[];with($data){';
    for (var i = 0; i < this._tokens.length; i++) {
        var token = this._tokens[i];
        //防止literal中止
        if (token.expr == '/literal') {
            this.functions[token.expr].call(this, attributes, this.getAttributes(attributes));
            continue;
        }
        if (token.type == 'text' || Parser.openLiteralTag > 0) {
            this._output += "_out.push('" + removeUnsafe(token.matched) + "');\r\n";
            continue;
        }

        var expr = token.expr;
        expr = expr == 'elseif' ? 'if' : expr;
        var attributes = token.value;
        //表达示
        if (this.functions[expr]) {
            this._output += this.functions[expr].call(this, token.matched, this.getAttributes(attributes));
        } else {
            //变量或非正常表达式
            var _expr=token.matched.substring(this._reMarker.startTag.length,token.matched.length-this._reMarker.endTag.length);
            this._output += "_out.push($util.value(" + $smarty.expr(_expr,Parser.openEachTag) + "));\r\n";
        }
    }

    this._output += '};'
    return this._output;
}
Parser.prototype.getAttributes = function(attributes) {
    if (!attributes) {
        return [];
    }
    var _var = new TextReader(attributes);
    var words = _var.read();
    return words;
}

Parser.prototype.needSkip = function(param) {
    var result = false;
    switch (param) {
        case '':
        case 'index':
        case 'input':
        case '__proto__':
            // For some reason, Chrome is the only browser which adds these
            result = true;
            break;
    }
    return result;
}

Parser.prototype.functions = {
    //注释
    '*': function(content, attribute) {
        return ''; //'<!--' + content + '-->';
    },
    '/foreach': function(content, attribute) {
        var _temp = [];

        _temp.push('}/*for end*/}/*if end*/');
        _temp.push('}();');
        Parser.openEachTag--;
        return _temp.join('\r\n');
    },
    'include': function(content, attributes) {
        if(!attributes || attributes.length<3){
            return 'include语法错误' + content;
        }
        var var_assign,attrs={},key,value;
        attributes.idx=0;
        for(;attributes.idx<attributes.length;){
            key=removeQuote(attributes[attributes.idx]);
            value=wrapModifier(attributes.idx+2,attributes[attributes.idx+2],attributes);
            attrs[key]=value;
            if(key!='file'){
                var_assign=key;
            }
        }
        if (env != 'node') {
            return '_out.push("include语法不被支持");';
        }
        if(!attrs.file){
            return 'include语法错误' + content;
        }
        var url = path.normalize(path.join(this._reMarker._basePath,removeQuote(attrs.file) ));
        var content = fetch(url, this._reMarker._basePath, attrs);
        //记录当前被调用的文件以备以后自动加载
        this._reMarker.setIncluded(url);
        if (var_assign) {
            this._vars[var_assign] = content;
            return 'var ' + var_assign + '=\'' + removeUnsafe(content) + '\';';
        } else {
            return '_out.push(\'' + removeUnsafe(content) + '\');';
        }

        //return new reMarker().setIncluded(true).parse(content);
        //var template_id = attributes['file'].indexOf('.smarty') != -1 ? (attributes['file'].substring(0, attributes['file'].lastIndexOf('.'))) : attributes['file'];
        //return '_out.push(\'<script type="text/javascript" src="' + template_id + '.js"><\/scr' + 'ipt>\');';
    },
    //赋值
    assign: function(content, attributes) {
        if(!attributes || attributes.length<3){
            return 'assign语法错误' + content;
        }
        var attrArr=[];
        attributes.idx=0;
        for(;attributes.idx<attributes.length;){
            attrArr.push(wrapModifier(attributes.idx,attributes[attributes.idx],attributes));
        }
        var attrs={},key,value;
        attrArr.idx=0;
        for(;attrArr.idx<attrArr.length;){
            key=attrArr[attrArr.idx];
            if(key=='var'){
                value=findArray('value',attrArr,attrArr.idx+2);

            }
            if(key=='value'){
                value=findArray('var',attrArr,attrArr.idx+2);
            }
            attrs[key]=value;
        }
        var value = attrs['value'];
        var key =removeQuote(attrs['var']) ;
        this._vars[key] = value;
        //要做成转换语句了
        return 'var ' + key + '=' +value + ';';
    },
    //
    'foreachelse': function(content, attr) {
        return '}}else{{';
    },
    //循环
    foreach: function(content, attributes) { // Sections
        var var_assign,attrs={},key,value;
        attributes.idx=0;
        for(;attributes.idx<attributes.length;){
            key=attributes[attributes.idx];
            value=wrapModifier(attributes.idx+2,attributes[attributes.idx+2],attributes);
            attrs[key]=value;
        }
        var from = attrs.from;
        var item = attrs.item;
        if (!from && !item) {
            return 'assign语法错误' + content;
        }

        var key = attrs.key || 'k' + Math.round(Math.random() * 10000);
        var name = attrs.name || 'n'+Math.round(Math.random() * 10000);
        name=removeQuote(name);
        key=removeQuote(key);
        from=removeQuote(from);
        item=removeQuote(item);

        var _temp = [];
        var _from=$smarty.expr(from);
        //TODO foreach.show没有实现
        _temp.push('~function(){');
        _temp.push('if(typeof({$var})!="undefined" && Object.prototype.toString.call({$var})==="[object Array]" && {$var}.length>0){ '.replace(/\{\$var\}/ig,_from));
        _temp.push('var iter=0;var length = 0;for (var k in ' + _from + ') {++length;}');
        _temp.push('for (var i in ' + _from + ') {');
        _temp.push('var smarty={};smarty.foreach={};');
        _temp.push('smarty.foreach["' + name + '"] ={};');
        _temp.push('smarty.foreach["' + name + '"].index= iter;');
        _temp.push('smarty.foreach["' + name + '"].iteration= iter+1;');
        _temp.push('smarty.foreach["' + name + '"].first= iter==0;');
        _temp.push('smarty.foreach["' + name + '"].last= iter==length-1;');
        _temp.push('smarty.foreach["' + name + '"].total= length;');
        _temp.push('var ' + item + '= ' + _from + '[i];');
        key && _temp.push(key + '= i;');
        _temp.push('iter++;');
        Parser.openEachTag++;
        return _temp.join('\r\n');
    },
    "/if": function(content, attributes) {
        return '};';
    },
    "else": function(content, attributes) {
        return '}else{';
    },
    "if": function(content, attributes) {
        var statements = '';
        var values = [];

        var attribute, statement, is, left, middle, right;
        var reset = function() {
            statement = '';
            is = false;
            left = '';
            middle = '';
            right = '== 0';
        };
        var add = function() {
            statement = is ? '(' + statement + left + ') ' + middle + right : statement;
            statements += statement;
        };

        reset();
        var attrs=[];
        attributes.idx=0;
        for(;attributes.idx<attributes.length;){
            attrs.push(wrapModifier(attributes.idx,attributes[attributes.idx],attributes));
        }
        for (var i in attrs) {
            if (this.needSkip(i)) continue;
            attribute = attrs[i];
            if (this.needSkip(attribute)) continue;
            switch (attribute) {
                case 'is':
                    is = true;
                    break;
                case 'not':
                    right = right === '== 0' ? '!= 0' : '== 0';
                    break;
                case 'div':
                    break;
                case 'even':
                    middle = '% 2 ';
                    break;
                case 'odd':
                    right = right === '== 0' ? '!= 0' : '== 0';
                    middle = '% 2 ';
                    break;
                case 'by':
                    left = left + ' / ';
                    break;
                case '||':
                case '&&':
                    add();
                    statements += attribute + ' ';
                    reset();
                    break;
                default:
                    if (typeof this.operators[attribute] !== 'undefined') {
                        statement += this.operators[attribute] + ' ';
                    } else {
                        if (is) {
                            left += attribute + ' ';
                        } else {
                            statement += attribute + ' ';
                        }
                    }
                    break;
            }
        }
        add();
        var _temp = 'if(' + statements + '){';
        if (content.match(/\{elseif\s+[^\}]*\}/i)) {
            _temp = '}else if(' + statements + '){'
        }
        return _temp;
    },
    //字面常量
    literal: function(content, attributes) {
        Parser.openLiteralTag++;
        return '';
    },
    //字面常量
    '/literal': function(content, attributes) {
        Parser.openLiteralTag--;
        return '';
    }
}
Parser.prototype.buildTagMatch = function(regexp, ruler) {
    var r = '';
    if (regexp instanceof RegExp) {
        regexp.global && (r += 'g');
        regexp.ignoreCase && (r += 'i');
        regexp.multiline && (r += 'm');
        regexp = regexp.source;
    }
    r = r || ruler || '';
    return new RegExp(escapeRegExp(this._reMarker.startTag) + escapeRegExp(regexp) + escapeRegExp(this._reMarker.endTag), r);
}
Parser.prototype.operators = {
    "eq": '==',
    "ne": '!=',
    "neq": '!=',
    "gt": '>',
    "lt": '<',
    "ge": '>=',
    "gte": '>=',
    "le": '<=',
    "lte": '<=',
    // not:        '!',
    "and": '&&',
    "or": '||',
    "mod": '%',

    '==': '==',
    '===': '===',
    '!=': '!=',
    '>': '>',
    '<': '<',
    '>=': '>=',
    '<=': '<=',
    '!': '!',
    '%': '%',

    '(': '(',
    ')': ')',

    '0': 0,
    'false': false,

    'null': null,
    'undefined': null
};
});
//如果内嵌入web页面,则自动将模板导出为JS变量
(function(factory) {
    if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
        var target = module['exports'] || exports;
        factory(target);
    } else if (typeof define === 'function' && define['amd']) {
        define(['exports'], factory);
    } else {
        var scriptTags = document.getElementsByTagName('script'),
            templates = [];
        for (var i = 0; i < scriptTags.length; i++) {
            if (scriptTags[i].getAttribute('type') == 'remark-template') {
                templates.push(scriptTags[i]);
            }
        }
        for (var t = 0; t < templates.length; t++) {
            var _id = '__' + templates[t].id + '__';
            window[_id] = new window.NC.reMarker().proc(templates[t].innerHTML);
        }
    }
})(function(exports) {});