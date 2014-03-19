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

function phpToJSVar(v, needRemove) {
    return v.replace(/\$(([a-zA-Z_][a-zA-Z0-9_]*))(\.\[)*/ig, function($0, $1) {
        return $1;
    })
}

/**
 * 实现PHP strftime
 * @param format 日期格式化
 * @returns {string} 格式化后的日期
 */
var strftime = (function() {
    function strftime(date, format) {
        return (format + "").replace(/%([a-zA-Z ])/g,
            function(m, f) {
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
        d: function(date) {
            return zeroPad(date.getDate());
        },

        m: function(date) {
            return zeroPad(date.getMonth() + 1);
        },

        y: function(date) {
            return date.getYear() % 100;
        },

        Y: function(date) {
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
        toFixedFix = function(n, prec) {
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
var nc = typeof exports !== 'undefined' ? exports : {};
var fs, path, filter, util;
if (env == 'node') {
    fs = require('./file.js'), path = require('path');
    filter = require('./pages.js'), util = require('./util.js');
}

var ObjProto = Object.prototype;
var toString = ObjProto.toString;
var reMarker = function() {
    this._tokens = [];
    this._included = [];
    this._basePath = '';
    this._vars = {};
};
reMarker.prototype.startTag = '{';
reMarker.prototype.endTag = '}';
reMarker.prototype.setBasePath = function(basePath) {
    this._basePath = basePath;
    return this;
}
reMarker.prototype.setIncluded = function(val) {
    this._included.push(val);
    return this;
}
reMarker.prototype.getIncluded = function() {
    return this._included;
}
reMarker.prototype.parse = function(templ) {
    var TAG_REGEX = escapeRegExp(this.startTag) + '(?:\\s*)((?:[\\\/\\$])*[\\w\\*]+)(?:\\s*)(.*?)(?:\\1*)(?:\\s*)' + escapeRegExp(this.endTag);
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
}
reMarker.prototype.proc = function(templ, data) {
    var that = this,
        _complied;
    try {
        this._vars = data;
        var content = this.parse(templ);
        _complied = new Function('$data', '$util', content + ';return _out.join("");');
    } catch (ex) {
        throw new Error('模板解析出错' + ex.message);
    }
    if (!data) {
        return function($data) {
            var $util = that;
            return _complied($data, $util);
        };
    }
    //todo:以后要删除这段，这段方式没有{script}好
    var _html = _complied.call(this, data, this);
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
reMarker.prototype.value = function(variable) {
    if (toString.call(variable) === '[object Object]' || toString.call(variable) === '[object Array]') {
        return JSON.stringify(variable);
    } else {
        return variable;
    }
}
nc.reMarker = reMarker;
var VAR_REGEX = /\$(([a-zA-Z_][a-zA-Z0-9_]*)(\.[a-zA-Z_][a-zA-Z0-9_]*)*(\[[^\]]+\]*)*)/ig;
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
            this._output += "_out.push($util.value(" + phpToJSVar(expr + token.value, Parser.openEachTag) + "));\r\n";
        }
    }

    this._output += '};'
    return this._output;
}
Parser.prototype.getAttributes = function(attributes) {
    if (!attributes) {
        return [];
    }
    var _matched, _i = 0;
    var attributes_new = {};
    while (_matched = ATTRI_REGEX.exec((' ' + attributes))) {
        var key;
        var value;
        if (typeof _matched[1] === 'undefined') {
            key = _i;
            value = _matched[0].replace(/^\s+|\s+$/g, '');
            _i++;
        } else {
            key = _matched[1];
            value = _matched[2] || _matched[3] || _matched[4];
        }
        attributes_new[key] = value;
    }

    attributes = attributes_new;
    return attributes;
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
Parser.prototype.modifiers = {
    'date_format': function(value, format, default_date) {
        if (!value && !default_date) {
            return 'date_format语法错误';
        }
        var t = (value || default_date);
        if (typeof t !== "number") {
            t = strtotime(t, time());
        }
        var result = strftime((format || '%b %e %Y'), t);
        return result;
    },
    'default': function(value, default_value) {
        return value || default_value;
    },
    'fsize_format': function(size, format, precision) {
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
            if (size > sizes[s] || s == strtoupper(format)) {
                result = number_format(size / sizes[s], precision) + ' ' + s;
                break;
            }
        }
        return result;
    }
};
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
        if (attributes['file'] == undefined) {
            return 'include语法错误' + content;
        }
        if (env == 'node') {
            return 'include语法不被支持';
        }
        var var_file, var_assign;
        for (var arg_name in attributes) {
            var arg_value = attributes[arg_name];
            if (arg_name == 'file') {
                var_file = arg_value;
                delete attributes[arg_name];
                continue;
            }
            if (arg_name == 'assign') {
                var_assign = arg_value;
                continue;
            }
            if (arg_value.indexOf('$') == 0) {
                var nativeKey = phpToJSVar(arg_value, Parser.openEachTag);
                //todo:simon 这块有bug
                attributes[arg_name] = eval('this._vars.' + nativeKey);
            }
        }
        var url = path.normalize(path.join(this._reMarker._basePath, var_file));
        var content = fetch(url, this._reMarker._basePath, attributes);
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
    assign: function(content, attr) {
        if (typeof attr['var'] === 'undefined' || typeof attr['value'] === 'undefined') {
            return 'assign语法错误' + content;
        }
        var value = attr['value'];
        if (value === '[]') { // Make an object
            value = {};
        }
        var key = attr['var'].replace(/'|"/ig, '');
        this._vars[key] = value;
        //要做成转换语句了
        return 'var ' + key + '="' + phpToJSVar(attr.value, Parser.openEachTag) + '";';
    },
    //
    'foreachelse': function(content, attr) {
        return '}}else{{';
    },
    //循环
    foreach: function(content, attributes) { // Sections
        var from = attributes.from;
        var item = attributes.item;
        if (!from && !item) {
            return 'assign语法错误' + content;
        }

        var key = attributes.key || 'k' + Math.round(Math.random() * 10000);
        var name = attributes.name || Math.round(Math.random() * 10000);

        var _temp = [];
        //TODO foreach.show没有实现
        _temp.push('~function(){');
        _temp.push('if(Object.prototype.toString.call({$var})==="[object Array]" && {$var}.length>0){ '.replace(/\{\$var\}/ig,phpToJSVar(from, Parser.openEachTag)));
        _temp.push('var iter=0;var length = 0;for (var k in ' + phpToJSVar(from, Parser.openEachTag) + ') {++length;}');
        _temp.push('for (var i in ' + phpToJSVar(from, Parser.openEachTag) + ') {');
        _temp.push('var smarty={};smarty.foreach={};');
        _temp.push('smarty.foreach["' + name + '"] ={};');
        _temp.push('smarty.foreach["' + name + '"].index= iter;');
        _temp.push('smarty.foreach["' + name + '"].iteration= iter+1;');
        _temp.push('smarty.foreach["' + name + '"].first= iter==0;');
        _temp.push('smarty.foreach["' + name + '"].last= iter==length-1;');
        _temp.push('smarty.foreach["' + name + '"].total= length;');
        _temp.push('var ' + item + '= ' + phpToJSVar(from, Parser.openEachTag) + '[i];');
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

        for (i in attributes) {
            if (this.needSkip(i)) continue;
            attribute = attributes[i];
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
                            statement += phpToJSVar(attribute, Parser.openEachTag) + ' ';
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